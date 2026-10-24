import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatasetStore } from "../server/store.mjs";
import {
  isAllowedOfficialUrl,
  extractOfficialDocument,
  fetchOfficialHtml,
  createScrapeDraft,
} from "../server/scraper.mjs";
import { importReviewedEvidence } from "../server/import.mjs";

const url = "https://senado.pr.gov/documentos/energia?id=42";
const html =
  "<html><head><title>Portal Senado</title></head><body><nav>Navegación</nav><main><h1>Documento público</h1><p>Texto original de una comunicación pública.</p><p>Se debe revisar la atribución y el contexto.</p><script>secret tracking</script><div hidden>Contenido oculto</div></main><footer>Pie del portal</footer></body></html>";
async function fixture(t) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "voto-scraper-"));
  await mkdir(path.join(rootDir, "data"));
  const dataset = {
    people: [{ id: "person-1", name: "Persona existente" }],
    evidence: [],
    sources: [],
    lastUpdated: "2026-10-24T00:00:00Z",
  };
  await writeFile(
    path.join(rootDir, "data", "seed.json"),
    JSON.stringify(dataset),
  );
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  return { store: new DatasetStore({ rootDir }), rootDir, dataset };
}

test("official scraper accepts exact known PR publisher hosts and rejects ambiguous/private URLs", () => {
  for (const accepted of [
    url,
    "https://www.camara.pr.gov/",
    "https://www.fortaleza.pr.gov/",
    "https://sutra.oslpr.org/osl/",
    "https://elecciones2024.ceepur.org/",
    "https://ww2.ceepur.org/",
  ])
    assert.equal(isAllowedOfficialUrl(accepted), true, accepted);
  for (const rejected of [
    "http://senado.pr.gov/",
    "https://senado.pr.gov:443/",
    "https://user:pass@senado.pr.gov/",
    "https://senado.pr.gov.evil.test/",
    "https://127.0.0.1/",
    "https://localhost/",
    "https://10.0.0.1/",
    "https://169.254.169.254/",
    "https://foo.ceepur.org/",
    "https://%73enado.pr.gov/",
    "https://senado.pr.gov\\@evil.test/",
    "https://senado.pr.gov/a\nb",
    "https://example.org/",
  ])
    assert.equal(isAllowedOfficialUrl(rejected), false, rejected);
});

test("document parser extracts readable original text without navigation, executable or hidden content", () => {
  const document = extractOfficialDocument(html);
  assert.equal(document.title, "Documento público");
  assert.match(document.text, /Texto original/);
  assert.match(document.text, /atribución/);
  assert.doesNotMatch(
    document.text,
    /Navegación|tracking|oculto|Pie del portal/,
  );
  assert.equal(
    extractOfficialDocument(
      html.replace("<main>", "<main><h1 hidden>Hidden headline</h1>"),
    ).title,
    "Documento público",
  );
  const tableDocument = extractOfficialDocument(
    "<main>Attribution before paragraphs<p>Recorded session</p><table><tr><th>Persona</th><th>Registro</th></tr><tr><td>Ana</td><td>No consta</td></tr></table></main>",
  );
  assert.match(tableDocument.text, /Attribution before paragraphs/);
  assert.match(tableDocument.text, /No consta/);
  assert.throws(
    () =>
      extractOfficialDocument(
        "<html><script>only executable content</script></html>",
      ),
    /text|texto/i,
  );
});

test("official fetch refuses HTTP errors, non-HTML content and oversized bodies and prohibits redirects", async () => {
  let options;
  assert.equal(
    await fetchOfficialHtml(url, {
      request: async (_url, requestOptions) => {
        options = requestOptions;
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    }),
    html,
  );
  assert.equal(options.redirect, "error");
  assert.ok(options.signal);
  await assert.rejects(
    fetchOfficialHtml(url, {
      request: async () => new Response("blocked", { status: 403 }),
    }),
    /403/,
  );
  await assert.rejects(
    fetchOfficialHtml(url, {
      request: async () =>
        new Response("PDF", { headers: { "content-type": "application/pdf" } }),
    }),
    /HTML/,
  );
  await assert.rejects(
    fetchOfficialHtml(url, {
      maxBytes: 10,
      request: async () =>
        new Response(html, { headers: { "content-type": "text/html" } }),
    }),
    /limit/i,
  );
});

test("scraping creates an unpublished review draft and never mutates public evidence", async (t) => {
  const { store, rootDir, dataset } = await fixture(t);
  const result = await createScrapeDraft(
    store,
    { url, personId: "person-1", type: "vote", issue: "energy" },
    { fetchHtml: async () => html, now: "2026-10-24T01:00:00Z" },
  );
  const draft = JSON.parse(await readFile(result.filename, "utf8"));
  assert.equal(draft.status, "unreviewed");
  assert.equal(draft.verification, "unreviewed");
  assert.equal(draft.requestedType, "vote");
  assert.equal(draft.type, undefined);
  assert.equal(draft.stance, "not_recorded");
  assert.equal(draft.date, null);
  assert.equal(draft.personId, "person-1");
  assert.equal(draft.sourceUrl, url);
  assert.match(draft.originalText, /Texto original/);
  assert.deepEqual(await store.read(), dataset);
  await assert.rejects(
    readFile(path.join(rootDir, ".local", "database.json")),
    { code: "ENOENT" },
  );
  await assert.rejects(importReviewedEvidence(store, [draft]));
  assert.equal(
    (await readdir(path.join(rootDir, ".local", "drafts"))).length,
    1,
  );
});

test("scraper validates person and arguments before fetching and creates no draft after fetch failure", async (t) => {
  const { store, rootDir } = await fixture(t);
  let requests = 0;
  for (const patch of [
    { personId: "unknown" },
    { type: "rumor" },
    { issue: "" },
    { url: "https://evil.test/" },
  ])
    await assert.rejects(
      createScrapeDraft(
        store,
        {
          url,
          personId: "person-1",
          type: "statement",
          issue: "energy",
          ...patch,
        },
        {
          fetchHtml: async () => {
            requests++;
            return html;
          },
        },
      ),
    );
  assert.equal(requests, 0);
  await assert.rejects(
    createScrapeDraft(
      store,
      { url, personId: "person-1", type: "statement", issue: "energy" },
      {
        fetchHtml: async () => {
          throw new Error("HTTP 403");
        },
      },
    ),
    /403/,
  );
  await assert.rejects(readdir(path.join(rootDir, ".local", "drafts")), {
    code: "ENOENT",
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import {
  isAllowedRegistryUrl,
  validateEvidence,
} from "../server/validation.mjs";
import { DatasetStore, recoverDatabaseLock } from "../server/store.mjs";
import {
  mapRegistryPerson,
  synchronize,
  fetchRegistryText,
} from "../server/roster.mjs";
import { exportCsv } from "../server/csv.mjs";
import { importReviewedEvidence } from "../server/import.mjs";
import { createApp } from "../server/app.mjs";

const registryUrl =
  "https://raw.githubusercontent.com/openstates/people/main/data/pr/legislature/Ana-Test-123.yml";
const person = {
  id: "ocd-person/test",
  name: "Ana Pérez",
  kind: "official",
  party: "PNP",
  office: "Senado",
  municipality: "Puerto Rico",
  district: "1",
  chamber: "senate",
  status: "current",
  electionYear: null,
  photoUrl: null,
  officialUrl: "https://senado.pr.gov/",
  sourceIds: ["openstates-pr"],
  updatedAt: "2026-10-24T00:00:00Z",
  biography: "",
  tags: [],
};
const evidence = {
  id: "review-1",
  personId: person.id,
  type: "statement",
  title: "Declaración documentada",
  summary: "Texto atribuido a la persona.",
  issue: "energy",
  date: "2026-10-01",
  sourceUrl: "https://senado.pr.gov/documento",
  sourceLabel: "Senado de Puerto Rico",
  stance: "not_recorded",
  verification: "reviewed",
  context: "Documento revisado manualmente.",
};
const seed = {
  people: [person],
  evidence: [evidence],
  sources: [
    {
      id: "openstates-pr",
      name: "Open States",
      url: "https://github.com/openstates/people",
      kind: "registry",
      status: "snapshot",
      lastFetched: "2026-10-20T00:00:00Z",
      description: "Registro secundario.",
    },
  ],
  lastUpdated: "2026-10-20T00:00:00Z",
};
const yaml = `id: ocd-person/test\nname: Ana Pérez\nroles:\n  - type: upper\n    jurisdiction: ocd-jurisdiction/country:us/territory:pr/government\n    district: '1'\n    start_date: '2025-01-02'\nparty:\n  - name: New Progressive Party\nlinks:\n  - url: https://senado.pr.gov/\n`;
async function fixture(t) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "voto-backend-"));
  await mkdir(path.join(rootDir, "data"));
  await writeFile(
    path.join(rootDir, "data", "seed.json"),
    JSON.stringify(seed),
  );
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  return { rootDir, store: new DatasetStore({ rootDir }) };
}

test("registry allowlist accepts only direct Open States PR YAML URLs", () => {
  assert.equal(isAllowedRegistryUrl(registryUrl), true);
  for (const url of [
    registryUrl.replace("https:", "http:"),
    registryUrl + "?x=1",
    registryUrl + "#x",
    registryUrl.replace(
      "raw.githubusercontent.com",
      "raw.githubusercontent.com.evil.test",
    ),
    registryUrl.replace("/pr/", "/ny/"),
    registryUrl.replace("/pr/legislature/", "/pr/legislature/../"),
    registryUrl.replace("/pr/legislature/", "/pr/legislature/%2e%2e/"),
    registryUrl.replace("https://", "https://user:pass@"),
    registryUrl.replace(".yml", ".json"),
    registryUrl.replace(
      "raw.githubusercontent.com",
      "raw.githubusercontent.com:443",
    ),
  ])
    assert.equal(isAllowedRegistryUrl(url), false, url);
});

test("reviewed evidence validates person, HTTPS attribution, enums and real dates", () => {
  assert.equal(
    validateEvidence(evidence, new Set([person.id])).stance,
    "not_recorded",
  );
  for (const patch of [
    { personId: "unknown" },
    { sourceUrl: "http://example.org" },
    { sourceUrl: "https://user:pass@example.org" },
    { sourceUrl: "https://exam\nple.org/document" },
    { date: "2026-02-30" },
    { date: "tomorrow" },
    { type: "rumor" },
    { stance: "inferred" },
    { title: "" },
    { verification: "automatic" },
  ])
    assert.throws(() =>
      validateEvidence({ ...evidence, ...patch }, new Set([person.id])),
    );
  assert.equal(
    validateEvidence({ ...evidence, date: null }, new Set([person.id])).date,
    null,
  );
});

test("registry mapping only includes current PR roles and stable party/chamber values", () => {
  const profile = {
    id: person.id,
    name: "Ana Pérez",
    roles: [
      {
        type: "upper",
        jurisdiction: "ocd-jurisdiction/country:us/territory:pr/government",
        district: "1",
        start_date: "2025-01-02",
      },
    ],
    party: [{ name: "New Progressive Party" }],
    links: [{ url: "https://senado.pr.gov/" }],
  };
  const mapped = mapRegistryPerson(profile, {
    now: "2026-10-24T00:00:00Z",
    sourceId: "openstates-pr",
  });
  assert.equal(mapped.party, "PNP");
  assert.equal(mapped.chamber, "senate");
  assert.equal(mapped.kind, "official");
  assert.equal(
    mapRegistryPerson(
      { ...profile, roles: [{ ...profile.roles[0], end_date: "2025-01-01" }] },
      { now: "2026-10-24T00:00:00Z" },
    ),
    null,
  );
  assert.equal(
    mapRegistryPerson(
      {
        ...profile,
        roles: [
          {
            ...profile.roles[0],
            jurisdiction: "ocd-jurisdiction/country:us/state:ny/government",
          },
        ],
      },
      { now: "2026-10-24T00:00:00Z" },
    ),
    null,
  );
  assert.equal(
    mapRegistryPerson(
      {
        ...profile,
        roles: [{ ...profile.roles[0], start_date: "2027-01-01" }],
      },
      { now: "2026-10-24T00:00:00Z" },
    ),
    null,
  );
  assert.equal(
    mapRegistryPerson(
      { ...profile, roles: [{ ...profile.roles[0], type: "__proto__" }] },
      { now: "2026-10-24T00:00:00Z" },
    ),
    null,
  );
});

test("CSV quotes values and neutralizes spreadsheet formulas including leading whitespace", () => {
  const csv = exportCsv({
    ...seed,
    people: [
      {
        ...person,
        name: '  =HYPERLINK("x")',
        party: "@evil",
        district: "\t+1",
      },
    ],
  });
  assert.match(csv, /"'  =HYPERLINK\(""x""\)"/);
  assert.match(csv, /"'@evil"/);
  assert.match(csv, /"'\t\+1"/);
  assert.match(csv, /https:\/\/senado.pr.gov\/documento/);
  assert.match(csv, /not_recorded/);
});

test("missing local database reads seed without overwriting it", async (t) => {
  const { store, rootDir } = await fixture(t);
  assert.deepEqual(await store.read(), seed);
  await assert.rejects(
    readFile(path.join(rootDir, ".local", "database.json")),
    { code: "ENOENT" },
  );
});

test("malformed existing database is not silently overwritten", async (t) => {
  const { store, rootDir } = await fixture(t);
  await mkdir(path.join(rootDir, ".local"));
  await writeFile(path.join(rootDir, ".local", "database.json"), "{broken");
  await assert.rejects(
    store.update((data) => data),
    /database|base de datos/i,
  );
  assert.equal(
    await readFile(path.join(rootDir, ".local", "database.json"), "utf8"),
    "{broken",
  );
});

test("lock recovery refuses active updates and removes a verified abandoned lock", async (t) => {
  const { store, rootDir } = await fixture(t);
  await mkdir(path.join(rootDir, ".local"));
  const filename = path.join(rootDir, ".local", "database.lock");
  await writeFile(
    filename,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
  );
  await assert.rejects(recoverDatabaseLock(store), /active|running/i);
  await writeFile(
    filename,
    JSON.stringify({ pid: 2147483647, startedAt: new Date().toISOString() }),
  );
  assert.equal(await recoverDatabaseLock(store), true);
  assert.equal(await recoverDatabaseLock(store), false);
  await store.update((current) => current);
});

test("reviewed evidence import is all-or-nothing and preserves unknown stance", async (t) => {
  const { store } = await fixture(t);
  const next = { ...evidence, id: "review-2", stance: "not_recorded" };
  const result = await importReviewedEvidence(store, { evidence: [next] });
  assert.equal(result.imported, 1);
  assert.equal((await store.read()).evidence[1].stance, "not_recorded");
  await assert.rejects(
    importReviewedEvidence(store, [
      { ...next, id: "review-3" },
      { ...next, personId: "invalid" },
    ]),
  );
  assert.equal((await store.read()).evidence.length, 2);
  await assert.rejects(
    importReviewedEvidence(store, [{ ...next, verification: "source_linked" }]),
  );
});

test("failed refresh preserves people, evidence and last successful timestamp with visible failure", async (t) => {
  const { store } = await fixture(t);
  const result = await synchronize(store, {
    catalog: [{ url: registryUrl }],
    fetchText: async () => {
      throw new Error("HTTP 403");
    },
    now: "2026-10-24T00:00:00Z",
  });
  assert.equal(result.sync.ok, false);
  assert.deepEqual(result.people, seed.people);
  assert.deepEqual(result.evidence, seed.evidence);
  assert.equal(result.lastUpdated, seed.lastUpdated);
  assert.equal(result.sources[0].status, "error");
  assert.match(result.sources[0].error, /403/);
});

test("successful refresh retains reviewed evidence and updates the sourced roster", async (t) => {
  const { store } = await fixture(t);
  const result = await synchronize(store, {
    catalog: [{ url: registryUrl }],
    fetchText: async () => yaml,
    now: "2026-10-24T00:00:00Z",
  });
  assert.equal(result.sync.ok, true);
  assert.deepEqual(result.evidence, seed.evidence);
  assert.equal(result.people[0].name, "Ana Pérez");
  assert.equal(result.lastUpdated, "2026-10-24T00:00:00Z");
});

test("refresh caps concurrent fetches at four and retains past profiles with their evidence", async (t) => {
  const { store } = await fixture(t);
  let running = 0;
  let maximum = 0;
  const catalog = Array.from({ length: 7 }, (_, index) => ({
    url: registryUrl.replace("Ana-Test-123", `Person-${index}`),
  }));
  const result = await synchronize(store, {
    catalog,
    fetchText: async (url) => {
      running++;
      maximum = Math.max(maximum, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return yaml.replace(
        "ocd-person/test",
        `ocd-person/${url.match(/Person-(\d+)/)[1]}`,
      );
    },
  });
  assert.equal(maximum, 4);
  assert.equal(result.sync.ok, true);
  assert.equal(
    result.people.find((entry) => entry.id === person.id).status,
    "historical",
  );
  assert.deepEqual(result.evidence, seed.evidence);
});

test("partial refresh failure keeps the complete prior snapshot", async (t) => {
  const { store } = await fixture(t);
  const result = await synchronize(store, {
    catalog: [
      { url: registryUrl },
      { url: registryUrl.replace("Ana-Test-123", "Other-456") },
    ],
    fetchText: async (url) => {
      if (url.includes("Other")) throw new Error("unavailable");
      return yaml;
    },
  });
  assert.equal(result.sync.ok, false);
  assert.deepEqual(result.people, seed.people);
  assert.deepEqual(result.evidence, seed.evidence);
});

test("successful refresh with all terms ended marks previous registry officials historical", async (t) => {
  const { store } = await fixture(t);
  const expired = yaml.replace(
    "    start_date: '2025-01-02'",
    "    start_date: '2025-01-02'\n    end_date: '2026-01-01'",
  );
  const result = await synchronize(store, {
    catalog: [{ url: registryUrl }],
    fetchText: async () => expired,
    now: "2026-10-24T00:00:00Z",
  });
  assert.equal(result.sync.ok, true);
  assert.equal(
    result.people.filter((person) => person.status === "current").length,
    0,
  );
  assert.equal(result.people[0].status, "historical");
  assert.deepEqual(result.evidence, seed.evidence);
  assert.equal(result.lastUpdated, "2026-10-24T00:00:00Z");
  assert.equal(result.sources[0].status, "live");
});

test("empty or malformed registry roles are schema errors and preserve the current snapshot", async (t) => {
  const { store } = await fixture(t);
  for (const roles of [
    [],
    [{}],
    [
      {
        type: "upper",
        jurisdiction: "ocd-jurisdiction/country:us/territory:pr/government",
        end_date: "2026-02-30",
      },
    ],
  ]) {
    const result = await synchronize(store, {
      catalog: [{ url: registryUrl }],
      fetchText: async () =>
        JSON.stringify({ id: person.id, name: person.name, roles }),
      now: "2026-10-24T00:00:00Z",
    });
    assert.equal(result.sync.ok, false);
    assert.deepEqual(result.people, seed.people);
    assert.deepEqual(result.evidence, seed.evidence);
    assert.equal(result.lastUpdated, seed.lastUpdated);
  }
});

test("source fetch rejects redirects and oversized streaming bodies without disabling TLS", async () => {
  let requestOptions;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(12));
      controller.close();
    },
  });
  await assert.rejects(
    fetchRegistryText(registryUrl, {
      maxBytes: 10,
      request: async (_url, options) => {
        requestOptions = options;
        return new Response(body);
      },
    }),
    /limit|grande|size/i,
  );
  assert.equal(requestOptions.redirect, "error");
  await assert.rejects(
    fetchRegistryText("https://example.org/"),
    /allow|permit/i,
  );
  const failedResponse = new Response("Denied", { status: 403 });
  await assert.rejects(
    fetchRegistryText(registryUrl, { request: async () => failedResponse }),
    /403/,
  );
  assert.equal(failedResponse.bodyUsed, true);
});

test("sync validates catalog before making network requests", async (t) => {
  const { store } = await fixture(t);
  let calls = 0;
  await assert.rejects(
    synchronize(store, {
      catalog: [{ url: "http://localhost/private" }],
      fetchText: async () => {
        calls++;
        return yaml;
      },
    }),
    /allow|permit/i,
  );
  assert.equal(calls, 0);
  assert.deepEqual(await store.read(), seed);
});

test("API serves data, health and filtered CSV; rejects foreign sync origins", async (t) => {
  const { store } = await fixture(t);
  let syncCalls = 0;
  const app = createApp({
    store,
    synchronize: async () => {
      syncCalls++;
      return { ...seed, sync: { ok: true, message: "ok" } };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + "/api/health")).status, 200);
  assert.deepEqual(await (await fetch(base + "/api/data")).json(), seed);
  const csv = await fetch(base + "/api/export.csv?id=absent");
  assert.equal(csv.status, 200);
  assert.equal((await csv.text()).trim().split("\n").length, 1);
  assert.equal(
    (
      await fetch(base + "/api/sync", {
        method: "POST",
        headers: { origin: "https://evil.test" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/sync", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
      })
    ).status,
    403,
  );
  const rebindingStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(
      base + "/api/sync",
      {
        method: "POST",
        headers: { host: "evil.test", origin: "http://evil.test" },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(rebindingStatus, 403);
  assert.equal(syncCalls, 0);
  assert.equal(
    (
      await fetch(base + "/api/sync", {
        method: "POST",
        headers: { origin: base },
      })
    ).status,
    200,
  );
  assert.equal(syncCalls, 1);
  assert.equal((await fetch(base + "/api/no-such-route")).status, 404);
});

test("API returns refresh failure body and accepts only configured deployment origins", async (t) => {
  const { store } = await fixture(t);
  const app = createApp({
    store,
    allowedOrigins: ["https://votoclaro.example"],
    synchronize: async () => ({
      ...seed,
      sync: { ok: false, message: "Source unavailable; prior copy preserved." },
    }),
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const result = await new Promise((resolve, reject) => {
    const request = httpRequest(
      base + "/api/sync",
      {
        method: "POST",
        headers: {
          host: "votoclaro.example",
          origin: "https://votoclaro.example",
        },
      },
      (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () =>
          resolve({ status: response.statusCode, body: JSON.parse(text) }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(result.status, 502);
  assert.equal(result.body.sync.ok, false);
  assert.deepEqual(result.body.evidence, seed.evidence);
});

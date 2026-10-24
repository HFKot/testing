import { fetch, EnvHttpProxyAgent } from "undici";
import { load } from "cheerio";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const proxyAgent = new EnvHttpProxyAgent();
const officialHosts = new Map([
  ["senado.pr.gov", "Senado de Puerto Rico"],
  ["www.senado.pr.gov", "Senado de Puerto Rico"],
  ["camara.pr.gov", "Cámara de Representantes de Puerto Rico"],
  ["www.camara.pr.gov", "Cámara de Representantes de Puerto Rico"],
  ["fortaleza.pr.gov", "La Fortaleza"],
  ["www.fortaleza.pr.gov", "La Fortaleza"],
  ["sutra.oslpr.org", "SUTRA — Oficina de Servicios Legislativos"],
  ["ceepur.org", "Comisión Estatal de Elecciones"],
  ["www.ceepur.org", "Comisión Estatal de Elecciones"],
  ["ww2.ceepur.org", "Comisión Estatal de Elecciones"],
  [
    "elecciones2024.ceepur.org",
    "CEE — Elecciones generales 2024 (archivo histórico)",
  ],
]);

export function isAllowedOfficialUrl(value) {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    /[\u0000-\u0020\u007f\\]/u.test(value)
  )
    return false;
  // Check the original authority before URL parsing can normalize escapes or ports.
  const match = /^https:\/\/([A-Za-z0-9.-]+)(?:\/[^#]*)?$/.exec(value);
  if (!match || !officialHosts.has(match[1].toLowerCase())) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      !parsed.port &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash &&
      officialHosts.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export async function fetchOfficialHtml(
  url,
  { request = fetch, maxBytes = 2 * 1024 * 1024, timeoutMs = 20000 } = {},
) {
  if (!isAllowedOfficialUrl(url))
    throw new Error("Official source URL is not allowlisted.");
  const response = await request(url, {
    dispatcher: proxyAgent,
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: "text/html, application/xhtml+xml",
      "user-agent": "VotoClaro/0.1 (public document review draft)",
    },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      `Official source returned HTTP ${response.status}; no draft was published.`,
    );
  }
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (!["text/html", "application/xhtml+xml"].includes(contentType)) {
    await response.body?.cancel();
    throw new Error(
      "The official source did not return HTML. PDF and JavaScript-only pages require manual review.",
    );
  }
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw new Error("Official source exceeds the response size limit.");
  }
  if (!response.body) throw new Error("Official source returned no HTML body.");
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes)
        throw new Error("Official source exceeds the response size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Buffer.concat(chunks),
  );
}

const readable = (value) => value.replace(/\s+/gu, " ").trim();

export function extractOfficialDocument(html) {
  if (
    typeof html !== "string" ||
    Buffer.byteLength(html, "utf8") > 2 * 1024 * 1024
  )
    throw new Error("HTML document exceeds the size limit.");
  const $ = load(html);
  $(
    'script, style, noscript, svg, canvas, iframe, nav, header, footer, form, button, input, [hidden], [aria-hidden="true"]',
  ).remove();
  const title = readable(
    $("main h1, article h1").first().text() ||
      $("h1").first().text() ||
      $("title").first().text() ||
      "Documento de la fuente oficial",
  ).slice(0, 300);
  const content = $("article").first().length
    ? $("article").first()
    : $("main").first().length
      ? $("main").first()
      : $("body");
  content.find("br").replaceWith("\n");
  content.find("td, th").append(" | ");
  content
    .find("h1, h2, h3, h4, h5, h6, p, li, blockquote, tr, div, section")
    .append("\n\n");
  const text = content
    .text()
    .split(/\n+/u)
    .map(readable)
    .filter(Boolean)
    .join("\n\n");
  if (!text)
    throw new Error(
      "No readable text was found; review the original source manually.",
    );
  return { title, text: text.slice(0, 50000), truncated: text.length > 50000 };
}

export async function createScrapeDraft(
  store,
  { url, personId, type, issue },
  { fetchHtml = fetchOfficialHtml, now = new Date().toISOString() } = {},
) {
  if (!isAllowedOfficialUrl(url))
    throw new Error("Official source URL is not allowlisted.");
  if (!["statement", "vote", "action"].includes(type))
    throw new Error("Requested type must be statement, vote, or action.");
  if (typeof issue !== "string" || !/^[a-z][a-z0-9_-]{0,79}$/.test(issue))
    throw new Error(
      "Issue must be a nonempty lowercase topic identifier, for example energy.",
    );
  const dataset = await store.read();
  if (!dataset.people.some((person) => person.id === personId))
    throw new Error("The person must already exist in the local dataset.");
  const document = extractOfficialDocument(await fetchHtml(url));
  const id = `draft-${randomUUID()}`;
  const draft = {
    id,
    status: "unreviewed",
    verification: "unreviewed",
    personId,
    requestedType: type,
    issue,
    sourceUrl: url,
    sourceLabel: officialHosts.get(new URL(url).hostname),
    retrievedAt: now,
    extractedTitle: document.title,
    originalText: document.text,
    textTruncated: document.truncated,
    date: null,
    stance: "not_recorded",
    reviewInstructions:
      "Unreviewed source text. Verify identity, attribution, publication date and context in the original document. A requested vote/action type does not establish that this person voted or acted. Create a reviewed Evidence record before import; do not infer a position from missing information.",
  };
  const directory = path.join(store.directory, "drafts");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, `${id}.json`);
  const temporary = path.join(directory, `${id}.tmp`);
  try {
    const output = await open(temporary, "wx", 0o600);
    try {
      await output.writeFile(JSON.stringify(draft, null, 2) + "\n");
      await output.sync();
    } finally {
      await output.close();
    }
    await rename(temporary, filename);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT")
        console.error("Unable to remove a draft temporary file.");
    });
  }
  return { filename, draft };
}

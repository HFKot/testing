import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetch, EnvHttpProxyAgent } from "undici";
import { parse } from "yaml";
import { isAllowedRegistryUrl, isDate, isHttpsUrl } from "./validation.mjs";

const proxyAgent = new EnvHttpProxyAgent();
const PR_JURISDICTION = "ocd-jurisdiction/country:us/territory:pr/government";
const offices = {
  upper: ["senate", "Senado de Puerto Rico"],
  lower: ["house", "Cámara de Representantes de Puerto Rico"],
  governor: ["executive", "Gobernación de Puerto Rico"],
};
const parties = new Map([
  ["new progressive party", "PNP"],
  ["partido nuevo progresista", "PNP"],
  ["pnp", "PNP"],
  ["popular democratic party", "PPD"],
  ["partido popular democratico", "PPD"],
  ["ppd", "PPD"],
  ["puerto rican independence party", "PIP"],
  ["partido independentista puertorriqueno", "PIP"],
  ["pip", "PIP"],
  ["citizens' victory movement", "MVC"],
  ["citizen's victory movement", "MVC"],
  ["citizens victory movement", "MVC"],
  ["movimiento victoria ciudadana", "MVC"],
  ["mvc", "MVC"],
  ["dignity project", "PD"],
  ["proyecto dignidad", "PD"],
  ["pd", "PD"],
  ["independent", "IND"],
  ["independiente", "IND"],
  ["ind", "IND"],
]);
const normalized = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export async function fetchRegistryText(
  url,
  { maxBytes = 2 * 1024 * 1024, timeoutMs = 20000, request = fetch } = {},
) {
  if (!isAllowedRegistryUrl(url))
    throw new Error("Registry URL is not allowlisted.");
  const response = await request(url, {
    dispatcher: proxyAgent,
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: "text/plain",
      "user-agent": "VotoClaro/0.1 (public civic registry refresh)",
    },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Source returned HTTP ${response.status}.`);
  }
  const length = response.headers.get("content-length");
  if (length && Number(length) > maxBytes) {
    await response.body?.cancel();
    throw new Error("Source exceeds the response size limit.");
  }
  if (!response.body) throw new Error("Source returned an empty response.");
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes)
        throw new Error("Source exceeds the response size limit.");
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

function active(dated, today) {
  if (
    dated.start_date &&
    (!isDate(dated.start_date) || dated.start_date > today)
  )
    return false;
  if (dated.end_date && (!isDate(dated.end_date) || dated.end_date < today))
    return false;
  return true;
}

export function mapRegistryPerson(
  record,
  {
    now = new Date().toISOString(),
    sourceId = "openstates-pr",
    sourceUrl = "https://github.com/openstates/people/tree/main/data/pr",
  } = {},
) {
  if (
    !record ||
    typeof record.id !== "string" ||
    !/^ocd-person\/[a-zA-Z0-9-]+$/.test(record.id) ||
    typeof record.name !== "string" ||
    !record.name.trim() ||
    !Array.isArray(record.roles) ||
    record.roles.length === 0
  )
    throw new Error("Registry profile has an invalid identity or roles.");
  for (const role of record.roles) {
    if (
      !role ||
      typeof role !== "object" ||
      Array.isArray(role) ||
      typeof role.type !== "string" ||
      !role.type.trim() ||
      typeof role.jurisdiction !== "string" ||
      !role.jurisdiction.startsWith("ocd-jurisdiction/")
    )
      throw new Error("Registry profile has an invalid role schema.");
    for (const field of ["start_date", "end_date"])
      if (
        role[field] !== undefined &&
        role[field] !== null &&
        role[field] !== "" &&
        !isDate(role[field])
      )
        throw new Error("Registry role contains an invalid term date.");
  }
  const today = now.slice(0, 10);
  const role = record.roles.find(
    (role) =>
      role &&
      Object.hasOwn(offices, role.type) &&
      role.jurisdiction === PR_JURISDICTION &&
      active(role, today),
  );
  if (!role) return null;
  const [chamber, office] = offices[role.type];
  const party = Array.isArray(record.party)
    ? record.party.find(
        (party) =>
          party && typeof party.name === "string" && active(party, today),
      )?.name
    : undefined;
  const links = Array.isArray(record.links) ? record.links : [];
  const officialUrl =
    links.find((link) => isHttpsUrl(link?.url))?.url ?? sourceUrl;
  return {
    id: record.id,
    name: record.name.trim(),
    kind: "official",
    party: party ? (parties.get(normalized(party)) ?? party) : "No registrado",
    office,
    municipality: "Puerto Rico",
    district:
      role.district === undefined || role.district === null
        ? null
        : String(role.district),
    chamber,
    status: "current",
    electionYear: null,
    photoUrl: isHttpsUrl(record.image) ? record.image : null,
    officialUrl,
    sourceIds: [sourceId],
    updatedAt: now,
    biography:
      "Perfil del registro secundario Open States. Consulte la fuente original para verificar los datos y la vigencia del cargo.",
    tags: [],
  };
}

async function concurrentMap(entries, worker, limit = 4) {
  const results = new Array(entries.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, entries.length) }, async () => {
      while (next < entries.length) {
        const index = next++;
        try {
          results[index] = { value: await worker(entries[index]) };
        } catch (error) {
          results[index] = { error };
        }
      }
    }),
  );
  return results;
}

function registrySource(dataset) {
  return (
    dataset.sources.find(
      (source) => source.kind === "registry" && /openstates/i.test(source.url),
    ) ?? {
      id: "openstates-pr",
      name: "Open States — Puerto Rico",
      url: "https://github.com/openstates/people/tree/main/data/pr",
      kind: "registry",
      status: "snapshot",
      lastFetched: null,
      description:
        "Registro secundario de perfiles públicos; no certifica candidaturas ni incluye un historial completo de política pública.",
    }
  );
}

function withRegistrySource(dataset, source) {
  return dataset.sources.some((entry) => entry.id === source.id)
    ? dataset.sources.map((entry) => (entry.id === source.id ? source : entry))
    : [...dataset.sources, source];
}

export async function synchronize(
  store,
  {
    catalog,
    fetchText = fetchRegistryText,
    now = new Date().toISOString(),
  } = {},
) {
  const entries =
    catalog ??
    JSON.parse(
      await readFile(path.join(store.rootDir, "data", "catalog.json"), "utf8"),
    );
  if (
    !Array.isArray(entries) ||
    entries.length === 0 ||
    entries.length > 200 ||
    entries.some((entry) => !isAllowedRegistryUrl(entry?.url)) ||
    new Set(entries.map((entry) => entry.url)).size !== entries.length
  )
    throw new Error(
      "The registry catalog must contain unique allowlisted Puerto Rico YAML URLs.",
    );
  return store.update(async (dataset) => {
    const source = registrySource(dataset);
    const results = await concurrentMap(entries, async (entry) => {
      const text = await fetchText(entry.url);
      const profile = parse(text, { maxAliasCount: 10, uniqueKeys: true });
      return mapRegistryPerson(profile, {
        now,
        sourceId: source.id,
        sourceUrl: entry.url,
      });
    });
    const failure = results.find((result) => result.error)?.error;
    const profiles = results
      .filter((result) => result.value)
      .map((result) => result.value);
    const duplicate =
      new Set(profiles.map((profile) => profile.id)).size !== profiles.length;
    if (failure || duplicate) {
      // Keep the last complete snapshot when any source is unavailable or invalid.
      const message = failure
        ? String(failure.message).slice(0, 250)
        : "The registry returned duplicate people.";
      return {
        ...dataset,
        sources: withRegistrySource(dataset, {
          ...source,
          status: "error",
          error: message,
        }),
        sync: {
          ok: false,
          message: `No se actualizó el registro. Se conserva la última copia: ${message}`,
        },
      };
    }
    const ids = new Set(profiles.map((person) => person.id));
    const retained = dataset.people
      .filter((person) => !ids.has(person.id))
      .map((person) =>
        person.kind === "official" && person.sourceIds.includes(source.id)
          ? { ...person, status: "historical" }
          : person,
      );
    const { error: previousError, ...freshSource } = source;
    return {
      ...dataset,
      people: [...profiles, ...retained],
      evidence: dataset.evidence,
      sources: withRegistrySource(dataset, {
        ...freshSource,
        status: "live",
        lastFetched: now,
      }),
      lastUpdated: now,
      sync: {
        ok: true,
        message: `${profiles.length} perfiles vigentes actualizados desde Open States. La evidencia revisada se conserva.`,
      },
    };
  });
}

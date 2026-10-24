import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatasetStore } from "../server/store.mjs";
import { importCandidates, validateCandidate } from "../server/candidates.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const official = {
  id: "official-1",
  name: "Existing Official",
  kind: "official",
  party: "IND",
  office: "Senado",
  municipality: "",
  district: null,
  chamber: "senate",
  status: "current",
  electionYear: null,
  photoUrl: null,
  officialUrl: "https://senado.pr.gov/",
  sourceIds: ["cee2024"],
  updatedAt: "2026-10-24T10:00:00Z",
  biography: "",
  tags: [],
};
const candidate = {
  id: "candidate-2024-test",
  name: "Candidate Test Fixture",
  kind: "candidate",
  party: "IND",
  office: "Alcaldía",
  municipality: "San Juan",
  district: null,
  chamber: "candidate",
  status: "historical",
  electionYear: 2024,
  photoUrl: null,
  officialUrl: "https://elecciones2024.ceepur.org/verified-record",
  sourceIds: ["cee2024"],
  updatedAt: "2026-10-24T10:00:00Z",
  biography: "Fixture used only for import tests.",
  tags: ["2024"],
};
const evidence = {
  id: "evidence-1",
  personId: official.id,
  type: "statement",
  title: "Existing record",
  summary: "Existing attributed summary.",
  issue: "energy",
  date: null,
  sourceUrl: "https://senado.pr.gov/document",
  sourceLabel: "Existing source",
  stance: "not_recorded",
  verification: "reviewed",
  context: "Existing reviewed context.",
};
const seed = {
  people: [official],
  evidence: [evidence],
  sources: [
    {
      id: "cee2024",
      name: "Historical election source",
      url: "https://elecciones2024.ceepur.org/",
      kind: "election",
      status: "not_connected",
      lastFetched: null,
      description: "Existing source retained without changes.",
    },
  ],
  lastUpdated: "2026-10-24T00:00:00Z",
};

async function fixture(t) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "voto-candidates-"));
  await mkdir(path.join(rootDir, "data"));
  await writeFile(
    path.join(rootDir, "data", "seed.json"),
    JSON.stringify(seed),
  );
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  return { rootDir, store: new DatasetStore({ rootDir }) };
}

test("candidate validation preserves explicit historical/current candidacy and accepts known source IDs", () => {
  assert.deepEqual(
    validateCandidate(candidate, new Set(["cee2024"])),
    candidate,
  );
  const current = {
    ...candidate,
    status: "current",
    electionYear: 2028,
    updatedAt: "2026-10-24T06:00:00-04:00",
  };
  assert.equal(
    validateCandidate(current, new Set(["cee2024"])).status,
    "current",
  );
  assert.equal(
    validateCandidate(current, new Set(["cee2024"])).electionYear,
    2028,
  );
  assert.equal(
    validateCandidate(
      {
        ...candidate,
        photoUrl: "https://example.org/photo.jpg",
        municipality: "",
        biography: "",
        district: "1",
      },
      new Set(["cee2024"]),
    ).district,
    "1",
  );
});

test("candidate validation rejects missing, malformed or inferred Person fields", () => {
  const invalid = [
    { id: "" },
    { name: "" },
    { party: " " },
    { office: "" },
    { id: " candidate-1" },
    { kind: "official" },
    { chamber: "house" },
    { status: "future" },
    { status: undefined },
    { electionYear: null },
    { electionYear: 1899 },
    { electionYear: 2101 },
    { electionYear: 2024.5 },
    { electionYear: "2024" },
    { officialUrl: "http://example.org/" },
    { officialUrl: "https://user:password@example.org/" },
    { photoUrl: "javascript:alert(1)" },
    { photoUrl: undefined },
    { sourceIds: [] },
    { sourceIds: ["unknown"] },
    { sourceIds: ["cee2024", "cee2024"] },
    { updatedAt: "2026-02-30T10:00:00Z" },
    { updatedAt: "2026-10-24T24:00:00Z" },
    { updatedAt: "2026-10-24" },
    { updatedAt: "tomorrow" },
    { district: undefined },
    { district: 1 },
    { municipality: null },
    { biography: null },
    { tags: undefined },
    { tags: [""] },
  ];
  for (const patch of invalid)
    assert.throws(
      () => validateCandidate({ ...candidate, ...patch }, new Set(["cee2024"])),
      JSON.stringify(patch),
    );
  assert.throws(() => validateCandidate(null, new Set(["cee2024"])));
  assert.throws(() => validateCandidate([], new Set(["cee2024"])));
});

test("candidate imports add and update candidates while preserving evidence and other dataset data", async (t) => {
  const { store } = await fixture(t);
  const result = await importCandidates(store, { people: [candidate] });
  assert.equal(result.imported, 1);
  assert.deepEqual(result.dataset.people, [official, candidate]);
  assert.deepEqual(result.dataset.evidence, seed.evidence);
  assert.deepEqual(result.dataset.sources, seed.sources);
  assert.equal(result.dataset.lastUpdated, seed.lastUpdated);
  const updated = {
    ...candidate,
    name: "Corrected Candidate Fixture",
    office: "Representante",
    tags: [],
  };
  await importCandidates(store, [updated]);
  assert.deepEqual((await store.read()).people, [official, updated]);
});

test("candidate imports fail atomically for unknown sources, duplicate IDs or official replacement", async (t) => {
  const { store } = await fixture(t);
  await importCandidates(store, [candidate]);
  const before = await store.read();
  for (const input of [
    [
      { ...candidate, id: "valid-new" },
      { ...candidate, id: "invalid-new", sourceIds: ["unknown"] },
    ],
    [candidate, { ...candidate, name: "Duplicate identity" }],
    [{ ...candidate, id: official.id }],
    [],
    {},
    { people: [] },
  ]) {
    await assert.rejects(importCandidates(store, input));
    assert.deepEqual(await store.read(), before);
  }
});

test("candidate CLI imports a reviewed local file and rejects invalid input without changing data", async (t) => {
  const { rootDir } = await fixture(t);
  await mkdir(path.join(rootDir, "server"));
  await mkdir(path.join(rootDir, "scripts"));
  for (const filename of [
    "server/store.mjs",
    "server/validation.mjs",
    "server/candidates.mjs",
    "scripts/import-people.mjs",
  ])
    await copyFile(path.join(root, filename), path.join(rootDir, filename));
  const inputPath = path.join(rootDir, "candidates.json");
  await writeFile(inputPath, JSON.stringify({ people: [candidate] }));
  const cliPath = path.join(rootDir, "scripts", "import-people.mjs");
  const success = spawnSync(process.execPath, [cliPath, "--file", inputPath], {
    encoding: "utf8",
  });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /1.*candidate/i);
  const databasePath = path.join(rootDir, ".local", "database.json");
  const before = await readFile(databasePath, "utf8");
  await writeFile(
    inputPath,
    JSON.stringify([{ ...candidate, id: official.id }]),
  );
  const failed = spawnSync(process.execPath, [cliPath, "--file", inputPath], {
    encoding: "utf8",
  });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /official|candidate/i);
  assert.equal(await readFile(databasePath, "utf8"), before);
  const usage = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /Usage/);
});

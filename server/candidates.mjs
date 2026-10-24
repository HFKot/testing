import { isDate, isHttpsUrl } from "./validation.mjs";

const PERSON_FIELDS = [
  "id",
  "name",
  "kind",
  "party",
  "office",
  "municipality",
  "district",
  "chamber",
  "status",
  "electionYear",
  "photoUrl",
  "officialUrl",
  "sourceIds",
  "updatedAt",
  "biography",
  "tags",
];
const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function text(value, field, { max = 1000, empty = false } = {}) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && (!value.trim() || value.trim() !== value)) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
  )
    throw new Error(`Invalid candidate ${field}.`);
}

export function validateCandidate(value, sourceIds) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Candidate must be an object.");
  for (const field of ["id", "name", "party", "office"])
    text(value[field], field, { max: field === "id" ? 200 : 1000 });
  if (/\s/u.test(value.id))
    throw new Error("Candidate id must not contain whitespace.");
  if (value.kind !== "candidate" || value.chamber !== "candidate")
    throw new Error("Candidate kind and chamber must explicitly be candidate.");
  if (!["current", "historical"].includes(value.status))
    throw new Error(
      "Candidate status must explicitly be current or historical.",
    );
  if (
    !Number.isInteger(value.electionYear) ||
    value.electionYear < 1900 ||
    value.electionYear > 2100
  )
    throw new Error(
      "Candidate electionYear must be an explicit integer between 1900 and 2100.",
    );
  text(value.municipality, "municipality", { empty: true });
  if (value.district !== null)
    text(value.district, "district", { empty: true });
  text(value.biography, "biography", { max: 20000, empty: true });
  if (!isHttpsUrl(value.officialUrl))
    throw new Error(
      "Candidate officialUrl must use HTTPS without credentials.",
    );
  if (value.photoUrl !== null && !isHttpsUrl(value.photoUrl))
    throw new Error(
      "Candidate photoUrl must be null or use HTTPS without credentials.",
    );
  if (
    !Array.isArray(value.sourceIds) ||
    value.sourceIds.length === 0 ||
    value.sourceIds.length > 50 ||
    new Set(value.sourceIds).size !== value.sourceIds.length
  )
    throw new Error(
      "Candidate sourceIds must contain unique existing source IDs.",
    );
  for (const id of value.sourceIds) {
    text(id, "sourceIds", { max: 200 });
    if (!sourceIds.has(id))
      throw new Error("Candidate sourceIds must refer to existing sources.");
  }
  if (
    typeof value.updatedAt !== "string" ||
    !ISO_TIMESTAMP.test(value.updatedAt) ||
    !isDate(value.updatedAt.slice(0, 10)) ||
    !Number.isFinite(Date.parse(value.updatedAt))
  )
    throw new Error(
      "Candidate updatedAt must be a real ISO timestamp with an explicit time zone.",
    );
  if (!Array.isArray(value.tags) || value.tags.length > 50)
    throw new Error("Candidate tags must be an array of at most 50 strings.");
  for (const tag of value.tags) text(tag, "tags", { max: 200 });
  return Object.fromEntries(
    PERSON_FIELDS.map((field) => [
      field,
      Array.isArray(value[field]) ? [...value[field]] : value[field],
    ]),
  );
}

export async function importCandidates(store, input) {
  const entries = Array.isArray(input) ? input : input?.people;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 10000)
    throw new Error(
      "Import must contain 1–10,000 explicitly sourced candidate records.",
    );
  const dataset = await store.update((current) => {
    const sourceIds = new Set(current.sources.map((source) => source.id));
    const seen = new Set();
    const candidates = entries.map((entry) => {
      const person = validateCandidate(entry, sourceIds);
      if (seen.has(person.id))
        throw new Error("Duplicate candidate id in import.");
      seen.add(person.id);
      return person;
    });
    const people = new Map(current.people.map((person) => [person.id, person]));
    for (const candidate of candidates) {
      const existing = people.get(candidate.id);
      if (existing && existing.kind !== "candidate")
        throw new Error(
          "Candidate imports cannot overwrite an existing official.",
        );
      people.set(candidate.id, candidate);
    }
    return { ...current, people: [...people.values()] };
  });
  return { imported: entries.length, dataset };
}

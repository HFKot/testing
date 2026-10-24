const REGISTRY_URL =
  /^https:\/\/raw\.githubusercontent\.com\/openstates\/people\/(?:main|master)\/data\/pr\/(?:legislature|executive)\/[A-Za-z0-9_-]+\.yml$/;

export function isAllowedRegistryUrl(value) {
  return typeof value === "string" && REGISTRY_URL.test(value);
}

export function isHttpsUrl(value) {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    /[\u0000-\u0020\u007f]/u.test(value)
  )
    return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function isDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

function requiredText(value, field, max = 10000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Invalid evidence ${field}.`);
  return value;
}

export function validateEvidence(value, personIds) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Evidence must be an object.");
  for (const key of [
    "id",
    "personId",
    "title",
    "summary",
    "issue",
    "sourceLabel",
    "context",
  ])
    requiredText(
      value[key],
      key,
      key === "summary" || key === "context" ? 20000 : 1000,
    );
  if (!personIds.has(value.personId))
    throw new Error(`Unknown evidence personId: ${value.personId}`);
  if (!["statement", "vote", "action"].includes(value.type))
    throw new Error("Invalid evidence type.");
  if (!["supports", "opposes", "not_recorded"].includes(value.stance))
    throw new Error("Invalid evidence stance; use not_recorded when unknown.");
  if (!["source_linked", "reviewed"].includes(value.verification))
    throw new Error("Invalid evidence verification.");
  if (value.date !== null && !isDate(value.date))
    throw new Error("Evidence date must be a real YYYY-MM-DD date or null.");
  if (!isHttpsUrl(value.sourceUrl))
    throw new Error("Evidence sourceUrl must use HTTPS without credentials.");
  if (
    value.originalText !== undefined &&
    (typeof value.originalText !== "string" ||
      value.originalText.length > 100000)
  )
    throw new Error("Invalid evidence originalText.");
  const result = Object.fromEntries(
    [
      "id",
      "personId",
      "type",
      "title",
      "summary",
      "issue",
      "date",
      "sourceUrl",
      "sourceLabel",
      "stance",
      "verification",
      "context",
    ].map((key) => [key, value[key]]),
  );
  if (value.originalText !== undefined)
    result.originalText = value.originalText;
  return result;
}

export function validateDataset(value) {
  if (
    !value ||
    !Array.isArray(value.people) ||
    !Array.isArray(value.evidence) ||
    !Array.isArray(value.sources) ||
    typeof value.lastUpdated !== "string"
  )
    throw new Error("Invalid database dataset.");
  const ids = new Set();
  for (const person of value.people) {
    if (
      !person ||
      typeof person.id !== "string" ||
      !person.id ||
      typeof person.name !== "string" ||
      !person.name ||
      ids.has(person.id)
    )
      throw new Error("Invalid or duplicate database person.");
    ids.add(person.id);
  }
  const evidenceIds = new Set();
  for (const evidence of value.evidence) {
    validateEvidence(evidence, ids);
    if (evidenceIds.has(evidence.id))
      throw new Error("Duplicate database evidence id.");
    evidenceIds.add(evidence.id);
  }
  return value;
}

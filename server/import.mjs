import { validateEvidence } from "./validation.mjs";

export async function importReviewedEvidence(store, input) {
  const entries = Array.isArray(input) ? input : input?.evidence;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 10000)
    throw new Error("Import must contain 1–10,000 reviewed evidence records.");
  let imported = 0;
  const dataset = await store.update((current) => {
    const personIds = new Set(current.people.map((person) => person.id));
    const seen = new Set();
    const reviewed = entries.map((entry) => {
      const evidence = validateEvidence(entry, personIds);
      if (evidence.verification !== "reviewed")
        throw new Error("Only manually reviewed evidence can be imported.");
      if (seen.has(evidence.id))
        throw new Error(`Duplicate evidence id in import: ${evidence.id}`);
      seen.add(evidence.id);
      return evidence;
    });
    const existing = new Map(
      current.evidence.map((entry) => [entry.id, entry]),
    );
    for (const entry of reviewed) {
      const previous = existing.get(entry.id);
      if (previous && previous.personId !== entry.personId)
        throw new Error(
          `Evidence id already belongs to a different person: ${entry.id}`,
        );
      existing.set(entry.id, entry);
    }
    imported = reviewed.length;
    return { ...current, evidence: [...existing.values()] };
  });
  return { imported, dataset };
}

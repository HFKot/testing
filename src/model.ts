import type { Evidence, Person } from "./types";
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export interface Filters {
  query?: string;
  kind?: string;
  chamber?: string;
  party?: string;
  issue?: string;
  watchlist?: string[];
  onlyFollowed?: boolean;
}
export function filterPeople(
  people: Person[],
  filters: Filters,
  evidence: Evidence[] = [],
): Person[] {
  const query = normalize(filters.query || "");
  return people.filter((person) => {
    const haystack = normalize(
      [
        person.name,
        person.party,
        person.office,
        person.municipality,
        person.district || "",
        ...person.tags,
      ].join(" "),
    );
    return (
      (!query || haystack.includes(query)) &&
      (!filters.kind ||
        filters.kind === "all" ||
        person.kind === filters.kind) &&
      (!filters.chamber ||
        filters.chamber === "all" ||
        person.chamber === filters.chamber) &&
      (!filters.party ||
        filters.party === "all" ||
        person.party === filters.party) &&
      (!filters.onlyFollowed || filters.watchlist?.includes(person.id)) &&
      (!filters.issue ||
        filters.issue === "all" ||
        evidence.some(
          (item) => item.personId === person.id && item.issue === filters.issue,
        ))
    );
  });
}
export function toggleSelection(
  selected: string[],
  id: string,
  max = Number.POSITIVE_INFINITY,
): string[] {
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  return selected.length < max ? [...selected, id] : selected;
}

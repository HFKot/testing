import test from "node:test";
import assert from "node:assert/strict";
import { filterPeople, normalize, toggleSelection } from "../src/model.ts";
const people = [
  {
    id: "1",
    name: "Jenniffer González-Colón",
    party: "PNP",
    kind: "official",
    chamber: "executive",
    municipality: "Puerto Rico",
    office: "Gobernadora",
    district: null,
    status: "current",
    tags: [],
  },
  {
    id: "2",
    name: "José Rodríguez",
    party: "PIP",
    kind: "candidate",
    chamber: "candidate",
    municipality: "San Juan",
    office: "Candidato",
    district: "1",
    status: "historical",
    tags: [],
  },
];
test("accent-insensitive search includes name and municipality", () => {
  assert.equal(normalize("González"), "gonzalez");
  assert.deepEqual(
    filterPeople(people, { query: "gonzalez" }).map((p) => p.id),
    ["1"],
  );
  assert.deepEqual(
    filterPeople(people, { query: "san juan" }).map((p) => p.id),
    ["2"],
  );
});
test("combines kind, chamber, party, watchlist and sourced issue filters", () => {
  assert.deepEqual(
    filterPeople(people, { kind: "candidate", party: "PIP" }).map((p) => p.id),
    ["2"],
  );
  assert.deepEqual(
    filterPeople(people, { watchlist: ["1"], onlyFollowed: true }).map(
      (p) => p.id,
    ),
    ["1"],
  );
  assert.deepEqual(
    filterPeople(people, { issue: "energy" }, []).map((p) => p.id),
    [],
  );
  assert.deepEqual(
    filterPeople(people, { issue: "energy" }, [
      { personId: "1", issue: "energy" },
    ]).map((p) => p.id),
    ["1"],
  );
});
test("comparison has a maximum of three and toggles off existing selections", () => {
  assert.deepEqual(toggleSelection(["1", "2", "3"], "4", 3), ["1", "2", "3"]);
  assert.deepEqual(toggleSelection(["1", "2"], "1", 3), ["2"]);
  assert.deepEqual(toggleSelection([], "1", 3), ["1"]);
});

export type Party = "PNP" | "PPD" | "PIP" | "MVC" | "PD" | "IND" | string;
export interface Person {
  id: string;
  name: string;
  kind: "official" | "candidate";
  party: Party;
  office: string;
  municipality: string;
  district: string | null;
  chamber: "senate" | "house" | "executive" | "federal" | "candidate";
  status: "current" | "historical";
  electionYear: number | null;
  photoUrl: string | null;
  officialUrl: string;
  sourceIds: string[];
  updatedAt: string;
  biography: string;
  tags: string[];
}
export interface Evidence {
  id: string;
  personId: string;
  type: "statement" | "vote" | "action";
  title: string;
  summary: string;
  issue: string;
  date: string | null;
  sourceUrl: string;
  sourceLabel: string;
  originalText?: string;
  stance: "supports" | "opposes" | "not_recorded";
  verification: "source_linked" | "reviewed";
  context: string;
}
export interface Source {
  id: string;
  name: string;
  url: string;
  kind: "registry" | "official" | "election";
  status: "snapshot" | "live" | "blocked" | "error" | "not_connected";
  lastFetched: string | null;
  description: string;
  error?: string;
}
export interface Dataset {
  people: Person[];
  evidence: Evidence[];
  sources: Source[];
  lastUpdated: string;
  sync?: { ok: boolean; message: string };
}

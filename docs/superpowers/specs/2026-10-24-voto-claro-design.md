# Voto Claro — Puerto Rico civic research

Build a nonpartisan browser application for Puerto Rico voters to search officials and historical candidates, follow people, compare public records, and inspect original sources. The user explicitly requested implementation in HFKot/testing and clarified Puerto Rico coverage. Engineering defaults are our choices, open to revision.

Use React + TypeScript + Vite with a Node/Express JSON API and a persisted local JSON database. This is an MVP, not a comprehensive record of every statement or certified ballot list. Spanish is the initial interface; English is available. No political recommendations or inferred integrity scores.

## Approaches
A static directory is quick but cannot refresh records. A commercial API requires credentials and lacks dependable PR vote coverage. Choose a source-backed directory with a real refresh/import pipeline and explicit coverage gaps: it is usable immediately and can grow as official adapters become available.

## Behavior
Search names without accents, parties, offices and districts. Filter current officials versus historical candidates, chamber, party and available evidence. Open a person's source-linked dossier, follow locally, compare up to three people, and export sourced CSV for researchers. Keep past candidacies labeled with election year; do not infer future candidacies.

Every policy statement, legislative vote or executive action requires a source URL, date (or explicit unknown), original text/summary and attribution. Missing evidence is unknown, never opposition or contradiction. No automatic promise/action score. Source snapshots show retrieval date and publisher; registry profiles are secondary data, not official certification.

## Data and ingestion
Seed real public profiles from the Open States people registry for Puerto Rico, retaining official links and attribution. Refresh via allowlisted public HTTPS sources, atomic database writes, size/time limits, no arbitrary URL fetch endpoint. Preserve imported evidence across roster refresh. Official PR pages may be unavailable under current egress; failures must remain visible without deleting the last good snapshot. Support reviewed evidence import via a local file with validation; do not fabricate seed policy claims.

## Presentation and scope
Editorial cream/forest-green dashboard with a navy navigation rail, clear cards, a Puerto Rico map, responsive mobile navigation, keyboard-accessible drawers and bilingual controls. Watchlists persist per browser; JSON data persists under .local. Exports and a read-only API form the research/B2B foundation; billing, hosted accounts, background alerts and deployment are future work.

## Verification
Test accent search, historical candidacy labeling, source validation, safe scraping, refresh preservation and API behavior; run TypeScript/build and browser interaction checks on desktop and mobile. Commit and push the initial project to the requested empty GitHub repository when verified. Reuse the existing isolated checkout.

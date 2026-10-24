# Data maintenance

Run these commands from the repository root with Node 24 or later.

`npm run sync` refreshes only the known Open States Puerto Rico YAML URLs in `data/catalog.json`, with four simultaneous requests, a 20-second timeout, a 2 MB response limit, verified TLS, environment proxy support, and no redirects. It retains the complete previous roster and all evidence if any profile cannot be fetched or parsed. Registry profiles are secondary data; they do not establish policy positions or certify election candidates. Profiles whose current role has ended are retained as historical records.

`node scripts/import.mjs --file reviewed-evidence.json` imports manually reviewed evidence. The file may contain an array or an object with an `evidence` array. Each record needs the following fields:

```json
{
  "id": "a-unique-record-id",
  "personId": "an-existing-person-id-from-api-data",
  "type": "statement",
  "title": "Title attributed to the source",
  "summary": "A factual summary reviewed against the source",
  "issue": "energy",
  "date": null,
  "sourceUrl": "https://publisher.example/original-document",
  "sourceLabel": "Publisher name",
  "originalText": "Optional relevant passage from the original document",
  "stance": "not_recorded",
  "verification": "reviewed",
  "context": "Attribution, limits and relevant context checked by the reviewer"
}
```

Use `statement`, `vote`, or `action` for `type`. Dates must be real `YYYY-MM-DD` dates or `null` when unknown. `stance` must be `supports`, `opposes`, or `not_recorded`; missing information must remain `not_recorded`. Review the original record before describing any vote, action or position. Source URLs must use HTTPS and contain no credentials or whitespace. Imports are all-or-nothing. Reusing an evidence ID updates that record but cannot transfer it to another person. Imports preserve the roster and all other evidence. The example above is a schema illustration, not a policy record.

The first read uses `data/seed.json` when `.local/database.json` does not exist. Mutations use an exclusive process lock and replace the database atomically. An invalid existing database is preserved and reported as an error. Keep a reviewed backup before manually repairing it.

After an interrupted update, `node scripts/recover-lock.mjs` can remove an abandoned lock. It refuses to remove a lock whose recorded process is still running, including when the process ID was reused. Unreadable locks need manual inspection after all writers have stopped. If recovery itself was interrupted, inspect `.local/database.recovery.lock` after stopping all recovery commands before removing it manually. This command never changes the saved database.

The browser refresh endpoint accepts local application origins by default. For a deployed application, set `ALLOWED_ORIGINS=https://your-application.example` (comma-separated for multiple complete origins, with no trailing slash). Its request Host must match the Origin. Preserve Host in a development proxy (`changeOrigin: false`). Read-only data and CSV endpoints remain available. The API does not expose evidence imports or arbitrary URL scraping.

## Candidate imports

`node scripts/import-people.mjs --file reviewed-candidates.json` adds or updates manually verified candidate profiles. Copy `scripts/candidates.example.json` and replace every placeholder using an original candidacy record before importing. The template is deliberately invalid until completed and does not describe a real candidate.

Use `kind: "candidate"` and `chamber: "candidate"`, an explicit `status` (`current` or `historical`), and an integer `electionYear`. Supply every Person field shown in the template. `sourceIds` must refer to known sources already present in `/api/data`; `officialUrl` must be an HTTPS link to the original record. An archived 2024 result belongs to a historical 2024 profile and does not establish a current or future candidacy. The importer preserves the supplied year and status without inferring either. Imports are atomic and cannot overwrite an existing official. Existing evidence and other people are preserved. No candidate profiles are seeded until reviewed source records are available.

## Official document drafts

`node scripts/scrape.mjs --url 'https://www.fortaleza.pr.gov/' --person 'existing-person-id-from-api-data' --type statement --issue energy` retrieves an official HTML page after replacing the person ID with an existing profile ID. The supported request types are `statement`, `vote` and `action`; the requested type is a review aid and never establishes that the person made the statement, cast the vote or performed the action.

The scraper accepts exact hosts for the Senado (`senado.pr.gov`, `www.senado.pr.gov`), Cámara (`camara.pr.gov`, `www.camara.pr.gov`), Fortaleza (`fortaleza.pr.gov`, `www.fortaleza.pr.gov`), SUTRA (`sutra.oslpr.org`), and CEE (`ceepur.org`, `www.ceepur.org`, `ww2.ceepur.org`, `elecciones2024.ceepur.org`). It requires HTTPS and rejects credentials, explicit ports, private hosts, unsupported domains, fragments and redirects. Requests use the environment proxy, verified TLS, a 20-second timeout and a 2 MB limit.

Cheerio extracts the title and readable page text, including tables, while removing scripts, navigation and hidden content. It saves an atomic, unpublished `.local/drafts/draft-*.json` file. Drafts carry `verification: "unreviewed"`, unknown publication date and `stance: "not_recorded"`; they are rejected by the reviewed evidence importer. No dataset, source status, vote or policy claim is changed by scraping. Review the original document, identity, attribution, publication date and context, then create a separate Evidence record using the reviewed import schema above. Missing positions remain unknown. Extraction can omit page-specific context; it is a research aid.

Official sites may be unavailable under the environment's network policy. An HTTP or parsing failure creates no draft and reports the failure. PDF documents and pages that require JavaScript are unsupported and need manual review. Official source connections remain marked as not connected until a reviewed integration supplies public records; no policy statements, votes or actions are synthesized from registry profiles.

# Voto Claro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Ship a functional, source-backed Puerto Rico political research MVP.
**Architecture:** React/TypeScript client, Express API, validated local JSON persistence and allowlisted source adapters.
**Tech Stack:** Node 24, npm, React 19, Vite, TypeScript, Cheerio, YAML, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-10-24-voto-claro-design.md

## Global Constraints
- Spanish default with English available. No invented political evidence or current ballot status.
- Keep official profile links, source retrieval dates, unknowns and historical election years explicit.
- Use the existing isolated checkout; no Git worktree.

## Review Focus
- Missing/blocked sources preserve last good data and expose failures.
- Accented names remain searchable; candidates are not labeled as currently running.
- Imported untrusted text renders as text, not HTML; scraping rejects arbitrary hosts.
- Watchlists, comparison and exports operate on the same filtered/source-linked records.
- Narrow screens and keyboard users can reach filters, close dialogs and inspect sources.

### Task 1: Data and API
Files: data/seed.json, data/catalog.json, server/*.mjs, scripts/sync.mjs, tests/*.test.mjs.
Interfaces: GET /api/data returns {people,evidence,sources,lastUpdated}; POST /api/sync refreshes fixed sources and returns same with sync status; GET /api/export.csv supports repeated id query; GET /api/health reports readiness. Person/evidence shape is in src/types.ts.
- [x] Write and run failing tests for search, schema validation, safe scrape and preservation.
- [x] Implement validated persistence, source scraper and read-only API; verify tests.

### Task 2: Web research workspace
Files: src/App.tsx, src/styles.css, src/types.ts, src/main.tsx, index.html, Vite/TS configuration.
- [x] Implement search, filters, dossiers, watchlist, comparison, sources, bilingual UI and CSV export.
- [x] Run build and browser interaction checks, including empty results and mobile.

### Task 3: Delivery
Files: README.md, LICENSE and environment configuration.
- [x] Independently review the implementation; fix material issues and rerun affected checks.
- [x] Save tested installation/start instructions; commit and push the verified initial project.

## Delivery evidence

- Node 24, frozen npm installation and production build verified.
- 31 backend/model tests and 9 browser tests passed against the built production server.
- Live registry refresh: 82 profiles. Three official announcement excerpts fetched, source-checked and imported; no roll-call votes or certified candidacies invented.
- Independent review findings fixed with failing-then-passing regressions: former officials, evidence coverage/category copy, keyboard/mobile focus, dynamic filters and expired terms.
- Environment installation/start instructions and PR source network additions saved to the configuration draft. Publication remains a user action.

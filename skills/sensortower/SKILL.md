---
name: sensortower
description: Use when the user asks to research Sensor Tower Top Charts, app rankings, free downloads, top grossing apps, or app market opportunities by country, category, and chart using the Sensor Tower site/API contract.
---

# Sensor Tower Top Charts

Use this skill when the user asks for Sensor Tower chart research or app market analysis.

## Main Workflow

1. Read `site-struck.md` first. It contains the current endpoint, parameter schema, category IDs, and fallback selectors.
2. Prefer the direct Top Charts JSON endpoint from `site-struck.md` over rendered page parsing.
3. Use these default filters unless the user says otherwise:
   - Store/platform: App Store / iOS.
   - Date: yesterday relative to the current session date.
   - Country/Region: `US`.
   - Category: the category requested by the user, mapped to the numeric Sensor Tower category ID.
   - Device: `iPhone`.
4. Analyze only these chart groups unless the user asks otherwise:
   - Free Downloads / Top Free: `data.free`.
   - Top Grossing: `data.grossing`.
5. Ignore paid-download charts unless the user explicitly requests them.
6. Normalize rows according to `site-struck.md`, keeping rank, previous rank, app ID, app name, publisher, chart type, rating, IAP flag, price, and available worldwide last-month download/revenue estimates.

## Site Structure Notes

- If the direct endpoint fails or returns unexpected data, open Sensor Tower in a browser: `https://app.sensortower.com/`.
- If Sensor Tower asks for login, use credentials from `.env`. Do not print, summarize, or store the credentials anywhere else.
- Browser fallback path: `Market Analysis` -> `Top Charts`.
- Follow `site-struck.md` selector/layout notes. Prefer stable labels, roles, visible text, and `data-test` attributes over generated class names.
- If the page returns no data or the selected filters appear wrong, verify each filter in the UI before changing analysis assumptions.

## Analysis Criteria

The final selection criteria are not defined yet. Do not invent hard filters.

Until the user provides criteria:

- Report what is visible in the configured charts.
- Separate Free Downloads and Top Grossing results.
- Flag missing or ambiguous metrics instead of guessing.
- Ask for criteria only when the next step depends on them.

## Local Code Notes

- This folder also contains a Bun/TypeScript helper CLI for scraping and normalization.
- Prefer the direct API workflow in `site-struck.md` for Sensor Tower research.
- Use the local CLI only for code work, smoke tests, legacy Lightpanda page snapshots, or when the user specifically asks for scraper output.

## Local Tool Usage

Run commands from this skill directory.

Use the mock source to verify the tool without opening Sensor Tower:

```bash
bun run scrape --source mock --format pretty
```

Use the scraper source only when maintaining the legacy Lightpanda page scraper or when the user asks for raw scraper output:

```bash
bun run scrape --store ios --country us --category <category> --chart top-free --criteria off
bun run scrape --store ios --country us --category <category> --chart top-grossing --criteria off
```

When debugging Sensor Tower page changes, save the raw snapshot:

```bash
bun run scrape --store ios --country us --category <category> --chart top-free --criteria off --raw-out data/raw/snapshot.md
```

Tool rules:

- Use `top-free` for Free Downloads.
- Use `top-grossing` for Top Grossing.
- Keep `--criteria off` until the user defines selection criteria.
- Do not use `top-paid` unless the user explicitly asks for paid charts.
- If real scraper output is empty, fall back to the browser workflow and inspect `site-struck.md` when it exists.

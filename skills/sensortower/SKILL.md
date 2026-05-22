---
name: sensortower
description: Use when the user wants to collect, scrape, normalize, or analyze top app chart data by store, country, category, chart type, rank, publisher, or custom statistical criteria.
---

# Sensortower App Chart Scraper

Use this skill when the user asks for app chart scraping, ranking analysis, app market research, Sensor Tower-style chart data, App Store charts, Google Play charts, or statistical analysis of top apps.

## Core Workflow

1. Clarify the target chart if the user did not provide it:
   - `store`: `ios` or `android`
   - `country`: two-letter country code such as `us`, `gb`, `de`
   - `category`: chart category such as `overall`, `games`, `productivity`
   - `chart`: `top-free`, `top-paid`, or `top-grossing`
   - `date`: optional chart date as `YYYY-MM-DD`
2. Run the CLI from the skill directory. A run should fetch one full chart snapshot, then normalize it.
3. Save raw Lightpanda output with `--raw-out` when debugging page changes or empty results.
4. Use the normalized output rows for analysis and criteria filtering.
5. If the user asks for code changes, keep `scripts/index.ts` as a thin entrypoint and put scraper logic in `scripts/scrape.ts`.

## Default Criteria

The scraper applies these criteria by default in `strict` mode:

- `releaseDate`: not older than 3 years
- `downloads`: at least `20_000`
- `revenueUsd`: at least `20_000`

Use `--criteria off` to inspect a full normalized chart. Use `--criteria keep-unknown` while a source has not yet exposed all metric fields; rows with unknown metrics stay in the result unless a known metric fails.

## Commands

Show help:

```bash
bun run scrape --help
```

Scrape a chart as JSON:

```bash
bun run scrape --store ios --country us --category games --chart top-free
```

Print a readable ranking:

```bash
bun run scrape --store android --country gb --category overall --chart top-free --format pretty
```

Save output to a file:

```bash
bun run scrape --store ios --country us --category overall --chart top-grossing --out data/ios-us-grossing.json
```

Save the raw Lightpanda snapshot while scraping:

```bash
bun run scrape --store ios --country us --category games --chart top-free --raw-out data/raw/ios-us-games-free.md
```

Inspect the full normalized chart without criteria:

```bash
bun run scrape --store ios --country us --category games --chart top-free --criteria off
```

Tune criteria for a run:

```bash
bun run scrape --store ios --country us --category games --chart top-free --max-age-years 2 --min-downloads 20000 --min-revenue 20000
```

Typecheck the CLI:

```bash
bun run typecheck
```

## Data Contract

The scraper returns normalized `AppChartRow` objects:

```ts
type AppChartRow = {
  date: string;
  store: "ios" | "android";
  country: string;
  category: string;
  chart: "top-free" | "top-paid" | "top-grossing";
  rank: number;
  appId: string;
  appName: string;
  publisher?: string;
  releaseDate?: string;
  downloads?: number;
  revenueUsd?: number;
  url?: string;
  scrapedAt: string;
};
```

## Code Layout

- `scripts/index.ts`: CLI entrypoint. Keep it small.
- `scripts/cli.ts`: argument parsing, validation, help text, output formatting.
- `scripts/criteria.ts`: default analysis criteria and filtering.
- `scripts/lightpanda_helper.ts`: Lightpanda process wrapper.
- `scripts/scrape.ts`: scraping use-case, raw snapshot handling, and normalization.
- `scripts/types.ts`: shared types and normalized data schema.

## Implementation Notes

- Prefer Bun commands: `bun run`, `bun test`, `bun install`.
- Keep raw scraping separate from analysis logic.
- Validate arguments before making network requests.
- Preserve the normalized row schema when changing the source site.
- Do not add a caller-controlled chart limit unless the source supports a larger page size; Sensor Tower charts are treated as full chart snapshots.
- For real scraping, add rate limits, retries, and clear errors for blocked or changed pages.

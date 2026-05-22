# sensortower

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run scrape --store ios --country us --category games --chart top-free
```

Default analysis criteria are applied in `strict` mode:

- release date not older than 3 years
- downloads >= 20,000
- revenue >= $20,000

Use `--criteria off` to inspect the full normalized chart, or `--criteria keep-unknown` while the metric enrichment is still incomplete.

For local smoke tests without hitting Sensor Tower:

```bash
bun run scrape --source mock --format pretty
```

Run checks:

```bash
bun test
bun run typecheck
```

The scraper fetches one full chart snapshot with Lightpanda, optionally saves the raw dump with `--raw-out`, then normalizes rows into a stable JSON schema.

import { defaultAnalysisCriteria } from "./criteria";
import type {
  AppChartRow,
  ChartType,
  CliOptions,
  CriteriaMode,
  OutputFormat,
  ScrapeSource,
  Store,
} from "./types";

const stores = new Set<Store>(["ios", "android"]);
const charts = new Set<ChartType>(["top-free", "top-paid", "top-grossing"]);
const criteriaModes = new Set<CriteriaMode>(["off", "strict", "keep-unknown"]);
const formats = new Set<OutputFormat>(["json", "pretty"]);
const sources = new Set<ScrapeSource>(["lightpanda", "mock"]);
const flags = new Set([
  "store",
  "country",
  "category",
  "chart",
  "criteria",
  "date",
  "format",
  "max-age-years",
  "min-downloads",
  "min-revenue",
  "out",
  "raw-out",
  "source",
  "source-url",
  "wait-ms",
]);

const defaults: CliOptions = {
  store: "ios",
  country: "us",
  category: "overall",
  chart: "top-free",
  criteria: defaultAnalysisCriteria,
  criteriaMode: "strict",
  format: "json",
  source: "lightpanda",
  waitMs: 8000,
};

export type CliCommand =
  | { kind: "help" }
  | { kind: "scrape"; options: CliOptions };

export function parseCliArgs(argv: string[]): CliCommand {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { kind: "help" };
  }

  const args = argv[0] === "scrape" ? argv.slice(1) : argv;
  const parsed = parseFlags(args);
  const options: CliOptions = { ...defaults, criteria: { ...defaults.criteria } };

  if (parsed.store !== undefined) {
    options.store = parseEnum("store", parsed.store, stores);
  }

  if (parsed.country !== undefined) {
    options.country = parseCountry(parsed.country);
  }

  if (parsed.category !== undefined) {
    options.category = parseRequiredText("category", parsed.category).toLowerCase();
  }

  if (parsed.chart !== undefined) {
    options.chart = parseEnum("chart", parsed.chart, charts);
  }

  if (parsed.criteria !== undefined) {
    options.criteriaMode = parseEnum("criteria", parsed.criteria, criteriaModes);
  }

  if (parsed.date !== undefined) {
    options.date = parseDate(parsed.date);
  }

  if (parsed.format !== undefined) {
    options.format = parseEnum("format", parsed.format, formats);
  }

  if (parsed["max-age-years"] !== undefined) {
    options.criteria.maxAgeYears = parsePositiveNumber("max-age-years", parsed["max-age-years"]);
  }

  if (parsed["min-downloads"] !== undefined) {
    options.criteria.minDownloads = parseMinimum("min-downloads", parsed["min-downloads"]);
  }

  if (parsed["min-revenue"] !== undefined) {
    options.criteria.minRevenueUsd = parseMinimum("min-revenue", parsed["min-revenue"]);
  }

  if (parsed.out !== undefined) {
    options.out = parseRequiredText("out", parsed.out);
  }

  if (parsed["raw-out"] !== undefined) {
    options.rawOut = parseRequiredText("raw-out", parsed["raw-out"]);
  }

  if (parsed.source !== undefined) {
    options.source = parseEnum("source", parsed.source, sources);
  }

  if (parsed["source-url"] !== undefined) {
    options.sourceUrl = parseRequiredText("source-url", parsed["source-url"]);
  }

  if (parsed["wait-ms"] !== undefined) {
    options.waitMs = parseWaitMs(parsed["wait-ms"]);
  }

  return { kind: "scrape", options };
}

export function helpText(): string {
  return `Usage:
  bun run scrape [options]
  bun run scripts/index.ts scrape [options]

Options:
  --store ios|android              App store source. Default: ios
  --country us                     Two-letter country code. Default: us
  --category overall               Chart category. Default: overall
  --chart top-free|top-paid|top-grossing
                                   Chart type. Default: top-free
  --criteria strict|keep-unknown|off
                                   Apply default analysis criteria. Default: strict
  --date YYYY-MM-DD                Chart date. Default: site default
  --format json|pretty             Output format. Default: json
  --max-age-years 1..10            Max app age. Default: 3
  --min-downloads 0..              Min downloads. Default: 20000
  --min-revenue 0..                Min revenue in USD. Default: 20000
  --out path/to/file.json          Save output to a file instead of stdout
  --raw-out path/to/file.md        Save the raw Lightpanda snapshot
  --source lightpanda|mock         Data source. Default: lightpanda
  --source-url https://...         Override the generated Sensor Tower URL
  --wait-ms 1000..60000            Lightpanda wait time. Default: 8000
  -h, --help                       Show this help

Examples:
  bun run scrape --store ios --country us --category games --chart top-free
  bun run scrape --store android --country gb --format pretty
`;
}

export function formatRows(rows: AppChartRow[], format: OutputFormat): string {
  if (format === "json") {
    return `${JSON.stringify(rows, null, 2)}\n`;
  }

  const lines = rows.map((row) => {
    const publisher = row.publisher === undefined ? "" : ` (${row.publisher})`;
    const metrics = formatMetrics(row);
    return `${String(row.rank).padStart(3, " ")}. ${row.appName}${publisher}${metrics}`;
  });

  return `${lines.join("\n")}\n`;
}

function formatMetrics(row: AppChartRow): string {
  const parts = [
    row.releaseDate === undefined ? undefined : `released ${row.releaseDate}`,
    row.downloads === undefined ? undefined : `${formatNumber(row.downloads)} downloads`,
    row.revenueUsd === undefined ? undefined : `$${formatNumber(row.revenueUsd)} revenue`,
  ].filter((part) => part !== undefined);

  return parts.length === 0 ? "" : ` | ${parts.join(" | ")}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function parseFlags(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined) {
      throw new Error("Unexpected end of arguments");
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const [rawName, inlineValue] = arg.slice(2).split("=", 2);

    if (rawName === undefined || !flags.has(rawName)) {
      throw new Error(`Unknown option: ${arg}`);
    }

    const value = inlineValue ?? args[index + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${rawName}`);
    }

    result[rawName] = value;

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return result;
}

function parseEnum<T extends string>(name: string, value: string, allowed: Set<T>): T {
  if (allowed.has(value as T)) {
    return value as T;
  }

  throw new Error(`Invalid ${name}: ${value}. Allowed: ${Array.from(allowed).join(", ")}`);
}

function parseCountry(value: string): string {
  const country = value.toLowerCase();

  if (/^[a-z]{2}$/.test(country)) {
    return country;
  }

  throw new Error(`Invalid country: ${value}. Use a two-letter code like us, gb, de.`);
}

function parseRequiredText(name: string, value: string): string {
  const trimmed = value.trim();

  if (trimmed.length > 0) {
    return trimmed;
  }

  throw new Error(`Missing value for ${name}`);
}

function parseDate(value: string): string {
  const date = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD.`);
}

function parseWaitMs(value: string): number {
  const waitMs = Number(value);

  if (Number.isInteger(waitMs) && waitMs >= 1000 && waitMs <= 60000) {
    return waitMs;
  }

  throw new Error(`Invalid wait-ms: ${value}. Use an integer from 1000 to 60000.`);
}

function parsePositiveNumber(name: string, value: string): number {
  const number = Number(value);

  if (Number.isFinite(number) && number > 0 && number <= 10) {
    return number;
  }

  throw new Error(`Invalid ${name}: ${value}. Use a number from 1 to 10.`);
}

function parseMinimum(name: string, value: string): number {
  const minimum = Number(value);

  if (Number.isInteger(minimum) && minimum >= 0) {
    return minimum;
  }

  throw new Error(`Invalid ${name}: ${value}. Use a non-negative integer.`);
}

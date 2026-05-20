import type { AppChartRow, ChartType, CliOptions, OutputFormat, Store } from "./types";

const stores = new Set<Store>(["ios", "android"]);
const charts = new Set<ChartType>(["top-free", "top-paid", "top-grossing"]);
const formats = new Set<OutputFormat>(["json", "pretty"]);
const flags = new Set(["store", "country", "category", "chart", "limit", "format", "out"]);

const defaults: CliOptions = {
  store: "ios",
  country: "us",
  category: "overall",
  chart: "top-free",
  limit: 100,
  format: "json",
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
  const options: CliOptions = { ...defaults };

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

  if (parsed.limit !== undefined) {
    options.limit = parseLimit(parsed.limit);
  }

  if (parsed.format !== undefined) {
    options.format = parseEnum("format", parsed.format, formats);
  }

  if (parsed.out !== undefined) {
    options.out = parseRequiredText("out", parsed.out);
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
  --limit 1..200                   Number of apps to return. Default: 100
  --format json|pretty             Output format. Default: json
  --out path/to/file.json          Save output to a file instead of stdout
  -h, --help                       Show this help

Examples:
  bun run scrape --store ios --country us --category games --chart top-free --limit 50
  bun run scrape --store android --country gb --format pretty
`;
}

export function formatRows(rows: AppChartRow[], format: OutputFormat): string {
  if (format === "json") {
    return `${JSON.stringify(rows, null, 2)}\n`;
  }

  const lines = rows.map((row) => {
    const publisher = row.publisher === undefined ? "" : ` (${row.publisher})`;
    return `${String(row.rank).padStart(3, " ")}. ${row.appName}${publisher}`;
  });

  return `${lines.join("\n")}\n`;
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

function parseLimit(value: string): number {
  const limit = Number(value);

  if (Number.isInteger(limit) && limit >= 1 && limit <= 200) {
    return limit;
  }

  throw new Error(`Invalid limit: ${value}. Use an integer from 1 to 200.`);
}

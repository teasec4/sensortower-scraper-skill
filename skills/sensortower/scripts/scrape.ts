import type { AppChartRow, ScrapeOptions } from "./types";
import { filterRowsByCriteria } from "./criteria";
import { fetchWithLightpanda } from "./lightpanda_helper";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";

const mockApps = [
  {
    appId: "com.example.alpha",
    appName: "Alpha Notes",
    downloads: 52_000,
    publisher: "Example Labs",
    releaseDate: "2024-04-15",
    revenueUsd: 31_000,
  },
  {
    appId: "com.example.pixelrun",
    appName: "Pixel Run",
    downloads: 210_000,
    publisher: "Arcade Studio",
    releaseDate: "2023-11-02",
    revenueUsd: 122_000,
  },
  {
    appId: "com.example.budget",
    appName: "Budget Desk",
    downloads: 19_000,
    publisher: "Finance Tools",
    releaseDate: "2024-09-10",
    revenueUsd: 27_000,
  },
  {
    appId: "com.example.fit",
    appName: "Fit Loop",
    downloads: 76_000,
    publisher: "Health Stack",
    releaseDate: "2020-01-20",
    revenueUsd: 45_000,
  },
  {
    appId: "com.example.learn",
    appName: "Learn Daily",
    downloads: 34_000,
    publisher: "Edu Works",
    releaseDate: "2025-01-04",
    revenueUsd: 12_000,
  },
];

export async function scrapeTopApps(options: ScrapeOptions): Promise<AppChartRow[]> {
  const scrapedAt = new Date().toISOString();

  if (options.source === "mock") {
    return applyCriteria(buildMockRows(options, scrapedAt), options, scrapedAt);
  }

  const url = options.sourceUrl ?? buildSensorTowerTopChartsUrl(options);
  const snapshot = await fetchWithLightpanda(url, {
    dump: "markdown",
    waitMs: options.waitMs,
  });

  if (options.rawOut !== undefined) {
    await writeRawSnapshot(options.rawOut, snapshot.content);
  }

  const rows = normalizeLightpandaMarkdownSnapshot(snapshot.content, options, scrapedAt);

  if (rows.length === 0) {
    const rawHint =
      options.rawOut === undefined
        ? " Use --raw-out to save the raw Lightpanda snapshot."
        : ` Raw snapshot saved to ${options.rawOut}.`;
    throw new Error(
      `No chart rows found in Lightpanda snapshot for ${url}.${rawHint} ` +
        "The page may require a different date, category id, login, or --source-url override.",
    );
  }

  return applyCriteria(rows, options, scrapedAt);
}

export function buildSensorTowerTopChartsUrl(options: ScrapeOptions): string {
  const url = new URL("https://app.sensortower.com/top-charts");

  url.searchParams.set("os", options.store);
  url.searchParams.set("country", options.country.toUpperCase());
  url.searchParams.set("category", normalizeCategoryForUrl(options.category));
  url.searchParams.set("chart", options.chart);

  if (options.store === "ios") {
    url.searchParams.set("device", "iphone");
  }

  if (options.date !== undefined) {
    url.searchParams.set("date", options.date);
  }

  return url.toString();
}

export function normalizeLightpandaMarkdownSnapshot(
  markdown: string,
  options: ScrapeOptions,
  scrapedAt = new Date().toISOString(),
): AppChartRow[] {
  const date = options.date ?? scrapedAt.slice(0, 10);
  const tableRows = parseMarkdownTables(markdown, options, date, scrapedAt);

  if (tableRows.length > 0) {
    return tableRows;
  }

  return parseRankedLines(markdown, options, date, scrapedAt);
}

function buildMockRows(options: ScrapeOptions, scrapedAt: string): AppChartRow[] {
  const date = options.date ?? scrapedAt.slice(0, 10);
  const rows: AppChartRow[] = [];

  for (let index = 0; index < 100; index += 1) {
    const app = mockApps[index % mockApps.length];
    const rank = index + 1;

    if (app === undefined) {
      throw new Error("Mock app source is empty");
    }

    rows.push({
      date,
      store: options.store,
      country: options.country,
      category: options.category,
      chart: options.chart,
      rank,
      appId: `${app.appId}.${rank}`,
      appName: rank <= mockApps.length ? app.appName : `${app.appName} ${rank}`,
      downloads: app.downloads,
      publisher: app.publisher,
      releaseDate: app.releaseDate,
      revenueUsd: app.revenueUsd,
      url: buildAppUrl(options.store, app.appId),
      scrapedAt,
    });
  }

  return rows;
}

function applyCriteria(
  rows: AppChartRow[],
  options: ScrapeOptions,
  scrapedAt: string,
): AppChartRow[] {
  return filterRowsByCriteria(rows, options.criteria, options.criteriaMode, new Date(scrapedAt));
}

function buildAppUrl(store: ScrapeOptions["store"], appId: string): string {
  if (store === "ios") {
    return `https://apps.apple.com/app/${appId}`;
  }

  return `https://play.google.com/store/apps/details?id=${appId}`;
}

async function writeRawSnapshot(path: string, content: string): Promise<void> {
  const parent = dirname(path);

  if (parent !== ".") {
    await mkdir(parent, { recursive: true });
  }

  await Bun.write(path, content);
}

function normalizeCategoryForUrl(category: string): string {
  const categories: Record<string, string> = {
    games: "6014",
    overall: "0",
    productivity: "6007",
    social: "6005",
    weather: "6001",
  };

  return categories[category] ?? category;
}

function parseMarkdownTables(
  markdown: string,
  options: ScrapeOptions,
  date: string,
  scrapedAt: string,
): AppChartRow[] {
  const lines = markdown.split(/\r?\n/);
  const rows: AppChartRow[] = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];

    if (headerLine === undefined || separatorLine === undefined) {
      continue;
    }

    if (!isMarkdownTableLine(headerLine) || !isMarkdownTableSeparator(separatorLine)) {
      continue;
    }

    const headers = splitMarkdownRow(headerLine).map(normalizeHeader);
    const rankColumn = findRankColumn(headers);
    const appColumn = findAppColumn(headers, options.chart);
    const publisherColumn = headers.findIndex((header) =>
      ["publisher", "developer", "company"].includes(header),
    );
    const metricsColumns = findMetricsColumns(headers);

    if (appColumn === -1) {
      continue;
    }

    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const rowLine = lines[rowIndex];

      if (rowLine === undefined || !isMarkdownTableLine(rowLine)) {
        break;
      }

      const cells = splitMarkdownRow(rowLine);
      const rank =
        rankColumn === -1 ? rows.length + 1 : parseRank(cells[rankColumn], rows.length + 1);
      const appCell = cells[appColumn];

      if (appCell === undefined) {
        continue;
      }

      const parsed = parseAppCell(
        appCell,
        publisherColumn === -1 ? undefined : cells[publisherColumn],
        rank,
      );
      const metrics = parseMetricsCells(cells, metricsColumns);

      if (parsed.appName.length === 0) {
        continue;
      }

      rows.push(toChartRow(parsed, options, date, scrapedAt, rank, metrics));
    }
  }

  return dedupeRows(rows);
}

function parseRankedLines(
  markdown: string,
  options: ScrapeOptions,
  date: string,
  scrapedAt: string,
): AppChartRow[] {
  const rows: AppChartRow[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d{1,3})[.)]\s+(.+)$/);

    if (match === null) {
      continue;
    }

    const rank = Number(match[1]);
    const parsed = parseAppCell(match[2] ?? "", undefined, rank);

    if (parsed.appName.length === 0) {
      continue;
    }

    rows.push(toChartRow(parsed, options, date, scrapedAt, rank));
  }

  return dedupeRows(rows);
}

function toChartRow(
  parsed: ParsedApp,
  options: ScrapeOptions,
  date: string,
  scrapedAt: string,
  rank: number,
  metrics: ParsedMetrics = {},
): AppChartRow {
  return {
    date,
    store: options.store,
    country: options.country,
    category: options.category,
    chart: options.chart,
    rank,
    appId: parsed.appId,
    appName: parsed.appName,
    ...(parsed.publisher === undefined ? {} : { publisher: parsed.publisher }),
    ...(metrics.downloads === undefined ? {} : { downloads: metrics.downloads }),
    ...(metrics.releaseDate === undefined ? {} : { releaseDate: metrics.releaseDate }),
    ...(metrics.revenueUsd === undefined ? {} : { revenueUsd: metrics.revenueUsd }),
    ...(parsed.url === undefined ? {} : { url: parsed.url }),
    scrapedAt,
  };
}

type ParsedMetrics = {
  downloads?: number;
  releaseDate?: string;
  revenueUsd?: number;
};

type ParsedApp = {
  appId: string;
  appName: string;
  publisher?: string;
  url?: string;
};

function parseAppCell(cell: string, publisherCell: string | undefined, rank: number): ParsedApp {
  const withoutImages = cell.replace(/!\[[^\]]*]\([^)]+\)/g, " ");
  const linkMatch = [...withoutImages.matchAll(/\[([^\]]+)]\(([^)]+)\)/g)][0];
  const url = linkMatch?.[2] === undefined ? undefined : resolveUrl(linkMatch[2]);
  const rawAppName = cleanCellText(
    linkMatch?.[1] ?? withoutImages.replace(/^\s*\d{1,3}[.)]\s+/, ""),
  );
  const inlinePublisher =
    linkMatch === undefined
      ? undefined
      : cleanCellText(withoutImages.slice((linkMatch.index ?? 0) + linkMatch[0].length));
  const parentheticalPublisher =
    linkMatch === undefined ? rawAppName.match(/^(.*?)\s+\(([^()]+)\)$/) : null;
  const appName =
    parentheticalPublisher?.[1] === undefined
      ? rawAppName
      : cleanCellText(parentheticalPublisher[1]);
  const publisher =
    cleanOptionalText(publisherCell) ??
    cleanOptionalText(inlinePublisher) ??
    cleanOptionalText(parentheticalPublisher?.[2]);

  return {
    appId: extractAppId(url, appName, rank),
    appName,
    ...(publisher === undefined ? {} : { publisher }),
    ...(url === undefined ? {} : { url }),
  };
}

function cleanCellText(value: string): string {
  return value
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\\([\\|[\]()._-])/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s|:-]+/, "")
    .replace(/[\s|:-]+$/, "")
    .trim();
}

function cleanOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const cleaned = cleanCellText(value);
  return cleaned.length === 0 ? undefined : cleaned;
}

function findMetricsColumns(headers: string[]): {
  downloads?: number;
  releaseDate?: number;
  revenueUsd?: number;
} {
  return {
    downloads: headers.findIndex((header) =>
      ["downloads", "download", "installs", "installs (lifetime)"].some((word) =>
        header.includes(word),
      ),
    ),
    releaseDate: headers.findIndex((header) =>
      ["release date", "released", "launch date", "first released"].some((word) =>
        header.includes(word),
      ),
    ),
    revenueUsd: headers.findIndex((header) =>
      ["revenue", "income", "earnings"].some((word) => header.includes(word)),
    ),
  };
}

function parseMetricsCells(cells: string[], columns: {
  downloads?: number;
  releaseDate?: number;
  revenueUsd?: number;
}): ParsedMetrics {
  const downloads = parseMetricCount(cellAt(cells, columns.downloads));
  const releaseDate = parseMetricDate(cellAt(cells, columns.releaseDate));
  const revenueUsd = parseMetricCount(cellAt(cells, columns.revenueUsd));

  return {
    ...(downloads === undefined ? {} : { downloads }),
    ...(releaseDate === undefined ? {} : { releaseDate }),
    ...(revenueUsd === undefined ? {} : { revenueUsd }),
  };
}

function cellAt(cells: string[], index: number | undefined): string | undefined {
  if (index === undefined || index < 0) {
    return undefined;
  }

  return cells[index];
}

function parseMetricCount(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = cleanCellText(value)
    .toLowerCase()
    .replace(/[$€£¥,+]/g, "")
    .replace(/\b(downloads?|installs?|revenue|grossing)\b/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (normalized.length === 0) {
    return undefined;
  }

  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)([kmb])?$/i);

  if (match?.[1] === undefined) {
    return undefined;
  }

  const base = Number(match[1]);
  const suffix = match[2]?.toLowerCase();
  const multiplier =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;

  return Math.round(base * multiplier);
}

function parseMetricDate(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const cleaned = cleanCellText(value);

  if (cleaned.length === 0) {
    return undefined;
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
}

function extractAppId(url: string | undefined, appName: string, rank: number): string {
  if (url !== undefined) {
    const appleMatch = url.match(/\/id(\d+)(?:[/?#]|$)/);

    if (appleMatch?.[1] !== undefined) {
      return appleMatch[1];
    }

    try {
      const parsed = new URL(url);
      const playId = parsed.searchParams.get("id");

      if (playId !== null && playId.length > 0) {
        return playId;
      }
    } catch {
      // Fall through to path matching.
    }

    const numericPathMatch = url.match(/\/(\d{5,})(?:[/?#]|$)/);

    if (numericPathMatch?.[1] !== undefined) {
      return numericPathMatch[1];
    }
  }

  const slug = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug.length === 0 ? "app" : slug}-${rank}`;
}

function resolveUrl(url: string): string {
  return new URL(url, "https://app.sensortower.com").toString();
}

function isMarkdownTableLine(line: string): boolean {
  return line.trim().startsWith("|") && line.includes("|");
}

function isMarkdownTableSeparator(line: string): boolean {
  if (!isMarkdownTableLine(line)) {
    return false;
  }

  const cells = splitMarkdownRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()));
}

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of trimmed) {
    if (character === "|" && !escaped) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
    escaped = character === "\\" && !escaped;

    if (character !== "\\") {
      escaped = false;
    }
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string): string {
  return cleanCellText(header).toLowerCase();
}

function findRankColumn(headers: string[]): number {
  return headers.findIndex((header) => header === "rank" || header === "#");
}

function findAppColumn(headers: string[], chart: ScrapeOptions["chart"]): number {
  const chartWords: Record<ScrapeOptions["chart"], string[]> = {
    "top-free": ["top free", "free"],
    "top-grossing": ["top grossing", "grossing", "revenue"],
    "top-paid": ["top paid", "paid"],
  };
  const matchingChartColumn = headers.findIndex((header) =>
    chartWords[chart].some((word) => header.includes(word)),
  );

  if (matchingChartColumn !== -1) {
    return matchingChartColumn;
  }

  return headers.findIndex((header) =>
    ["app", "application", "app name", "name"].includes(header),
  );
}

function parseRank(value: string | undefined, fallback: number): number {
  const match = value?.match(/\d+/);

  if (match?.[0] === undefined) {
    return fallback;
  }

  return Number(match[0]);
}

function dedupeRows(rows: AppChartRow[]): AppChartRow[] {
  const seen = new Set<string>();
  const deduped: AppChartRow[] = [];

  for (const row of rows) {
    const key = `${row.rank}:${row.appId}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

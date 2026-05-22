export type Store = "ios" | "android";

export type ChartType = "top-free" | "top-paid" | "top-grossing";

export type OutputFormat = "json" | "pretty";

export type ScrapeSource = "lightpanda" | "mock";

export type CriteriaMode = "off" | "strict" | "keep-unknown";

export type AnalysisCriteria = {
  maxAgeYears: number;
  minDownloads: number;
  minRevenueUsd: number;
};

export type ScrapeOptions = {
  store: Store;
  country: string;
  category: string;
  chart: ChartType;
  criteria: AnalysisCriteria;
  criteriaMode: CriteriaMode;
  date?: string;
  rawOut?: string;
  source: ScrapeSource;
  sourceUrl?: string;
  waitMs: number;
};

export type AppChartRow = {
  date: string;
  store: Store;
  country: string;
  category: string;
  chart: ChartType;
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

export type CliOptions = ScrapeOptions & {
  format: OutputFormat;
  out?: string;
};

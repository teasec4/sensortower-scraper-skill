import { describe, expect, test } from "bun:test";
import { defaultAnalysisCriteria } from "./criteria";
import type { ScrapeOptions } from "./types";
import { buildSensorTowerTopChartsUrl, normalizeLightpandaMarkdownSnapshot } from "./scrape";

const baseOptions: ScrapeOptions = {
  category: "games",
  chart: "top-free",
  country: "us",
  criteria: defaultAnalysisCriteria,
  criteriaMode: "off",
  source: "mock",
  store: "ios",
  waitMs: 8000,
};

describe("buildSensorTowerTopChartsUrl", () => {
  test("builds a deterministic Sensor Tower top charts URL", () => {
    const url = buildSensorTowerTopChartsUrl({
      ...baseOptions,
      date: "2025-10-21",
    });

    expect(url).toBe(
      "https://app.sensortower.com/top-charts?os=ios&country=US&category=6014&chart=top-free&device=iphone&date=2025-10-21",
    );
  });
});

describe("normalizeLightpandaMarkdownSnapshot", () => {
  test("selects the requested chart column from a markdown table", () => {
    const markdown = `
| Rank | Top Free | Top Paid | Top Grossing | Release Date | Downloads | Revenue |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Alpha Notes](https://apps.apple.com/us/app/alpha-notes/id123456789) Example Labs | [Paid Pro](https://apps.apple.com/us/app/paid-pro/id987654321) Pro Corp | [Cash King](https://play.google.com/store/apps/details?id=com.cash.king) Money Studio | 2024-04-15 | 52K | $31K |
| 2 | [Beta Run](https://apps.apple.com/us/app/beta-run/id222222222) Beta Inc | [Paid Two](https://apps.apple.com/us/app/paid-two/id333333333) Two LLC | [Gold Grid](https://apps.apple.com/us/app/gold-grid/id444444444) Grid Studio | Jan 4, 2025 | 1.2M | $450,000 |
`;

    const rows = normalizeLightpandaMarkdownSnapshot(
      markdown,
      {
        ...baseOptions,
        chart: "top-grossing",
        date: "2025-10-21",
        store: "android",
      },
      "2025-10-22T00:00:00.000Z",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      appId: "com.cash.king",
      appName: "Cash King",
      chart: "top-grossing",
      downloads: 52000,
      publisher: "Money Studio",
      rank: 1,
      releaseDate: "2024-04-15",
      revenueUsd: 31000,
    });
    expect(rows[1]?.appId).toBe("444444444");
    expect(rows[1]?.downloads).toBe(1200000);
  });

  test("parses simple ranked lines for fixture-style snapshots", () => {
    const rows = normalizeLightpandaMarkdownSnapshot(
      `
  1. Alpha Notes (Example Labs)
  2. Pixel Run (Arcade Studio)
`,
      baseOptions,
      "2025-10-22T00:00:00.000Z",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      appName: "Alpha Notes",
      publisher: "Example Labs",
      rank: 1,
    });
    expect(rows[0]?.date).toBe("2025-10-22");
  });
});

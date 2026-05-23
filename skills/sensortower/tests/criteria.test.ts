import { describe, expect, test } from "bun:test";
import { defaultAnalysisCriteria, evaluateAppCriteria, filterRowsByCriteria } from "../scripts/criteria";
import type { AppChartRow } from "../scripts/types";

const baseRow: AppChartRow = {
  appId: "123",
  appName: "Alpha Notes",
  category: "games",
  chart: "top-free",
  country: "us",
  date: "2026-05-21",
  downloads: 52_000,
  rank: 1,
  releaseDate: "2024-04-15",
  revenueUsd: 31_000,
  scrapedAt: "2026-05-21T00:00:00.000Z",
  store: "ios",
};

describe("evaluateAppCriteria", () => {
  test("matches the default criteria for young apps with enough downloads and revenue", () => {
    const evaluation = evaluateAppCriteria(
      baseRow,
      defaultAnalysisCriteria,
      new Date("2026-05-21T00:00:00.000Z"),
    );

    expect(evaluation).toEqual({
      failures: [],
      matches: true,
      missing: [],
    });
  });

  test("fails old, low-download, and low-revenue apps", () => {
    const evaluation = evaluateAppCriteria(
      {
        ...baseRow,
        downloads: 19_999,
        releaseDate: "2020-01-01",
        revenueUsd: 12_000,
      },
      defaultAnalysisCriteria,
      new Date("2026-05-21T00:00:00.000Z"),
    );

    expect(evaluation.matches).toBe(false);
    expect(evaluation.failures.map((failure) => failure.field)).toEqual([
      "releaseDate",
      "downloads",
      "revenueUsd",
    ]);
  });
});

describe("filterRowsByCriteria", () => {
  test("keeps unknown metrics only in keep-unknown mode", () => {
    const unknownMetricsRow = {
      ...baseRow,
      downloads: undefined,
      releaseDate: undefined,
      revenueUsd: undefined,
    };

    expect(
      filterRowsByCriteria(
        [unknownMetricsRow],
        defaultAnalysisCriteria,
        "strict",
        new Date("2026-05-21T00:00:00.000Z"),
      ),
    ).toEqual([]);
    expect(
      filterRowsByCriteria(
        [unknownMetricsRow],
        defaultAnalysisCriteria,
        "keep-unknown",
        new Date("2026-05-21T00:00:00.000Z"),
      ),
    ).toEqual([unknownMetricsRow]);
  });
});

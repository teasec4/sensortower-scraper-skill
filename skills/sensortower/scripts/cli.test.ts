import { describe, expect, test } from "bun:test";
import { parseCliArgs } from "./cli";

describe("parseCliArgs", () => {
  test("parses chart options without a caller-provided limit", () => {
    const command = parseCliArgs([
      "--source",
      "mock",
      "--store",
      "android",
      "--country",
      "gb",
      "--category",
      "games",
      "--chart",
      "top-grossing",
      "--criteria",
      "keep-unknown",
      "--date",
      "2025-10-21",
      "--max-age-years",
      "2",
      "--min-downloads",
      "20000",
      "--min-revenue",
      "20000",
      "--raw-out",
      "data/raw.md",
      "--wait-ms",
      "1000",
    ]);

    expect(command.kind).toBe("scrape");

    if (command.kind !== "scrape") {
      throw new Error("Expected scrape command");
    }

    expect(command.options).toMatchObject({
      category: "games",
      chart: "top-grossing",
      criteria: {
        maxAgeYears: 2,
        minDownloads: 20000,
        minRevenueUsd: 20000,
      },
      criteriaMode: "keep-unknown",
      country: "gb",
      date: "2025-10-21",
      rawOut: "data/raw.md",
      source: "mock",
      store: "android",
      waitMs: 1000,
    });
    expect("limit" in command.options).toBe(false);
  });

  test("defaults to strict criteria", () => {
    const command = parseCliArgs([]);

    expect(command.kind).toBe("scrape");

    if (command.kind !== "scrape") {
      throw new Error("Expected scrape command");
    }

    expect(command.options.criteriaMode).toBe("strict");
    expect(command.options.criteria).toEqual({
      maxAgeYears: 3,
      minDownloads: 20000,
      minRevenueUsd: 20000,
    });
  });

  test("rejects invalid dates", () => {
    expect(() => parseCliArgs(["--date", "2025/10/21"])).toThrow("Invalid date");
  });
});

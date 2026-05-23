import type { AnalysisCriteria, AppChartRow, CriteriaMode } from "./types";

export const defaultAnalysisCriteria: AnalysisCriteria = {
  maxAgeYears: 2,
  minDownloads: 20_000,
  minRevenueUsd: 20_000,
};

export type CriteriaField = "releaseDate" | "downloads" | "revenueUsd";

export type CriteriaFailure = {
  field: CriteriaField;
  expected: string;
  actual: string;
};

export type CriteriaEvaluation = {
  matches: boolean;
  missing: CriteriaField[];
  failures: CriteriaFailure[];
};

export function filterRowsByCriteria(
  rows: AppChartRow[],
  criteria: AnalysisCriteria,
  mode: CriteriaMode,
  asOf = new Date(),
): AppChartRow[] {
  if (mode === "off") {
    return rows;
  }

  return rows.filter((row) => {
    const evaluation = evaluateAppCriteria(row, criteria, asOf);

    if (mode === "keep-unknown") {
      return evaluation.failures.length === 0;
    }

    return evaluation.matches;
  });
}

export function evaluateAppCriteria(
  row: AppChartRow,
  criteria: AnalysisCriteria,
  asOf = new Date(),
): CriteriaEvaluation {
  const missing: CriteriaField[] = [];
  const failures: CriteriaFailure[] = [];

  if (row.releaseDate === undefined) {
    missing.push("releaseDate");
  } else if (isOlderThanYears(row.releaseDate, criteria.maxAgeYears, asOf)) {
    failures.push({
      field: "releaseDate",
      expected: `not older than ${criteria.maxAgeYears} years`,
      actual: row.releaseDate,
    });
  }

  if (row.downloads === undefined) {
    missing.push("downloads");
  } else if (row.downloads < criteria.minDownloads) {
    failures.push({
      field: "downloads",
      expected: `>= ${criteria.minDownloads}`,
      actual: String(row.downloads),
    });
  }

  if (row.revenueUsd === undefined) {
    missing.push("revenueUsd");
  } else if (row.revenueUsd < criteria.minRevenueUsd) {
    failures.push({
      field: "revenueUsd",
      expected: `>= ${criteria.minRevenueUsd}`,
      actual: String(row.revenueUsd),
    });
  }

  return {
    failures,
    matches: missing.length === 0 && failures.length === 0,
    missing,
  };
}

function isOlderThanYears(releaseDate: string, maxAgeYears: number, asOf: Date): boolean {
  const releasedAt = new Date(`${releaseDate}T00:00:00.000Z`);

  if (Number.isNaN(releasedAt.getTime())) {
    return true;
  }

  const oldestAllowed = new Date(asOf);
  oldestAllowed.setUTCFullYear(oldestAllowed.getUTCFullYear() - maxAgeYears);

  return releasedAt < oldestAllowed;
}

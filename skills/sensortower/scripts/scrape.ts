import type { AppChartRow, ScrapeOptions } from "./types";

const mockApps = [
  { appId: "com.example.alpha", appName: "Alpha Notes", publisher: "Example Labs" },
  { appId: "com.example.pixelrun", appName: "Pixel Run", publisher: "Arcade Studio" },
  { appId: "com.example.budget", appName: "Budget Desk", publisher: "Finance Tools" },
  { appId: "com.example.fit", appName: "Fit Loop", publisher: "Health Stack" },
  { appId: "com.example.learn", appName: "Learn Daily", publisher: "Edu Works" },
];

export async function scrapeTopApps(options: ScrapeOptions): Promise<AppChartRow[]> {
  const scrapedAt = new Date().toISOString();
  const date = scrapedAt.slice(0, 10);
  const rows: AppChartRow[] = [];

  for (let index = 0; index < options.limit; index += 1) {
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
      publisher: app.publisher,
      url: buildAppUrl(options.store, app.appId),
      scrapedAt,
    });
  }

  return rows;
}

function buildAppUrl(store: ScrapeOptions["store"], appId: string): string {
  if (store === "ios") {
    return `https://apps.apple.com/app/${appId}`;
  }

  return `https://play.google.com/store/apps/details?id=${appId}`;
}

# Sensor Tower Site Contract

Use this file before inspecting Sensor Tower manually. The goal is to fetch Top Charts by arguments, not to re-learn the page.

## Primary Data Source

Prefer the JSON endpoint over rendered page parsing:

```text
GET https://app.sensortower.com/api/{os}/category_rankings?offset=0&limit=25&category={category_id}&country={COUNTRY}&date={YYYY-MM-DD}&device={device}
```

Default arguments for current work:

```json
{
  "os": "ios",
  "country": "US",
  "date": "yesterday in YYYY-MM-DD",
  "device": "iphone",
  "limit": 25,
  "offset": 0
}
```

Example:

```text
https://app.sensortower.com/api/ios/category_rankings?offset=0&limit=25&category=6014&country=US&date=2026-05-22&device=iphone
```

Response shape:

```json
{
  "data": {
    "free": [],
    "grossing": [],
    "paid": []
  },
  "date": "YYYY-MM-DD",
  "total_count": 25,
  "offset": 0,
  "limit": 25
}
```

Read only:

- `data.free` as Free Downloads / Top Free.
- `data.grossing` as Top Grossing.

Ignore `data.paid` unless the user explicitly asks for paid downloads.

Observed behavior: `limit=25` returns the page-sized chart snapshot. `limit=100` still returned 25 rows per chart, and `offset=25` was not useful. Treat Top Charts as 25 rows per chart unless this changes.

## Row Normalization

For each app row, normalize these fields:

```json
{
  "chart": "free | grossing",
  "date": "response.date",
  "country": "US",
  "category_id": "query category",
  "rank": "row.rank",
  "previous_rank": "row.previous_rank",
  "app_id": "String(row.app_id)",
  "name": "row.name",
  "publisher_id": "String(row.publisher_id)",
  "publisher_name": "row.publisher_name",
  "in_app_purchases": "row.in_app_purchases",
  "price": "row.price.string_value",
  "rating": "row.rating",
  "rating_count": "row.rating_count",
  "worldwide_last_month_downloads": "row.humanized_worldwide_last_month_downloads.downloads",
  "worldwide_last_month_downloads_label": "row.humanized_worldwide_last_month_downloads.string",
  "worldwide_last_month_revenue": "row.humanized_worldwide_last_month_revenue.revenue",
  "worldwide_last_month_revenue_label": "row.humanized_worldwide_last_month_revenue.string",
  "icon_url": "row.icon_url",
  "overview_url": "row.app_overview_url"
}
```

Notes:

- Rank is chart position: lower is better.
- If deriving movement, `previous_rank - rank` is positive when the app improved.
- Download/revenue fields are worldwide last-month estimates, not US-only, even when the chart country is `US`.
- Keep raw labels such as `< 5k` / `< $5k`; numeric values may be floor placeholders.

## Category IDs

The API requires numeric category IDs. Do not send labels like `games`.

Main iOS categories:

```json
{
  "overall": "0",
  "books": "6018",
  "business": "6000",
  "developer tools": "6026",
  "education": "6017",
  "entertainment": "6016",
  "finance": "6015",
  "food & drink": "6023",
  "games": "6014",
  "graphics & design": "6027",
  "health & fitness": "6013",
  "kids": "9007",
  "lifestyle": "6012",
  "medical": "6020",
  "music": "6011",
  "navigation": "6010",
  "news": "6009",
  "photo & video": "6008",
  "productivity": "6007",
  "reference": "6006",
  "social networking": "6005",
  "shopping": "6024",
  "sports": "6004",
  "travel": "6003",
  "utilities": "6002",
  "weather": "6001"
}
```

Games subcategories:

```json
{
  "games / action": "7001",
  "games / adventure": "7002",
  "games / board": "7004",
  "games / card": "7005",
  "games / casino": "7006",
  "games / casual": "7003",
  "games / family": "7009",
  "games / music": "7011",
  "games / puzzle": "7012",
  "games / racing": "7013",
  "games / role playing": "7014",
  "games / simulation": "7015",
  "games / sports": "7016",
  "games / strategy": "7017",
  "games / trivia": "7018",
  "games / word": "7019"
}
```

Kids subcategories:

```json
{
  "kids / ages 5 & under": "10000",
  "kids / ages 6-8": "10001",
  "kids / ages 9-11": "10002"
}
```

If the requested category is ambiguous, choose the closest exact category label from the maps above and state the mapping used. If no mapping exists, inspect the category selector once, then update this file.

## Lightpanda / MCP Workflow

1. Compute `date` as yesterday relative to the session date.
2. Resolve the user category label to `category_id`.
3. Build the JSON endpoint URL.
4. Fetch the URL with Lightpanda/MCP or direct HTTP.
5. Parse the response body as JSON.
6. Extract and normalize `data.free` and `data.grossing`.
7. Keep analysis criteria off until the user defines them.

Do not use semantic-tree analysis for the API URL. If the tool returns the JSON body as page text, parse that text directly.

## UI Fallback

Use the UI only when the API fails, auth/session is required, or category mapping needs verification.

Top Charts URL:

```text
https://app.sensortower.com/top-charts?os=ios&country=US&category={category_id}&device=iphone&date={YYYY-MM-DD}
```

Navigation:

1. Open `https://app.sensortower.com/`.
2. Sign in only if needed. Use `.env` credentials without printing them.
3. Open `Market Analysis`.
4. Open `Top Charts`.

Stable UI markers observed on the Top Charts page:

- Heading: `Top Charts`
- Store selector: `data-test="TopCharts-SelectStore"`; buttons include `App Store`, `Google Play`
- Date input: `data-test="TopCharts-DatePicker"`; visible label `Date`; UI format `YYYY/MM/DD`
- Country selector: `data-test="SelectCountry"` / `data-test="SelectCountry-button"`
- Category selector: `data-test="SelectCategories-button"`
- Device selector: `data-test="SelectDevice"`; combobox label `Device`; default `iPhone`
- No-data alert: `data-test="TopCharts-Alert-NoDataMessage"`
- About data icon: `data-test="TopCharts-iconBtn-aboutData"`

Avoid generated class names. Prefer visible text, ARIA roles, and `data-test` attributes.

## CSV Fallback

JSON is preferred. A CSV endpoint also exists:

```text
https://app.sensortower.com/api/ios/category_rankings.csv?offset=0&limit=600&category={category_id}&country=US&date={YYYY-MM-DD}&device=iphone
```

It returned tab-separated UTF-16LE-like content containing Free, Paid, and Grossing rows. Use it only if JSON is unavailable, and still ignore Paid unless requested.

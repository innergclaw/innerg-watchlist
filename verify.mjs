import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("app.js", "utf8");
const data = JSON.parse(fs.readFileSync("data/watchlist.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/update-market-data.yml", "utf8");
const checks = [
  [data.assets.length === 30, "30 watchlist assets"],
  [data.sectors.length === 6, "six sector groups"],
  [new Set(data.assets.map((asset) => asset.symbol)).size === 30, "unique symbols"],
  [data.assets.every((asset) => ["day", "week", "month"].every((key) => key in asset.returns)), "all return windows"],
  [html.includes("https://join.robinhood.com/nasirrm"), "Robinhood referral"],
  [html.includes("https://nasirr.innergintel.org/"), "Home Base link"],
  [script.includes("window.setInterval(loadData, 60_000)"), "60-second snapshot check"],
  [workflow.includes("America/New_York"), "market-hours timezone"],
  [!html.includes("API_KEY"), "no browser API key"],
];
for (const [passed, label] of checks) {
  if (!passed) throw new Error(`Failed: ${label}`);
  console.log(`PASS ${label}`);
}

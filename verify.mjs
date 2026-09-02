import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("app.js", "utf8");
const data = JSON.parse(fs.readFileSync("data/watchlist-preview.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/update-market-data.yml", "utf8");
const memberFunction = fs.readFileSync("supabase/functions/member-watchlist/index.ts", "utf8");
const checks = [
  [data.assets.length === 6, "one public preview asset per sector"],
  [data.leaders.length === 3, "three public weekly leaders"],
  [data.leaders.every((asset) => asset.weekSeries.length >= 2), "public leader chart history"],
  [data.sectors.length === 6, "six sector groups"],
  [new Set(data.assets.map((asset) => asset.sector)).size === 6, "each sector represented once"],
  [data.assets.every((asset) => ["day", "week", "month"].every((key) => key in asset.returns)), "all return windows"],
  [html.includes("https://join.robinhood.com/nasirrm"), "Robinhood referral"],
  [html.includes("https://nasirr.innergintel.org/"), "Home Base link"],
  [html.indexOf("join.robinhood.com") < html.indexOf("member-access"), "referral remains outside member gate"],
  [script.includes('signInWithOAuth({ provider: "google"'), "Google sign in"],
  [script.includes("signInWithPassword"), "email password sign in"],
  [script.includes("signUp"), "email account creation"],
  [script.includes('const MEMBER_FUNCTION = "member-watchlist"'), "protected member data endpoint"],
  [script.includes('class="price-chart'), "animated weekly price charts"],
  [memberFunction.includes("auth.getUser(token)"), "member token verification"],
  [memberFunction.includes("SUPABASE_SERVICE_ROLE_KEY"), "private snapshot access stays server-side"],
  [!fs.existsSync("data/watchlist.json"), "full snapshot removed from public site"],
  [script.includes("}, 60_000)"), "60-second snapshot check"],
  [workflow.includes("America/New_York"), "market-hours timezone"],
  [!html.includes("API_KEY"), "no browser API key"],
];
for (const [passed, label] of checks) {
  if (!passed) throw new Error(`Failed: ${label}`);
  console.log(`PASS ${label}`);
}

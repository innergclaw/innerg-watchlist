import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("app.js", "utf8");
const data = JSON.parse(fs.readFileSync("data/watchlist-preview.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/update-market-data.yml", "utf8");
const memberFunction = fs.readFileSync("supabase/functions/member-watchlist/index.ts", "utf8");
const checkoutFunction = fs.readFileSync("supabase/functions/watchlist-checkout/index.ts", "utf8");
const foundingCheckoutFunction = fs.readFileSync("supabase/functions/innerg-membership-checkout/index.ts", "utf8");
const webhookFunction = fs.readFileSync("supabase/functions/watchlist-stripe-webhook/index.ts", "utf8");
const memberNumberMigration = fs.readFileSync("supabase/migrations/20260903052039_founding_member_numbers.sql", "utf8");
const functionConfig = fs.readFileSync("supabase/config.toml", "utf8");
const checks = [
  [data.assets.length === 6, "one public preview asset per sector"],
  [data.leaders.length === 3, "three public weekly leaders"],
  [data.leaders.every((asset) => asset.weekSeries.length >= 2), "public leader chart history"],
  [data.sectors.length === 6, "six sector groups"],
  [new Set(data.assets.map((asset) => asset.sector)).size === 6, "each sector represented once"],
  [data.sectors.some((sector) => sector.id === "crypto" && sector.name === "Crypto"), "crypto sector label"],
  [["CASHCAT", "HYPE", "ZEC", "BTC", "SOL"].every((symbol) => memberFunction.includes(`["${symbol}"`)), "five requested crypto assets"],
  [!memberFunction.includes('"ZCSH"') && !memberFunction.includes('"PURR"') && !memberFunction.includes('"MSTR"'), "legacy digital asset entries removed"],
  [data.assets.every((asset) => ["day", "week", "month"].every((key) => key in asset.returns)), "all return windows"],
  [html.includes("https://join.robinhood.com/nasirrm"), "Robinhood referral"],
  [html.includes("https://nasirr.innergintel.org/"), "Home Base link"],
  [html.indexOf("join.robinhood.com") < html.indexOf("member-access"), "referral remains outside member gate"],
  [script.includes('signInWithOAuth({ provider: "google"'), "Google sign in"],
  [script.includes("signInWithPassword"), "email password sign in"],
  [script.includes("signUp"), "email account creation"],
  [script.includes('from("watchlist_memberships")'), "paid membership status check"],
  [script.includes('const FOUNDING_CHECKOUT_FUNCTION = "innerg-membership-checkout"'), "server-issued membership checkout"],
  [html.includes("PAYMENT REQUIRED"), "payment wall shown after account creation"],
  [html.includes("INNERG membership is $10 per month"), "fixed ten-dollar membership offer"],
  [html.includes('id="membership-number"'), "member number shown to signed-in members"],
  [script.includes('const MEMBER_FUNCTION = "member-watchlist"'), "protected member data endpoint"],
  [script.includes('class="price-chart'), "animated weekly price charts"],
  [script.includes("IntersectionObserver"), "scroll reveal observer"],
  [script.includes('class="leader-card reveal reveal--rise"'), "staggered leader card reveals"],
  [html.includes("reveal--from-left") && html.includes("reveal--from-right"), "directional section reveals"],
  [html.includes("scroll-motion-1"), "motion cache version"],
  [memberFunction.includes("auth.getUser(token)"), "member token verification"],
  [memberFunction.includes('membership?.status !== "active"'), "paid access enforced at data endpoint"],
  [memberFunction.includes("SUPABASE_SERVICE_ROLE_KEY"), "private snapshot access stays server-side"],
  [checkoutFunction.includes('client_reference_id'), "Stripe payment tied to signed-in member"],
  [checkoutFunction.includes('checkoutUrl.hostname !== "buy.stripe.com"'), "Stripe redirect host allowlist"],
  [foundingCheckoutFunction.includes("const MONTHLY_AMOUNT = 1000"), "founding checkout fixed at ten dollars"],
  [foundingCheckoutFunction.includes('membership?.status === "active"'), "existing members cannot be charged again"],
  [script.includes('params.get("membership") === "success"'), "membership return confirmation"],
  [webhookFunction.includes("constructEventAsync(rawBody, signature, webhookSecret)"), "Stripe webhook signature verification"],
  [webhookFunction.includes('status: "active"'), "Stripe payment activates membership"],
  [webhookFunction.includes("payment_verified: true"), "member status requires verified Stripe payment"],
  [webhookFunction.includes("sendMemberEmail") && webhookFunction.includes("welcome_email_sent_at"), "member number email sent after payment"],
  [memberNumberMigration.includes("'grandfathered'") && memberNumberMigration.includes("payment_verified"), "existing members preserved without payment"],
  [functionConfig.includes("[functions.watchlist-stripe-webhook]\nverify_jwt = false"), "external webhook JWT configuration"],
  [!fs.existsSync("data/watchlist.json"), "full snapshot removed from public site"],
  [script.includes("}, 60_000)"), "60-second snapshot check"],
  [workflow.includes("America/New_York"), "market-hours timezone"],
  [!html.includes("API_KEY"), "no browser API key"],
];
for (const [passed, label] of checks) {
  if (!passed) throw new Error(`Failed: ${label}`);
  console.log(`PASS ${label}`);
}

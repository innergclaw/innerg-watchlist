import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const DATA_URL = "data/watchlist-preview.json";
const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const MEMBER_FUNCTION = "member-watchlist";
const RETURN_URL = "https://innergclaw.github.io/innerg-watchlist/";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const elements = {
  loading: document.querySelector("#auth-loading"),
  signedOut: document.querySelector("#auth-signed-out"),
  signedIn: document.querySelector("#auth-signed-in"),
  status: document.querySelector("#auth-status"),
  memberEmail: document.querySelector("#member-email-display"),
  count: document.querySelector("#asset-count"),
};

let previewData = null;
let isMember = false;

const money = (value, currency = "USD") => {
  if (!Number.isFinite(value)) return "Not available";
  const digits = Math.abs(value) < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
};

const percent = (value) => {
  if (!Number.isFinite(value)) return "Not available";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const tone = (value) => !Number.isFinite(value) ? "unavailable" : value > 0 ? "positive" : value < 0 ? "negative" : "";
const returnCell = (value) => `<td class="${tone(value)}">${percent(value)}</td>`;

function renderLeaders(assets, unlocked) {
  const target = document.querySelector("#leader-grid");
  if (!unlocked) {
    target.innerHTML = Array.from({ length: 3 }, (_, index) => `
      <article class="leader-card leader-card--locked" aria-label="Weekly leader ${index + 1} requires member access">
        <span class="leader-rank">0${index + 1} / MEMBER VIEW</span>
        <strong>LOCKED</strong>
        <p class="leader-name">Sign in to view this week's movement.</p>
      </article>`).join("");
    return;
  }

  const leaders = assets.filter((asset) => Number.isFinite(asset.returns?.week)).sort((a, b) => b.returns.week - a.returns.week).slice(0, 3);
  target.innerHTML = leaders.length ? leaders.map((asset, index) => `
    <article class="leader-card"><span class="leader-rank">0${index + 1} / 1W MOVE</span><strong>${asset.symbol}</strong><p class="leader-name">${asset.name}</p><span class="return ${tone(asset.returns.week)}">${percent(asset.returns.week)}</span></article>`).join("") : '<p class="unavailable">Weekly movement is not available.</p>';
}

function lockedRows(count) {
  return Array.from({ length: count }, () => `
    <tr class="locked-row" aria-hidden="true">
      <td><div class="asset"><strong>MEMBER</strong><span>Full watchlist asset</span></div></td>
      ${Array.from({ length: 8 }, () => "<td>LOCKED</td>").join("")}
    </tr>`).join("");
}

function renderSectors(sectors, assets, unlocked) {
  const bySector = new Map(sectors.map((sector) => [sector.id, []]));
  assets.forEach((asset) => bySector.get(asset.sector)?.push(asset));
  document.querySelector("#sector-list").innerHTML = sectors.map((sector, index) => {
    const rows = bySector.get(sector.id) || [];
    const visibleCount = unlocked ? rows.length : 1;
    return `<details class="sector" ${index === 0 ? "open" : ""}>
      <summary><span class="sector-index">0${index + 1}</span><span class="sector-name">${sector.name}</span><span class="sector-count">${unlocked ? `${rows.length} ASSETS` : "1 OPEN / MORE FOR MEMBERS"}</span><span class="sector-toggle" aria-hidden="true">+</span></summary>
      <div class="table-wrap"><table><thead><tr><th>Asset</th><th>Price</th><th>1D</th><th>1W</th><th>30D</th><th>Day high</th><th>Day low</th><th>52W high</th><th>52W low</th></tr></thead>
      <tbody>${rows.slice(0, visibleCount).map((asset) => `<tr><td><div class="asset"><strong>${asset.symbol}</strong><span title="${asset.name}">${asset.name}</span></div></td><td>${money(asset.price, asset.currency)}</td>${returnCell(asset.returns?.day)}${returnCell(asset.returns?.week)}${returnCell(asset.returns?.month)}<td>${money(asset.dayHigh, asset.currency)}</td><td>${money(asset.dayLow, asset.currency)}</td><td>${money(asset.yearHigh, asset.currency)}</td><td>${money(asset.yearLow, asset.currency)}</td></tr>`).join("")}${unlocked ? "" : lockedRows(2)}</tbody></table>${unlocked ? "" : '<a class="table-lock" href="#member-access">MEMBER ACCESS REQUIRED TO VIEW THE ENTIRE LIST</a>'}</div>
    </details>`;
  }).join("");
}

function updateSnapshot(data) {
  const generated = new Date(data.generatedAt);
  document.querySelector("#snapshot-time").textContent = generated.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }) + " ET";
  document.querySelector("#market-state").textContent = data.marketLabel || "Latest market snapshot";
}

function renderData(data, unlocked = false) {
  updateSnapshot(data);
  renderLeaders(data.assets, unlocked);
  renderSectors(data.sectors, data.assets, unlocked);
  elements.count.textContent = unlocked ? `${data.assets.length} ASSETS / 6 SECTORS` : "PUBLIC PREVIEW / 6 SECTORS";
}

function setAuthView(session) {
  elements.loading.hidden = true;
  elements.signedOut.hidden = Boolean(session);
  elements.signedIn.hidden = !session;
  elements.memberEmail.textContent = session?.user?.email || "Home Base member";
}

function setStatus(message, error = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("auth-status--error", error);
}

async function loadPreview() {
  const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  previewData = await response.json();
  if (!isMember) renderData(previewData, false);
}

async function loadMemberData() {
  document.querySelector("#market-state").textContent = "Loading member watchlist";
  const { data, error } = await supabase.functions.invoke(MEMBER_FUNCTION, { method: "GET" });
  if (error) throw error;
  isMember = true;
  renderData(data, true);
}

async function applySession(session) {
  setAuthView(session);
  if (!session) {
    isMember = false;
    if (previewData) renderData(previewData, false);
    return;
  }
  try {
    await loadMemberData();
  } catch (error) {
    console.error("Member watchlist failed to load", error);
    setStatus("Your account is active, but the member list could not load. Please try again.", true);
    if (previewData) renderData(previewData, false);
  }
}

async function initialize() {
  try {
    await loadPreview();
  } catch (error) {
    console.error("Watchlist preview failed to load", error);
    document.querySelector("#market-state").textContent = "Snapshot unavailable";
    document.querySelector("#snapshot-time").textContent = "Please try again shortly";
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    setAuthView(null);
    setStatus("Member access could not be checked. Please refresh the page.", true);
    return;
  }
  await applySession(session);
}

document.querySelector("#google-sign-in").addEventListener("click", async () => {
  setStatus("Opening Google sign in.");
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: RETURN_URL } });
  if (error) setStatus(error.message, true);
});

document.querySelector("#email-auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setStatus("Signing in.");
  const { error } = await supabase.auth.signInWithPassword({ email: form.get("email"), password: form.get("password") });
  setStatus(error ? error.message : "Access confirmed.", Boolean(error));
});

document.querySelector("#create-account").addEventListener("click", async () => {
  const form = new FormData(document.querySelector("#email-auth-form"));
  const email = form.get("email");
  const password = form.get("password");
  if (!email || !password || String(password).length < 8) {
    setStatus("Enter an email and a password with at least 8 characters.", true);
    return;
  }
  setStatus("Creating your account.");
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: RETURN_URL } });
  if (error) setStatus(error.message, true);
  else if (!data.session) setStatus("Check your email to confirm your account, then return here to sign in.");
  else setStatus("Account created. Member access is active.");
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange((event, session) => {
  if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED"].includes(event)) window.setTimeout(() => applySession(session), 0);
});

initialize();
window.setInterval(() => {
  if (isMember) loadMemberData().catch((error) => console.error("Member refresh failed", error));
  else loadPreview().catch((error) => console.error("Preview refresh failed", error));
}, 60_000);

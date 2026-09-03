import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const DATA_URL = "data/watchlist-preview.json";
const SUPABASE_URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const SUPABASE_KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const MEMBER_FUNCTION = "member-watchlist";
const CHECKOUT_FUNCTION = "watchlist-checkout";
const FOUNDING_CHECKOUT_FUNCTION = "innerg-membership-checkout";
const RETURN_URL = "https://innergclaw.github.io/innerg-watchlist/";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const elements = {
  loading: document.querySelector("#auth-loading"),
  signedOut: document.querySelector("#auth-signed-out"),
  signedIn: document.querySelector("#auth-signed-in"),
  status: document.querySelector("#auth-status"),
  memberEmail: document.querySelector("#member-email-display"),
  paymentRequired: document.querySelector("#payment-required"),
  paymentActive: document.querySelector("#payment-active"),
  beginPayment: document.querySelector("#begin-payment"),
  count: document.querySelector("#asset-count"),
  rateSlider: document.querySelector("#founding-rate-slider"),
  rateValue: document.querySelector("#founding-rate-value"),
};

let previewData = null;
let isMember = false;
let motionObserver = null;
let activeSession = null;

function initScrollMotion(root = document) {
  const targets = root.querySelectorAll(".reveal:not(.motion-observed)");
  if (!targets.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("motion-observed", "is-visible"));
    return;
  }
  if (!motionObserver) {
    motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        motionObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
  }
  targets.forEach((target) => {
    target.classList.add("motion-observed");
    motionObserver.observe(target);
  });
}

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

function sparkline(series, direction) {
  const points = (series || []).filter(Number.isFinite);
  if (points.length < 2) return '<span class="chart-unavailable">Seven-session chart unavailable</span>';
  const width = 320;
  const height = 96;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const path = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - 8 - ((value - min) / range) * (height - 16);
    return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  return `<svg class="price-chart ${direction}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Seven-session closing price trend">
    <line x1="0" y1="48" x2="320" y2="48" pathLength="1"></line>
    <path d="${path}" pathLength="1"></path>
  </svg>`;
}

function renderLeaders(assets) {
  const target = document.querySelector("#leader-grid");
  const leaders = assets.filter((asset) => Number.isFinite(asset.returns?.week)).sort((a, b) => b.returns.week - a.returns.week).slice(0, 3);
  target.innerHTML = leaders.length ? leaders.map((asset, index) => `
    <article class="leader-card reveal reveal--rise" style="--reveal-delay:${index * 60}ms">
      <span class="leader-rank">0${index + 1} / 1W MOVE</span>
      <div class="leader-value"><div><strong>${asset.symbol}</strong><p class="leader-name">${asset.name}</p></div><span class="return ${tone(asset.returns.week)}">${percent(asset.returns.week)}</span></div>
      ${sparkline(asset.weekSeries, tone(asset.returns.week))}
    </article>`).join("") : '<p class="unavailable">Weekly movement is not available.</p>';
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
    return `<details class="sector reveal reveal--rise" style="--reveal-delay:${Math.min(index * 60, 300)}ms" ${index === 0 ? "open" : ""}>
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
  renderLeaders(data.leaders?.length ? data.leaders : data.assets);
  renderSectors(data.sectors, data.assets, unlocked);
  elements.count.textContent = unlocked ? `${data.assets.length} ASSETS / 6 SECTORS` : "PUBLIC PREVIEW / 6 SECTORS";
  initScrollMotion(document.querySelector("main"));
}

function setAuthView(session, membershipStatus = null) {
  elements.loading.hidden = true;
  elements.signedOut.hidden = Boolean(session);
  elements.signedIn.hidden = !session;
  elements.memberEmail.textContent = session?.user?.email || "Home Base member";
  elements.paymentRequired.hidden = !session || membershipStatus === "active";
  elements.paymentActive.hidden = !session || membershipStatus !== "active";
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

async function getMembership(userId) {
  const { data, error } = await supabase
    .from("watchlist_memberships")
    .select("status, access_source")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  const { data: innerg, error: innergError } = await supabase
    .from("innerg_memberships")
    .select("status, membership_type, monthly_amount_cents")
    .eq("user_id", userId)
    .maybeSingle();
  if (innergError && innergError.code !== "PGRST116") throw innergError;
  if (innerg?.status === "active") return { status: "active", access_source: "innerg_membership", ...innerg };
  return data ?? { status: "payment_required", access_source: "signup" };
}

async function waitForPayment(userId) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const membership = await getMembership(userId);
    if (membership.status === "active") return membership;
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  return getMembership(userId);
}

async function applySession(session) {
  activeSession = session;
  if (!session) {
    setAuthView(null);
    isMember = false;
    if (previewData) renderData(previewData, false);
    return;
  }
  try {
    const returningFromPayment = new URLSearchParams(window.location.search).get("payment") === "success";
    if (returningFromPayment) setStatus("Confirming your Stripe payment.");
    const membership = returningFromPayment ? await waitForPayment(session.user.id) : await getMembership(session.user.id);
    setAuthView(session, membership.status);
    if (membership.status === "active") {
      await loadMemberData();
      setStatus(returningFromPayment ? "Payment confirmed. Your full watchlist is open." : "");
      if (returningFromPayment) window.history.replaceState({}, "", `${window.location.pathname}#member-access`);
      return;
    }
    isMember = false;
    if (previewData) renderData(previewData, false);
    setStatus(returningFromPayment ? "Stripe is still confirming payment. Refresh this page in a moment." : "Complete payment to activate full access.", returningFromPayment);
  } catch (error) {
    console.error("Membership check failed", error);
    setAuthView(session, "payment_required");
    setStatus("We could not confirm your membership. Please try again.", true);
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
  setStatus(error ? error.message : "Account confirmed. Checking membership.", Boolean(error));
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
  else setStatus("Account created. Complete payment to activate full access.");
});

elements.beginPayment.addEventListener("click", async () => {
  elements.beginPayment.disabled = true;
  setStatus("Opening secure Stripe payment.");
  const amount = Number(elements.rateSlider?.value || 10);
  const session = activeSession;
  if (!session?.access_token) {
    elements.beginPayment.disabled = false;
    setStatus("Sign in before starting membership.", true);
    return;
  }
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${FOUNDING_CHECKOUT_FUNCTION}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.url) {
    elements.beginPayment.disabled = false;
    setStatus(data?.error || "Payment setup is not available yet.", true);
    return;
  }
  window.location.assign(data.url);
});

elements.rateSlider?.addEventListener("input", (event) => {
  const amount = Number(event.currentTarget.value);
  elements.rateValue.textContent = `$${amount} / month`;
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange((event, session) => {
  if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED"].includes(event)) window.setTimeout(() => applySession(session), 0);
});

initialize();
document.documentElement.classList.add("motion-ready");
initScrollMotion();
window.setInterval(() => {
  if (isMember) loadMemberData().catch((error) => console.error("Member refresh failed", error));
  else loadPreview().catch((error) => console.error("Preview refresh failed", error));
}, 60_000);

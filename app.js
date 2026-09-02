const DATA_URL = "data/watchlist.json";

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

function renderLeaders(assets) {
  const leaders = assets.filter((asset) => Number.isFinite(asset.returns?.week)).sort((a, b) => b.returns.week - a.returns.week).slice(0, 3);
  document.querySelector("#leader-grid").innerHTML = leaders.length ? leaders.map((asset, index) => `
    <article class="leader-card"><span class="leader-rank">0${index + 1} / 1W MOVE</span><strong>${asset.symbol}</strong><p class="leader-name">${asset.name}</p><span class="return ${tone(asset.returns.week)}">${percent(asset.returns.week)}</span></article>`).join("") : '<p class="unavailable">Weekly movement is not available.</p>';
}

function renderSectors(sectors, assets) {
  const bySector = new Map(sectors.map((sector) => [sector.id, []]));
  assets.forEach((asset) => bySector.get(asset.sector)?.push(asset));
  document.querySelector("#sector-list").innerHTML = sectors.map((sector, index) => {
    const rows = bySector.get(sector.id) || [];
    return `<details class="sector" ${index === 0 ? "open" : ""}>
      <summary><span class="sector-index">0${index + 1}</span><span class="sector-name">${sector.name}</span><span class="sector-count">${rows.length} ASSETS</span><span class="sector-toggle" aria-hidden="true">+</span></summary>
      <div class="table-wrap"><table><thead><tr><th>Asset</th><th>Price</th><th>1D</th><th>1W</th><th>30D</th><th>Day high</th><th>Day low</th><th>52W high</th><th>52W low</th></tr></thead>
      <tbody>${rows.map((asset) => `<tr><td><div class="asset"><strong>${asset.symbol}</strong><span title="${asset.name}">${asset.name}</span></div></td><td>${money(asset.price, asset.currency)}</td>${returnCell(asset.returns?.day)}${returnCell(asset.returns?.week)}${returnCell(asset.returns?.month)}<td>${money(asset.dayHigh, asset.currency)}</td><td>${money(asset.dayLow, asset.currency)}</td><td>${money(asset.yearHigh, asset.currency)}</td><td>${money(asset.yearLow, asset.currency)}</td></tr>`).join("")}</tbody></table></div>
    </details>`;
  }).join("");
}

function showError() {
  document.querySelector("#market-state").textContent = "Snapshot unavailable";
  document.querySelector("#snapshot-time").textContent = "Please try again shortly";
  document.querySelector("#leader-grid").innerHTML = '<p class="unavailable">Market data could not load.</p>';
  document.querySelector("#sector-list").innerHTML = '<p class="unavailable">The last market snapshot is temporarily unavailable.</p>';
}

async function loadData() {
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const generated = new Date(data.generatedAt);
    document.querySelector("#snapshot-time").textContent = generated.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }) + " ET";
    document.querySelector("#market-state").textContent = data.marketLabel || "Latest market snapshot";
    renderLeaders(data.assets);
    renderSectors(data.sectors, data.assets);
  } catch (error) {
    console.error("Watchlist snapshot failed to load", error);
    showError();
  }
}

loadData();
window.setInterval(loadData, 60_000);

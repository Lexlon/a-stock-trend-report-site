let report = window.__DAILY_STOCK_REPORT__ || {};
let stocks = report.stocks || [];

const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;
const cls = (v) => Number(v || 0) >= 0 ? "up" : "down";
const el = (id) => document.getElementById(id);

function renderHeader() {
  el("generatedAt").textContent = `生成时间 ${report.generatedLabel || "--"}`;
  el("headline").textContent = report.insight?.headline || report.title || "A股趋势股票日报";
  el("marketTone").textContent = report.insight?.marketTone || "暂无策略摘要。";
  const status = report.configStatus || {};
  const bits = [
    status.codexAi ? "Codex AI 已生成" : (status.openai ? "OpenAI 备用已接入" : "等待 Codex AI"),
    status.notify ? "推送已配置" : "推送未配置",
  ];
  el("configStatus").textContent = bits.join(" · ");
  el("configStatus").className = `status-pill ${status.codexAi || status.openai ? "good" : "warn"}`;
}

function renderMetrics() {
  const m = report.market || {};
  const items = [
    ["样本股票", m.sampleCount || 0],
    ["平均涨跌", fmtPct(m.avgPct), cls(m.avgPct)],
    ["上涨 / 下跌", `${m.upCount || 0} / ${m.downCount || 0}`],
    ["站上20日线", m.aboveMa20Count || 0],
  ];
  el("metrics").innerHTML = items.map(([label, value, color]) => `
    <article class="metric">
            <span class="muted">${label}</span>
      <strong class="${color || ""}">${value}</strong>
    </article>
  `).join("");
}

function renderNotes() {
  const opportunities = report.insight?.opportunities?.length ? report.insight.opportunities : ["等待 OpenAI 或历史报告生成更完整的机会列表。"];
  const risks = report.insight?.risks?.length ? report.insight.risks : ["请先配置模型 Key，并保持单只股票风险敞口可控。"];
  el("opportunities").innerHTML = opportunities.map((item) => `<li>${item}</li>`).join("");
  el("risks").innerHTML = risks.map((item) => `<li>${item}</li>`).join("");
}

function sparklineSvg(values, bars) {
  const nums = values.filter((v) => Number.isFinite(Number(v))).map(Number);
  if (nums.length < 2) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const points = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * 100;
    const y = 72 - ((v - min) / span) * 62;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const barItems = (bars || []).slice(-16).map((v, i) => {
    const h = Math.min(30, Math.abs(Number(v || 0)) * 6 + 3);
    const y = Number(v || 0) >= 0 ? 82 - h : 82;
    const color = Number(v || 0) >= 0 ? "#147b55" : "#c63f36";
    return `<rect x="${i * 6.2}" y="${y}" width="3.8" height="${h}" rx="1" fill="${color}" opacity=".62"></rect>`;
  }).join("");
  return `
    <svg viewBox="0 0 100 92" preserveAspectRatio="none" width="100%" height="100%">
      <path d="M0 73 H100" stroke="#dbe2e7" stroke-width="1"></path>
      ${barItems}
      <polyline points="${points}" fill="none" stroke="#286b8f" stroke-width="2.4" vector-effect="non-scaling-stroke"></polyline>
      <circle cx="100" cy="${points.split(" ").at(-1).split(",")[1]}" r="2" fill="#286b8f"></circle>
    </svg>
  `;
}

function renderStocks() {
  el("stockGrid").innerHTML = stocks.map((s) => {
    const trend = Number(s.pctChg || 0) >= 0 ? "up" : "down";
    const summary = s.analysisSummary || `${s.name} 当前价格 ${s.close ?? "--"}，今日涨跌 ${fmtPct(s.pctChg)}，短线动量 ${fmtPct(s.momentum5)}。`;
    return `
      <article class="stock-card">
        <div class="stock-title">
          <div><h4>${s.name}</h4><span class="code">${s.code} · ${s.date || "--"}</span></div>
          <span class="tag ${trend}">${s.advice || "观察"}</span>
        </div>
        <div class="price-row">
          <span class="price">${s.close ?? "--"}</span>
          <span class="pct ${trend}">${fmtPct(s.pctChg)}</span>
        </div>
        <div class="mini-chart">${sparklineSvg(s.sparkline || [], s.bars || [])}</div>
        <div class="fact-grid">
          <div class="fact"><span>成交额</span><b>${s.amountText || "--"}</b></div>
          <div class="fact"><span>量比/换手</span><b>${s.volumeRatio ?? s.turnover ?? "--"}</b></div>
          <div class="fact"><span>趋势</span><b>${s.trendPrediction || "--"}</b></div>
          <div class="fact"><span>${s.volatility20 == null ? "来源" : "20日波动"}</span><b>${s.volatility20 == null ? "Codex" : fmtPct(s.volatility20)}</b></div>
        </div>
        <p class="summary">${summary}</p>
      </article>
    `;
  }).join("");
}

function renderWatchlist() {
  const items = report.insight?.watchlist?.length ? report.insight.watchlist : stocks.map((s) => `${s.name}：观察 ${s.ma20 ? "20日均线" : "关键均线"} 与成交额变化。`);
  el("watchlist").innerHTML = items.slice(0, 5).map((item, index) => `
    <div class="timeline-item"><b>0${index + 1}</b>${item}</div>
  `).join("");
}

function drawHeroChart() {
  const canvas = el("heroChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#dbe2e7";
  ctx.lineWidth = 1;
  for (let x = 40; x < w; x += 70) {
    ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h - 40); ctx.stroke();
  }
  for (let y = 40; y < h; y += 54) {
    ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(w - 20, y); ctx.stroke();
  }
  const palette = ["#286b8f", "#147b55", "#c63f36", "#a76d1f", "#172026"];
  const hasLines = stocks.some((s) => (s.sparkline || []).length > 1);
  if (!hasLines) {
    ctx.font = "16px system-ui";
    const maxPct = Math.max(...stocks.slice(0, 8).map((s) => Math.abs(Number(s.pctChg || 0))), 1);
    stocks.slice(0, 8).forEach((s, idx) => {
      const y = 42 + idx * 34;
      const pct = Number(s.pctChg || 0);
      const barW = Math.max(18, Math.abs(pct) / maxPct * (w - 210));
      const color = pct >= 0 ? "#147b55" : "#c63f36";
      ctx.fillStyle = "#172026";
      ctx.fillText(`${s.name}`, 42, y + 14);
      ctx.fillStyle = color;
      ctx.fillRect(150, y, barW, 18);
      ctx.fillStyle = color;
      ctx.fillText(`${fmtPct(pct)}`, 160 + barW, y + 14);
    });
    ctx.fillStyle = "#63707a";
    ctx.font = "14px system-ui";
    ctx.fillText("趋势候选涨跌幅与主题强度", 42, h - 18);
    return;
  }
  stocks.slice(0, 5).forEach((s, idx) => {
    const nums = (s.sparkline || []).filter((v) => Number.isFinite(Number(v))).map(Number);
    if (nums.length < 2) return;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = max - min || 1;
    ctx.beginPath();
    nums.forEach((v, i) => {
      const x = 42 + (i / (nums.length - 1)) * (w - 90);
      const y = 270 - ((v - min) / span) * 190 + idx * 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = palette[idx % palette.length];
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = palette[idx % palette.length];
    ctx.fillText(`${s.name} ${fmtPct(s.pctChg)}`, 42, 28 + idx * 22);
  });
  ctx.fillStyle = "#63707a";
  ctx.font = "14px system-ui";
  ctx.fillText("趋势候选近期开盘后的价格路径", 42, h - 18);
}

async function loadFreshReport() {
  try {
    const response = await fetch(`./report-data.json?v=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      report = await response.json();
      stocks = report.stocks || [];
    }
  } catch (error) {
    console.warn("Using embedded report data", error);
  }
}

async function boot() {
  await loadFreshReport();
  renderHeader();
  renderMetrics();
  renderNotes();
  renderStocks();
  renderWatchlist();
  drawHeroChart();
}

boot();

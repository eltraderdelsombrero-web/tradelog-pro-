
import { useState, useEffect, useRef, useCallback } from "react";

// ─── PALETTE & CONSTANTS ────────────────────────────────────────────────────
const C = {
  bg: "#080c12",
  surface: "#0d1420",
  card: "#111827",
  border: "#1e2d42",
  accent: "#00d4ff",
  green: "#00e87a",
  red: "#ff3d5a",
  yellow: "#ffd600",
  purple: "#b46ef5",
  text: "#e2e8f0",
  muted: "#4a5568",
  dim: "#2d3748",
};

const SETUPS = ["Breakout", "Reversal", "Trend Follow", "Scalp", "News Play", "Support/Resistance", "EMA Cross", "VWAP Bounce", "Opening Range", "Gap Fill"];
const ASSETS = ["EUR/USD", "GBP/USD", "BTC/USD", "ETH/USD", "NQ", "ES", "SPY", "AAPL", "TSLA", "GOLD", "OIL", "DXY", "Otro"];
const TFS = ["1m","3m","5m","15m","30m","1h","4h","1D","1W"];
const ERRORS = ["Sin error", "FOMO", "Revenge trade", "Overtrade", "Salida temprana", "Stop movido", "Sin plan", "Tamaño excesivo", "Entrada anticipada", "Ignoré setup"];
const MARKET = ["Trending alcista", "Trending bajista", "Rango estrecho", "Rango amplio", "Alta volatilidad", "Baja volatilidad", "Pre-news", "Post-news"];
const DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ─── CHART: EQUITY CURVE ────────────────────────────────────────────────────
function EquityCurve({ trades, startBalance }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    let points = [{ x: 0, y: startBalance }];
    let bal = startBalance;
    [...trades].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((t, i) => {
      bal += t.pnlUsd || 0;
      points.push({ x: i + 1, y: bal });
    });

    if (points.length < 2) {
      ctx.fillStyle = C.muted;
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Sin operaciones aún", W / 2, H / 2);
      return;
    }

    const minY = Math.min(...points.map(p => p.y)) * 0.99;
    const maxY = Math.max(...points.map(p => p.y)) * 1.01;
    const toX = i => 40 + (i / (points.length - 1)) * (W - 60);
    const toY = y => H - 30 - ((y - minY) / (maxY - minY)) * (H - 50);

    // Grid
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = 10 + (i / 4) * (H - 40);
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 10, y); ctx.stroke();
      const val = maxY - (i / 4) * (maxY - minY);
      ctx.fillStyle = C.muted; ctx.font = "10px monospace"; ctx.textAlign = "right";
      ctx.fillText("$" + val.toFixed(0), 36, y + 4);
    }

    // Fill gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(0,212,255,0.18)");
    grad.addColorStop(1, "rgba(0,212,255,0.01)");
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(points[0].y));
    points.forEach((p, i) => ctx.lineTo(toX(i), toY(p.y)));
    ctx.lineTo(toX(points.length - 1), H - 30);
    ctx.lineTo(toX(0), H - 30);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.accent;
    ctx.shadowBlur = 8;
    points.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p.y)) : ctx.lineTo(toX(i), toY(p.y)));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots on last
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(toX(points.length - 1), toY(last.y), 4, 0, Math.PI * 2);
    ctx.fillStyle = C.accent;
    ctx.fill();
  }, [trades, startBalance]);

  return <canvas ref={canvasRef} width={680} height={160} style={{ width: "100%", height: 160 }} />;
}

// ─── MINI BAR CHART ─────────────────────────────────────────────────────────
function BarChart({ data, color = C.accent, label = "" }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 0.01);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>}
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 60, fontSize: 11, color: C.muted, textAlign: "right", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 18, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(Math.abs(d.value) / max) * 100}%`,
              background: d.value >= 0 ? C.green : C.red,
              borderRadius: 3,
              transition: "width 0.6s ease",
              display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4
            }}>
              <span style={{ fontSize: 10, color: "#000", fontWeight: 700 }}>{d.value > 0 ? "+" : ""}{typeof d.value === "number" ? d.value.toFixed(1) : d.value}</span>
            </div>
          </div>
          <div style={{ width: 40, fontSize: 11, color: C.text, textAlign: "right" }}>{d.extra ?? ""}</div>
        </div>
      ))}
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.text, icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
      <div style={{ color, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

// ─── BADGE ──────────────────────────────────────────────────────────────────
function Badge({ text, color = C.accent }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{text}</span>;
}

// ─── TAG INPUT / SELECT ─────────────────────────────────────────────────────
const inputStyle = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ color: C.muted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function TradingJournal() {
  const [tab, setTab] = useState("dashboard");
  const [trades, setTrades] = useState(() => load("tj_trades", []));
  const [settings, setSettings] = useState(() => load("tj_settings", { balance: 10000, riskPct: 1 }));
  const [form, setForm] = useState(getEmptyForm());
  const [editId, setEditId] = useState(null);
  const [aiMsg, setAiMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [filterSetup, setFilterSetup] = useState("Todos");
  const [imgPreview, setImgPreview] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => { save("tj_trades", trades); }, [trades]);
  useEffect(() => { save("tj_settings", settings); }, [settings]);

  function getEmptyForm() {
    return {
      date: new Date().toISOString().slice(0, 16),
      asset: "EUR/USD", tf: "1h", type: "Buy",
      entry: "", sl: "", tp: "", pnlR: "", pnlUsd: "", riskPct: 1,
      setup: "Breakout", market: "Trending alcista", notes: "",
      image: null, emotion: 7, followedRules: true, error: "Sin error"
    };
  }

  function notify(msg, color = C.green) {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 3000);
  }

  // ── METRICS ──────────────────────────────────────────────────────────────
  const closedTrades = trades.filter(t => t.pnlUsd !== "" && t.pnlUsd !== null && t.pnlUsd !== undefined);
  const wins = closedTrades.filter(t => t.pnlUsd > 0);
  const losses = closedTrades.filter(t => t.pnlUsd < 0);
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnlUsd || 0), 0);
  const currentBalance = settings.balance + totalPnl;
  const winrate = closedTrades.length ? (wins.length / closedTrades.length * 100).toFixed(1) : "0.0";
  const grossWin = wins.reduce((s, t) => s + t.pnlUsd, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlUsd, 0));
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : grossWin > 0 ? "∞" : "0.00";
  const avgR = closedTrades.length ? (closedTrades.reduce((s, t) => s + (parseFloat(t.pnlR) || 0), 0) / closedTrades.length).toFixed(2) : "0.00";

  // Drawdown
  let peak = settings.balance, bal = settings.balance, maxDD = 0;
  [...trades].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => {
    bal += t.pnlUsd || 0;
    if (bal > peak) peak = bal;
    const dd = ((peak - bal) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  });

  // Stats by setup
  const setupStats = SETUPS.map(s => {
    const ts = closedTrades.filter(t => t.setup === s);
    const w = ts.filter(t => t.pnlUsd > 0).length;
    const pnl = ts.reduce((a, t) => a + t.pnlUsd, 0);
    return { setup: s, count: ts.length, wr: ts.length ? (w / ts.length * 100).toFixed(0) : 0, pnl };
  }).filter(s => s.count > 0).sort((a, b) => b.pnl - a.pnl);

  // Stats by hour
  const hourStats = {};
  closedTrades.forEach(t => {
    const h = new Date(t.date).getHours();
    if (!hourStats[h]) hourStats[h] = { wins: 0, total: 0 };
    hourStats[h].total++;
    if (t.pnlUsd > 0) hourStats[h].wins++;
  });
  const bestHour = Object.entries(hourStats).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

  // Stats by day
  const dayStats = Array(7).fill(null).map((_, i) => {
    const ts = closedTrades.filter(t => new Date(t.date).getDay() === i);
    const w = ts.filter(t => t.pnlUsd > 0).length;
    return { label: DAYS[i], value: ts.length ? parseFloat(((w / ts.length) * 100).toFixed(1)) : 0, extra: `${ts.length}op` };
  });

  // Stats by asset
  const assetStats = ASSETS.map(a => {
    const ts = closedTrades.filter(t => t.asset === a);
    const pnl = ts.reduce((s, t) => s + t.pnlUsd, 0);
    return { label: a, value: parseFloat(pnl.toFixed(1)), extra: ts.length > 0 ? `${ts.length}op` : "" };
  }).filter(a => a.extra !== "").sort((a, b) => b.value - a.value);

  // Psychology
  const avgEmotion = closedTrades.length ? (closedTrades.reduce((s, t) => s + (t.emotion || 5), 0) / closedTrades.length).toFixed(1) : "—";
  const ruleFollowPct = closedTrades.length ? (closedTrades.filter(t => t.followedRules).length / closedTrades.length * 100).toFixed(0) : "0";
  const errorCount = {};
  closedTrades.forEach(t => { errorCount[t.error] = (errorCount[t.error] || 0) + 1; });
  const topErrors = Object.entries(errorCount).filter(([k]) => k !== "Sin error").sort((a, b) => b[1] - a[1]).slice(0, 4);

  // ── FORM HANDLERS ────────────────────────────────────────────────────────
  function handleSave() {
    if (!form.asset || !form.date) return notify("Completa los campos requeridos", C.red);
    const trade = { ...form, id: editId || Date.now(), pnlUsd: parseFloat(form.pnlUsd) || 0, pnlR: parseFloat(form.pnlR) || 0 };
    if (editId) {
      setTrades(prev => prev.map(t => t.id === editId ? trade : t));
      setEditId(null);
    } else {
      setTrades(prev => [...prev, trade]);
    }
    setForm(getEmptyForm());
    setImgPreview(null);
    setShowFormModal(false);
    notify(editId ? "Operación actualizada ✓" : "Operación registrada ✓");
  }

  function handleEdit(trade) {
    setForm({ ...trade });
    setEditId(trade.id);
    setImgPreview(trade.image || null);
    setShowFormModal(true);
  }

  function handleDelete(id) {
    setTrades(prev => prev.filter(t => t.id !== id));
    notify("Operación eliminada", C.yellow);
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setForm(f => ({ ...f, image: ev.target.result })); setImgPreview(ev.target.result); };
    reader.readAsDataURL(file);
  }

  // ── AI ANALYSIS ──────────────────────────────────────────────────────────
  async function runAI() {
    if (closedTrades.length < 2) return notify("Necesitas al menos 2 operaciones cerradas para el análisis", C.yellow);
    setAiLoading(true);
    setAiMsg("");
    setTab("ai");
    try {
      const summary = {
        totalTrades: closedTrades.length,
        winrate: winrate + "%",
        profitFactor,
        avgR,
        maxDrawdown: maxDD.toFixed(2) + "%",
        totalPnl: totalPnl.toFixed(2),
        topSetups: setupStats.slice(0, 3).map(s => ({ setup: s.setup, wr: s.wr + "%", pnl: s.pnl.toFixed(0) })),
        worstSetups: setupStats.slice(-2).map(s => ({ setup: s.setup, wr: s.wr + "%", pnl: s.pnl.toFixed(0) })),
        bestDay: dayStats.reduce((best, d) => d.value > best.value ? d : best, dayStats[0]),
        worstDay: dayStats.reduce((worst, d) => d.value < worst.value ? d : worst, dayStats[0]),
        avgEmotion,
        ruleFollowPct: ruleFollowPct + "%",
        topErrors: topErrors.map(([e, c]) => e + " x" + c),
        recentTrades: closedTrades.slice(-10).map(t => ({
          date: t.date, asset: t.asset, setup: t.setup, pnlR: t.pnlR, pnlUsd: t.pnlUsd,
          emotion: t.emotion, followedRules: t.followedRules, error: t.error
        }))
      };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Eres un coach de trading profesional con experiencia en psicología del trading y análisis estadístico. 
Analiza los datos de la bitácora de un trader y proporciona recomendaciones concretas, accionables y personalizadas.
Responde en español. Usa emojis para mejorar la legibilidad. Sé directo y específico. 
Estructura: 1) Resumen del rendimiento (2-3 líneas) 2) 3 fortalezas detectadas 3) 3 áreas críticas de mejora con acciones concretas 4) Recomendación psicológica 5) Plan de acción para la próxima semana.`,
          messages: [{ role: "user", content: `Analiza estos datos de mi bitácora de trading y dame recomendaciones personalizadas:\n\n${JSON.stringify(summary, null, 2)}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("\n") || "Sin respuesta";
      setAiMsg(text);
    } catch (e) {
      setAiMsg("⚠️ Error al conectar con la IA. Verifica tu conexión.");
    }
    setAiLoading(false);
  }

  // ── TABS ─────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "trades", label: "Operaciones", icon: "≡" },
    { id: "stats", label: "Estadísticas", icon: "▲" },
    { id: "psychology", label: "Psicología", icon: "◎" },
    { id: "ai", label: "IA Coach", icon: "✦" },
    { id: "settings", label: "Config", icon: "⚙" },
  ];

  const filteredTrades = filterSetup === "Todos" ? trades : trades.filter(t => t.setup === filterSetup);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input, select, textarea { font-family: 'JetBrains Mono', monospace !important; }
        input:focus, select:focus, textarea:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 2px ${C.accent}22 !important; }
        .tab-btn:hover { background: ${C.dim} !important; }
        .trade-row:hover { background: ${C.dim} !important; cursor: pointer; }
        .btn-primary { background: ${C.accent}; color: #000; border: none; border-radius: 8px; padding: "10px 20px"; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 13px; transition: opacity 0.2s; }
        .btn-primary:hover { opacity: 0.85; }
        .btn-danger { background: ${C.red}22; color: ${C.red}; border: 1px solid ${C.red}44; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; }
        .btn-edit { background: ${C.accent}22; color: ${C.accent}; border: 1px solid ${C.accent}44; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .fade-in { animation: fadeIn 0.3s ease; }
        .ai-prose { line-height: 1.7; white-space: pre-wrap; font-family: 'Space Grotesk', sans-serif; font-size: 14px; }
      `}</style>

      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: notification.color + "22", border: `1px solid ${notification.color}`, color: notification.color, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, backdropFilter: "blur(8px)" }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>◈</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.5 }}>TradeLog <span style={{ color: C.accent }}>Pro</span></div>
            <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2 }}>PROFESSIONAL TRADING JOURNAL</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map(t => (
            <button key={t.id} className="tab-btn"
              onClick={() => setTab(t.id)}
              style={{ background: tab === t.id ? C.accent + "22" : "transparent", color: tab === t.id ? C.accent : C.muted, border: `1px solid ${tab === t.id ? C.accent + "44" : "transparent"}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
              <span>{t.icon}</span><span style={{ display: window.innerWidth < 768 ? "none" : "inline" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── DASHBOARD ────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Dashboard</h2>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{closedTrades.length} operaciones registradas</div>
              </div>
              <button className="btn-primary" onClick={() => { setEditId(null); setForm(getEmptyForm()); setImgPreview(null); setShowFormModal(true); }}
                style={{ padding: "10px 20px", fontSize: 13, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                ＋ Nueva Operación
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <StatCard label="Balance" value={"$" + currentBalance.toLocaleString("en", { maximumFractionDigits: 0 })} sub={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(0)} total P&L`} color={totalPnl >= 0 ? C.green : C.red} icon="💰" />
              <StatCard label="Winrate" value={winrate + "%"} sub={`${wins.length}W / ${losses.length}L`} color={parseFloat(winrate) >= 50 ? C.green : C.red} icon="🎯" />
              <StatCard label="Profit Factor" value={profitFactor} sub={`Gross win: $${grossWin.toFixed(0)}`} color={parseFloat(profitFactor) >= 1.5 ? C.green : C.yellow} icon="⚡" />
              <StatCard label="Max Drawdown" value={maxDD.toFixed(1) + "%"} sub={`Peak: $${(settings.balance + Math.max(...[settings.balance, ...closedTrades.map((_, i, a) => settings.balance + a.slice(0, i + 1).reduce((s, t) => s + t.pnlUsd, 0))])).toLocaleString()}`} color={maxDD > 10 ? C.red : maxDD > 5 ? C.yellow : C.green} icon="📉" />
              <StatCard label="Avg R" value={avgR + "R"} sub={`${closedTrades.length} ops cerradas`} color={parseFloat(avgR) > 0 ? C.green : C.red} icon="📊" />
              <StatCard label="Psicología" value={avgEmotion + "/10"} sub={`${ruleFollowPct}% siguió reglas`} color={parseFloat(avgEmotion) >= 7 ? C.green : C.yellow} icon="🧠" />
            </div>

            {/* Equity Curve */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Equity Curve</div>
              <EquityCurve trades={closedTrades} startBalance={settings.balance} />
            </div>

            {/* Recent trades */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Últimas 5 operaciones</div>
              {trades.length === 0 ? (
                <div style={{ textAlign: "center", color: C.muted, padding: "30px 0", fontSize: 13 }}>
                  Sin operaciones. ¡Registra tu primer trade!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...trades].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(t => (
                    <div key={t.id} className="trade-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
                      <Badge text={t.type} color={t.type === "Buy" ? C.green : C.red} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{t.asset}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}>{t.tf}</span>
                      <Badge text={t.setup} color={C.purple} />
                      <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ color: C.muted, fontSize: 11 }}>{new Date(t.date).toLocaleDateString("es")}</span>
                        <span style={{ color: t.pnlUsd >= 0 ? C.green : C.red, fontWeight: 700, fontSize: 14 }}>
                          {t.pnlUsd >= 0 ? "+" : ""}${t.pnlUsd?.toFixed(0)}
                        </span>
                        <span style={{ color: C.muted, fontSize: 12 }}>{t.pnlR > 0 ? "+" : ""}{t.pnlR}R</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TRADES LOG ───────────────────────────────────────────────── */}
        {tab === "trades" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Operaciones</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select value={filterSetup} onChange={e => setFilterSetup(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "7px 12px" }}>
                  <option>Todos</option>
                  {SETUPS.map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="btn-primary" onClick={() => { setEditId(null); setForm(getEmptyForm()); setImgPreview(null); setShowFormModal(true); }} style={{ padding: "8px 18px", fontSize: 13, borderRadius: 8 }}>
                  ＋ Nuevo Trade
                </button>
              </div>
            </div>

            {filteredTrades.length === 0 ? (
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "60px 20px", textAlign: "center", color: C.muted }}>
                Sin operaciones registradas
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...filteredTrades].sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => (
                  <div key={t.id} className="trade-row" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", borderLeft: `3px solid ${t.pnlUsd >= 0 ? C.green : C.red}` }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge text={t.type} color={t.type === "Buy" ? C.green : C.red} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{t.asset}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}>{t.tf}</span>
                      <Badge text={t.setup} color={C.purple} />
                      <Badge text={t.market} color={C.yellow} />
                      <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: t.pnlUsd >= 0 ? C.green : C.red, fontWeight: 700, fontSize: 16 }}>
                            {t.pnlUsd >= 0 ? "+" : ""}${t.pnlUsd?.toFixed(2)}
                          </div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{t.pnlR > 0 ? "+" : ""}{t.pnlR}R</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: t.emotion >= 7 ? C.green : t.emotion >= 5 ? C.yellow : C.red }}>😐 {t.emotion}/10</div>
                          <div style={{ fontSize: 11, color: t.followedRules ? C.green : C.red }}>{t.followedRules ? "✓ Reglas" : "✗ Sin reglas"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn-edit" onClick={() => handleEdit(t)}>Editar</button>
                          <button className="btn-danger" onClick={() => handleDelete(t.id)}>✕</button>
                        </div>
                      </div>
                    </div>
                    {t.notes && <div style={{ color: C.muted, fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>📝 {t.notes}</div>}
                    {t.image && (
                      <div style={{ marginTop: 8 }}>
                        <img src={t.image} alt="trade" style={{ maxWidth: 200, borderRadius: 6, border: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => window.open(t.image)} />
                      </div>
                    )}
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
                      {new Date(t.date).toLocaleString("es")} · E: {t.entry} · SL: {t.sl} · TP: {t.tp} · Riesgo: {t.riskPct}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STATS ────────────────────────────────────────────────────── */}
        {tab === "stats" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Estadísticas</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <BarChart label="Rendimiento por Setup (P&L)" data={setupStats.map(s => ({ label: s.setup.substring(0, 12), value: parseFloat(s.pnl.toFixed(1)), extra: s.wr + "%" }))} />
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <BarChart label="Winrate por Día" data={dayStats} />
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <BarChart label="P&L por Activo" data={assetStats} />
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Resumen de Setups</div>
                {setupStats.length === 0 ? <div style={{ color: C.muted, fontSize: 12 }}>Sin datos</div> : setupStats.map(s => (
                  <div key={s.setup} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                    <span style={{ color: C.text }}>{s.setup}</span>
                    <span style={{ color: C.muted }}>{s.count} ops</span>
                    <span style={{ color: parseFloat(s.wr) >= 50 ? C.green : C.red }}>{s.wr}% WR</span>
                    <span style={{ color: s.pnl >= 0 ? C.green : C.red }}>{s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
            {bestHour && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Mejor Horario</div>
                  <div style={{ color: C.accent, fontSize: 28, fontWeight: 700, marginTop: 6 }}>{bestHour[0]}:00</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{(bestHour[1].wins / bestHour[1].total * 100).toFixed(0)}% WR</div>
                </div>
                <div style={{ width: 1, background: C.border }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Mejor Día</div>
                  <div style={{ color: C.green, fontSize: 28, fontWeight: 700, marginTop: 6 }}>{dayStats.reduce((b, d) => d.value > b.value ? d : b, dayStats[0]).label}</div>
                </div>
                <div style={{ width: 1, background: C.border }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Mejor Setup</div>
                  <div style={{ color: C.purple, fontSize: 18, fontWeight: 700, marginTop: 6 }}>{setupStats[0]?.setup ?? "—"}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>${setupStats[0]?.pnl.toFixed(0)} P&L</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PSYCHOLOGY ───────────────────────────────────────────────── */}
        {tab === "psychology" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Psicología del Trading</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <StatCard label="Nivel Emocional Avg" value={avgEmotion + "/10"} color={parseFloat(avgEmotion) >= 7 ? C.green : C.yellow} icon="🧘" />
              <StatCard label="Siguió Reglas" value={ruleFollowPct + "%"} sub={`${closedTrades.filter(t => t.followedRules).length} de ${closedTrades.length}`} color={parseFloat(ruleFollowPct) >= 80 ? C.green : C.red} icon="📋" />
              <StatCard label="Trades sin Error" value={(closedTrades.filter(t => t.error === "Sin error").length)} sub="operaciones limpias" color={C.accent} icon="✅" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Errores Más Frecuentes</div>
                {topErrors.length === 0 ? <div style={{ color: C.muted, fontSize: 12 }}>Sin errores registrados 🎉</div> : topErrors.map(([err, cnt]) => (
                  <div key={err} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 13 }}>{err}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 4, width: cnt * 16, background: C.red, borderRadius: 2 }} />
                      <span style={{ color: C.red, fontWeight: 700 }}>{cnt}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Emoción vs Resultado</div>
                {[...Array(10)].map((_, i) => {
                  const lvl = 10 - i;
                  const ts = closedTrades.filter(t => t.emotion === lvl);
                  const pnl = ts.reduce((s, t) => s + t.pnlUsd, 0);
                  return ts.length > 0 ? (
                    <div key={lvl} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, fontSize: 12 }}>
                      <span style={{ width: 30, color: C.muted }}>Nv.{lvl}</span>
                      <div style={{ flex: 1, height: 14, background: C.border, borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${(ts.length / closedTrades.length) * 100}%`, background: pnl >= 0 ? C.green : C.red, borderRadius: 2 }} />
                      </div>
                      <span style={{ color: pnl >= 0 ? C.green : C.red, width: 55, textAlign: "right" }}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── AI COACH ─────────────────────────────────────────────────── */}
        {tab === "ai" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>✦ IA Coach</h2>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Análisis personalizado de tu rendimiento</div>
              </div>
              <button className="btn-primary" onClick={runAI} disabled={aiLoading} style={{ padding: "10px 22px", fontSize: 13, borderRadius: 8, opacity: aiLoading ? 0.7 : 1 }}>
                {aiLoading ? "Analizando..." : "▶ Analizar Ahora"}
              </button>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, minHeight: 300 }}>
              {aiLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 16 }}>
                  <div style={{ width: 44, height: 44, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ color: C.muted, fontSize: 13, animation: "pulse 1.5s ease infinite" }}>La IA está analizando tus datos...</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
              )}
              {!aiLoading && !aiMsg && (
                <div style={{ textAlign: "center", color: C.muted, paddingTop: 60 }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
                  <div style={{ fontSize: 14 }}>Haz clic en "Analizar Ahora" para obtener recomendaciones personalizadas de tu IA Coach</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>Necesitas al menos 2 operaciones cerradas</div>
                </div>
              )}
              {aiMsg && !aiLoading && (
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
                    <div style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Análisis de IA Coach</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Basado en {closedTrades.length} operaciones</div>
                    </div>
                  </div>
                  <div className="ai-prose" style={{ color: C.text }}>{aiMsg}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Configuración</h2>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Balance Inicial ($)">
                <input type="number" value={settings.balance} onChange={e => setSettings(s => ({ ...s, balance: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
              </Field>
              <Field label="Riesgo por defecto (%)">
                <input type="number" step="0.1" value={settings.riskPct} onChange={e => setSettings(s => ({ ...s, riskPct: parseFloat(e.target.value) || 1 }))} style={inputStyle} />
              </Field>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Zona de Peligro</div>
                <button onClick={() => { if (window.confirm("¿Eliminar todas las operaciones?")) { setTrades([]); notify("Datos eliminados", C.red); } }}
                  style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  ⚠ Borrar todos los datos
                </button>
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Estadísticas de la cuenta</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                {[["Total operaciones", trades.length], ["Cerradas", closedTrades.length], ["Balance actual", "$" + currentBalance.toFixed(2)], ["Winrate", winrate + "%"], ["Profit Factor", profitFactor], ["Max Drawdown", maxDD.toFixed(2) + "%"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FORM MODAL ───────────────────────────────────────────────────── */}
      {showFormModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && setShowFormModal(false)}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{editId ? "Editar" : "Nueva"} Operación</div>
              <button onClick={() => setShowFormModal(false)} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <Field label="Fecha"><input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Activo">
                <select value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} style={inputStyle}>
                  {ASSETS.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Temporalidad">
                <select value={form.tf} onChange={e => setForm(f => ({ ...f, tf: e.target.value }))} style={inputStyle}>
                  {TFS.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tipo">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, color: form.type === "Buy" ? C.green : C.red }}>
                  <option>Buy</option>
                  <option>Sell</option>
                </select>
              </Field>
            </div>

            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <Field label="Entrada"><input type="number" step="any" placeholder="0.00" value={form.entry} onChange={e => setForm(f => ({ ...f, entry: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Stop Loss"><input type="number" step="any" placeholder="0.00" value={form.sl} onChange={e => setForm(f => ({ ...f, sl: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Take Profit"><input type="number" step="any" placeholder="0.00" value={form.tp} onChange={e => setForm(f => ({ ...f, tp: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Riesgo (%)"><input type="number" step="0.1" value={form.riskPct} onChange={e => setForm(f => ({ ...f, riskPct: parseFloat(e.target.value) }))} style={inputStyle} /></Field>
            </div>

            {/* Row 3 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <Field label="Resultado (R)"><input type="number" step="0.01" placeholder="1.5" value={form.pnlR} onChange={e => setForm(f => ({ ...f, pnlR: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Resultado ($)"><input type="number" step="0.01" placeholder="150.00" value={form.pnlUsd} onChange={e => setForm(f => ({ ...f, pnlUsd: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Setup">
                <select value={form.setup} onChange={e => setForm(f => ({ ...f, setup: e.target.value }))} style={inputStyle}>
                  {SETUPS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Condiciones">
                <select value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))} style={inputStyle}>
                  {MARKET.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            {/* Psychology row */}
            <div style={{ background: C.surface, borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label={`Nivel Emocional: ${form.emotion}/10`}>
                <input type="range" min="1" max="10" value={form.emotion} onChange={e => setForm(f => ({ ...f, emotion: parseInt(e.target.value) }))}
                  style={{ width: "100%", accentColor: form.emotion >= 7 ? C.green : form.emotion >= 5 ? C.yellow : C.red }} />
              </Field>
              <Field label="¿Siguió Reglas?">
                <select value={form.followedRules ? "si" : "no"} onChange={e => setForm(f => ({ ...f, followedRules: e.target.value === "si" }))} style={{ ...inputStyle, color: form.followedRules ? C.green : C.red }}>
                  <option value="si">✓ Sí</option>
                  <option value="no">✗ No</option>
                </select>
              </Field>
              <Field label="Tipo de Error">
                <select value={form.error} onChange={e => setForm(f => ({ ...f, error: e.target.value }))} style={inputStyle}>
                  {ERRORS.map(e => <option key={e}>{e}</option>)}
                </select>
              </Field>
            </div>

            {/* Notes & Image */}
            <Field label="Notas">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Describe tu análisis, qué viste, qué aprendiste..." style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <Field label="Imagen del Trade">
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <label style={{ background: C.dim, border: `1px dashed ${C.border}`, borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 12, color: C.muted, flexShrink: 0 }}>
                  📎 Subir imagen
                  <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                </label>
                {imgPreview && <img src={imgPreview} alt="preview" style={{ height: 60, borderRadius: 6, border: `1px solid ${C.border}` }} />}
              </div>
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
              <button onClick={() => setShowFormModal(false)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSave} style={{ padding: "10px 24px", fontSize: 13, borderRadius: 8 }}>
                {editId ? "Actualizar" : "Guardar"} Operación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://oxhjkoqgqzhldueaaoke.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aGprb3FncXpobGR1ZWFhb2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzYwMTQsImV4cCI6MjA5MTE1MjAxNH0.cVPCluJWslzkdeDtiacN_XausNWzS1Nk6KNs8zjGmaI";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const C = { bg:"#080c12",surface:"#0d1420",card:"#111827",border:"#1e2d42",accent:"#00d4ff",green:"#00e87a",red:"#ff3d5a",yellow:"#ffd600",purple:"#b46ef5",text:"#e2e8f0",muted:"#4a5568",dim:"#2d3748" };
const SETUPS = ["Breakout","Reversal","Trend Follow","Scalp","News Play","Support/Resistance","EMA Cross","VWAP Bounce","Opening Range","Gap Fill"];
const ASSETS = ["EUR/USD","GBP/USD","BTC/USD","ETH/USD","NQ","ES","SPY","AAPL","TSLA","GOLD","OIL","DXY","Otro"];
const TFS = ["1m","3m","5m","15m","30m","1h","4h","1D","1W"];
const ERRORS = ["Sin error","FOMO","Revenge trade","Overtrade","Salida temprana","Stop movido","Sin plan","Tamano excesivo","Entrada anticipada","Ignore setup"];
const MARKET = ["Trending alcista","Trending bajista","Rango estrecho","Rango amplio","Alta volatilidad","Baja volatilidad","Pre-news","Post-news"];
const DAYS = ["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];
const TIME_OPTIONS = ["Todo","Hoy","Semana","Mes","3 Meses","6 Meses","Este Anio"];
const iS = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"8px 12px", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none", fontFamily:"inherit" };

function Field({ label, children }) {
  return <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    <label style={{ color:C.muted, fontSize:11, letterSpacing:1, textTransform:"uppercase" }}>{label}</label>
    {children}
  </div>;
}
function Badge({ text, color=C.accent }) {
  return <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{text}</span>;
}
function StatCard({ label, value, sub, color=C.text, icon }) {
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 20px", display:"flex", flexDirection:"column", gap:4 }}>
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      <span style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>{label}</span>
      {icon && <span>{icon}</span>}
    </div>
    <div style={{ color, fontSize:26, fontWeight:700, fontFamily:"monospace" }}>{value}</div>
    {sub && <div style={{ color:C.muted, fontSize:11 }}>{sub}</div>}
  </div>;
}

function EquityCurve({ trades, startBalance }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    let pts = [{ y: startBalance }], b = startBalance;
    [...trades].sort((a, x) => new Date(a.date) - new Date(x.date)).forEach(t => { b += t.pnl_usd || 0; pts.push({ y: b }); });
    if (pts.length < 2) { ctx.fillStyle = C.muted; ctx.font = "13px monospace"; ctx.textAlign = "center"; ctx.fillText("Sin operaciones", W / 2, H / 2); return; }
    const mn = Math.min(...pts.map(p => p.y)) * 0.99, mx = Math.max(...pts.map(p => p.y)) * 1.01;
    const tx = i => 40 + (i / (pts.length - 1)) * (W - 60), ty = y => H - 30 - ((y - mn) / (mx - mn)) * (H - 50);
    ctx.strokeStyle = C.border; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) { const y = 10 + (i / 4) * (H - 40); ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 10, y); ctx.stroke(); ctx.fillStyle = C.muted; ctx.font = "10px monospace"; ctx.textAlign = "right"; ctx.fillText("$" + (mx - (i / 4) * (mx - mn)).toFixed(0), 36, y + 4); }
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,212,255,0.18)"); g.addColorStop(1, "rgba(0,212,255,0.01)");
    ctx.beginPath(); ctx.moveTo(tx(0), ty(pts[0].y)); pts.forEach((p, i) => ctx.lineTo(tx(i), ty(p.y))); ctx.lineTo(tx(pts.length - 1), H - 30); ctx.lineTo(tx(0), H - 30); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.shadowColor = C.accent; ctx.shadowBlur = 8;
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(i), ty(p.y)) : ctx.lineTo(tx(i), ty(p.y))); ctx.stroke(); ctx.shadowBlur = 0;
  }, [trades, startBalance]);
  return <canvas ref={ref} width={680} height={160} style={{ width:"100%", height:160 }} />;
}

function BarChart({ data, label }) {
  const mx = Math.max(...data.map(d => Math.abs(d.value)), 0.01);
  return <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <div style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>{label}</div>}
    {data.map((d, i) => <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ width:60, fontSize:11, color:C.muted, textAlign:"right", flexShrink:0 }}>{d.label}</div>
      <div style={{ flex:1, height:18, background:C.border, borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${(Math.abs(d.value) / mx) * 100}%`, background:d.value >= 0 ? C.green : C.red, borderRadius:3 }} />
      </div>
      <div style={{ width:40, fontSize:11, color:C.text, textAlign:"right" }}>{d.extra}</div>
    </div>)}
  </div>;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [name, setName] = useState("");
  const [loading, setLoading] = useState(false), [err, setErr] = useState(""), [ok, setOk] = useState("");

  async function go() {
    setErr(""); setOk(""); setLoading(true);
    try {
      if (mode === "login") { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; onAuth(data.user); }
      else if (mode === "register") { const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }); if (error) throw error; setOk("Cuenta creada! Revisa tu email."); setMode("login"); }
      else { const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) throw error; setOk("Email enviado!"); }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:"'JetBrains Mono',monospace" }}>
      <style>{"*{box-sizing:border-box;}input:focus{border-color:#00d4ff!important;outline:none;}@keyframes fi{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}"}</style>
      <div style={{ width:"100%", maxWidth:420, animation:"fi 0.4s ease" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ background:"linear-gradient(135deg,#00d4ff,#b46ef5)", width:56, height:56, borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:12 }}>◈</div>
          <div style={{ fontSize:24, fontWeight:700 }}>TradeLog <span style={{ color:C.accent }}>Pro</span></div>
          <div style={{ color:C.muted, fontSize:11, letterSpacing:3, marginTop:4 }}>PROFESSIONAL TRADING JOURNAL</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:22 }}>{mode === "login" ? "Iniciar Sesion" : mode === "register" ? "Crear Cuenta" : "Recuperar Contrasena"}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {mode === "register" && <Field label="Nombre"><input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" style={iS} /></Field>}
            <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="trader@email.com" style={iS} onKeyDown={e => e.key === "Enter" && go()} /></Field>
            {mode !== "forgot" && <Field label="Contrasena"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="..." style={iS} onKeyDown={e => e.key === "Enter" && go()} /></Field>}
          </div>
          {err && <div style={{ background:C.red + "22", border:`1px solid ${C.red}44`, color:C.red, borderRadius:8, padding:"10px 14px", fontSize:12, marginTop:12 }}>{err}</div>}
          {ok && <div style={{ background:C.green + "22", border:`1px solid ${C.green}44`, color:C.green, borderRadius:8, padding:"10px 14px", fontSize:12, marginTop:12 }}>{ok}</div>}
          <button onClick={go} disabled={loading} style={{ width:"100%", marginTop:18, background:"linear-gradient(135deg,#00d4ff,#b46ef5)", color:"#000", border:"none", borderRadius:10, padding:"13px 0", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:loading ? 0.7 : 1 }}>
            {loading ? "Cargando..." : mode === "login" ? "Entrar" : mode === "register" ? "Crear Cuenta" : "Enviar Email"}
          </button>
          <div style={{ marginTop:18, display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
            {mode === "login" && <>
              <button onClick={() => { setMode("register"); setErr(""); }} style={{ background:"none", border:"none", color:C.accent, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>No tienes cuenta? Registrate</button>
              <button onClick={() => { setMode("forgot"); setErr(""); }} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Olvidaste tu contrasena?</button>
            </>}
            {mode !== "login" && <button onClick={() => { setMode("login"); setErr(""); }} style={{ background:"none", border:"none", color:C.accent, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Volver al login</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function calcMetrics(tradesList, startBalance) {
  const ct = tradesList.filter(t => t.pnl_usd !== null && t.pnl_usd !== undefined);
  const wins = ct.filter(t => t.pnl_usd > 0), losses = ct.filter(t => t.pnl_usd < 0);
  const tPnl = ct.reduce((s, t) => s + (t.pnl_usd || 0), 0);
  const wr = ct.length ? (wins.length / ct.length * 100).toFixed(1) : "0.0";
  const gW = wins.reduce((s, t) => s + t.pnl_usd, 0), gL = Math.abs(losses.reduce((s, t) => s + t.pnl_usd, 0));
  const pf = gL > 0 ? (gW / gL).toFixed(2) : gW > 0 ? "inf" : "0.00";
  const aR = ct.length ? (ct.reduce((s, t) => s + (parseFloat(t.pnl_r) || 0), 0) / ct.length).toFixed(2) : "0.00";
  return { ct, wins, losses, tPnl, wr, gW, gL, pf, aR };
}

export default function App() {
  const [user, setUser] = useState(null), [al, setAl] = useState(true), [tab, setTab] = useState("dashboard");
  const [trades, setTrades] = useState([]), [tl, setTl] = useState(false);
  const [settings, setSettings] = useState({ balance:10000, riskPct:1 });
  const settingsTimer = useRef(null);
  const [form, setForm] = useState(ef()), [editId, setEditId] = useState(null);
  const [aiMsg, setAiMsg] = useState(""), [aiLoad, setAiLoad] = useState(false);
  const [fs, setFs] = useState("Todos"), [ip, setIp] = useState(null), [modal, setModal] = useState(false), [notif, setNotif] = useState(null);
  const [timeFilter, setTimeFilter] = useState("Todo");

  function applyTimeFilter(list) {
    const now = new Date();
    if (timeFilter === "Hoy") { const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); return list.filter(t => new Date(t.date) >= s); }
    if (timeFilter === "Semana") { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0); return list.filter(t => new Date(t.date) >= s); }
    if (timeFilter === "Mes") { const s = new Date(now.getFullYear(), now.getMonth(), 1); return list.filter(t => new Date(t.date) >= s); }
    if (timeFilter === "3 Meses") { const s = new Date(now); s.setMonth(now.getMonth() - 3); return list.filter(t => new Date(t.date) >= s); }
    if (timeFilter === "6 Meses") { const s = new Date(now); s.setMonth(now.getMonth() - 6); return list.filter(t => new Date(t.date) >= s); }
    if (timeFilter === "Este Anio") { const s = new Date(now.getFullYear(), 0, 1); return list.filter(t => new Date(t.date) >= s); }
    return list;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAl(false); });
    const { data: { subscription: s } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => s.unsubscribe();
  }, []);

  useEffect(() => { if (user) { loadTrades(); loadSettings(); } }, [user]);

  async function loadTrades() {
    setTl(true);
    const { data } = await supabase.from("trades").select("*").eq("user_id", user.id).order("date", { ascending: false });
    if (data) setTrades(data);
    setTl(false);
  }

  async function loadSettings() {
    const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
    if (data) setSettings({ balance: data.balance, riskPct: data.risk_pct });
  }

  async function saveSettings(s) {
    await supabase.from("user_settings").upsert({ user_id: user.id, balance: s.balance, risk_pct: s.riskPct, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }

  function notify(msg, color = C.green) { setNotif({ msg, color }); setTimeout(() => setNotif(null), 3000); }

  function ef() {
    return { date: new Date().toISOString().slice(0, 16), asset:"EUR/USD", tf:"1h", type:"Buy", entry:"", sl:"", tp:"", pnl_r:"", pnl_usd:"", risk_pct:1, setup:"Breakout", market:"Trending alcista", notes:"", image:null, emotion:7, followed_rules:true, error:"Sin error" };
  }

  async function saveTrade() {
    if (!form.asset || !form.date) return notify("Completa los campos requeridos", C.red);
    const t = { ...form, user_id: user.id, pnl_usd: parseFloat(form.pnl_usd) || 0, pnl_r: parseFloat(form.pnl_r) || 0, entry: parseFloat(form.entry) || null, sl: parseFloat(form.sl) || null, tp: parseFloat(form.tp) || null, risk_pct: parseFloat(form.risk_pct) || 1 };
    delete t.id;
    if (editId) { const { error } = await supabase.from("trades").update(t).eq("id", editId); if (error) return notify("Error: " + error.message, C.red); notify("Actualizado!"); }
    else { const { error } = await supabase.from("trades").insert(t); if (error) return notify("Error: " + error.message, C.red); notify("Guardado!"); }
    await loadTrades(); setForm(ef()); setEditId(null); setIp(null); setModal(false);
  }

  function editTrade(t) { setForm({ ...t, pnl_r: t.pnl_r ?? "", pnl_usd: t.pnl_usd ?? "" }); setEditId(t.id); setIp(t.image || null); setModal(true); }
  async function delTrade(id) { await supabase.from("trades").delete().eq("id", id); await loadTrades(); notify("Eliminado", C.yellow); }
  function handleImg(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { setForm(x => ({ ...x, image: ev.target.result })); setIp(ev.target.result); }; r.readAsDataURL(f); }
  async function signOut() { await supabase.auth.signOut(); setTrades([]); setTab("dashboard"); }

  // Metrics (filtered)
  const filtered = applyTimeFilter(trades);
  const { ct, wins, losses, tPnl, wr, pf, aR } = calcMetrics(filtered, settings.balance);
  const bal = settings.balance + calcMetrics(trades, settings.balance).tPnl; // balance always total
  let pk = settings.balance, b2 = settings.balance, mDD = 0;
  [...trades].sort((a, x) => new Date(a.date) - new Date(x.date)).forEach(t => { b2 += t.pnl_usd || 0; if (b2 > pk) pk = b2; const d = ((pk - b2) / pk) * 100; if (d > mDD) mDD = d; });

  const setupStats = SETUPS.map(s => {
    const ts = ct.filter(t => t.setup === s); const w = ts.filter(t => t.pnl_usd > 0).length; const p = ts.reduce((a, t) => a + t.pnl_usd, 0);
    return { setup: s, count: ts.length, wr: ts.length ? (w / ts.length * 100).toFixed(0) : 0, pnl: p };
  }).filter(s => s.count > 0).sort((a, x) => x.pnl - a.pnl);

  const dayStats = Array(7).fill(null).map((_, i) => {
    const ts = ct.filter(t => new Date(t.date).getDay() === i); const w = ts.filter(t => t.pnl_usd > 0).length;
    return { label: DAYS[i], value: ts.length ? parseFloat((w / ts.length * 100).toFixed(1)) : 0, extra: ts.length + "op" };
  });

  const assetStats = ASSETS.map(a => {
    const ts = ct.filter(t => t.asset === a); const p = ts.reduce((s, t) => s + t.pnl_usd, 0);
    return { label: a, value: parseFloat(p.toFixed(1)), extra: ts.length > 0 ? ts.length + "op" : "" };
  }).filter(a => a.extra !== "").sort((a, x) => x.value - a.value);

  const ae = ct.length ? (ct.reduce((s, t) => s + (t.emotion || 5), 0) / ct.length).toFixed(1) : "-";
  const rp = ct.length ? (ct.filter(t => t.followed_rules).length / ct.length * 100).toFixed(0) : "0";
  const ec = {}; ct.forEach(t => { ec[t.error] = (ec[t.error] || 0) + 1; });
  const te = Object.entries(ec).filter(([k]) => k !== "Sin error").sort((a, x) => x[1] - a[1]).slice(0, 4);

  const ft = applyTimeFilter(fs === "Todos" ? trades : trades.filter(t => t.setup === fs));

  // Monthly stats
  const monthlyData = {};
  trades.forEach(t => {
    const d = new Date(t.date);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleString("es", { month: "long", year: "numeric" });
    if (!monthlyData[key]) monthlyData[key] = { key, label, trades:[], wins:0, losses:0, pnl:0, pnlR:0, emotions:[] };
    monthlyData[key].trades.push(t);
    if (t.pnl_usd > 0) monthlyData[key].wins++;
    if (t.pnl_usd < 0) monthlyData[key].losses++;
    monthlyData[key].pnl += t.pnl_usd || 0;
    monthlyData[key].pnlR += parseFloat(t.pnl_r) || 0;
    if (t.emotion) monthlyData[key].emotions.push(t.emotion);
  });
  const monthlyList = Object.values(monthlyData).sort((a, x) => x.key.localeCompare(a.key));

  async function runAI() {
    if (ct.length < 2) return notify("Necesitas 2+ operaciones", C.yellow);
    setAiLoad(true); setAiMsg(""); setTab("ai");
    try {
      const sum = { totalTrades: ct.length, winrate: wr + "%", profitFactor: pf, avgR: aR, maxDD: mDD.toFixed(2) + "%", totalPnl: tPnl.toFixed(2), topSetups: setupStats.slice(0, 3).map(s => ({ setup: s.setup, wr: s.wr + "%", pnl: s.pnl.toFixed(0) })), avgEmotion: ae, ruleFollowPct: rp + "%" };
      const res = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:"Eres un coach de trading profesional. Analiza los datos y da recomendaciones concretas en espanol. Usa emojis. Estructura: 1) Resumen 2) 3 fortalezas 3) 3 areas de mejora con acciones 4) Recomendacion psicologica 5) Plan para la proxima semana.", messages:[{ role:"user", content:`Analiza mi bitacora:\n${JSON.stringify(sum, null, 2)}` }] }) });
      const data = await res.json();
      setAiMsg(data.content?.map(c => c.text || "").join("\n") || "Sin respuesta");
    } catch (e) { setAiMsg("Error al conectar con la IA."); }
    setAiLoad(false);
  }

  const TABS = [
    { id:"dashboard", l:"Dashboard", i:"◈" },
    { id:"trades", l:"Operaciones", i:"≡" },
    { id:"stats", l:"Estadisticas", i:"▲" },
    { id:"monthly", l:"Por Mes", i:"Cal" },
    { id:"report", l:"Reporte", i:"Rep" },
    { id:"psychology", l:"Psicologia", i:"◎" },
    { id:"ai", l:"IA Coach", i:"✦" },
    { id:"settings", l:"Config", i:"⚙" },
  ];

  if (al) return <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", color:C.muted }}><div style={{ textAlign:"center" }}><div style={{ fontSize:32, marginBottom:12 }}>◈</div><div>Cargando...</div></div></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'JetBrains Mono',monospace", color:C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}input,select,textarea{font-family:'JetBrains Mono',monospace!important;}input:focus,select:focus,textarea:focus{border-color:${C.accent}!important;box-shadow:0 0 0 2px ${C.accent}22!important;}.th:hover{background:${C.dim}!important;}.tr:hover{background:${C.dim}!important;}.bp{background:${C.accent};color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;}.bp:hover{opacity:0.85;}.bd{background:${C.red}22;color:${C.red};border:1px solid ${C.red}44;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:inherit;}.be{background:${C.accent}22;color:${C.accent};border:1px solid ${C.accent}44;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:inherit;}@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes sp{to{transform:rotate(360deg)}}.fa{animation:fi 0.3s ease;}.ap{line-height:1.7;white-space:pre-wrap;font-family:sans-serif;font-size:14px;}`}</style>

      {notif && <div style={{ position:"fixed", top:16, right:16, zIndex:9999, background:notif.color + "22", border:`1px solid ${notif.color}`, color:notif.color, padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:600 }}>{notif.msg}</div>}

      {/* HEADER */}
      <div style={{ borderBottom:`1px solid ${C.border}`, background:C.surface, padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ background:"linear-gradient(135deg,#00d4ff,#b46ef5)", width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>◈</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>TradeLog <span style={{ color:C.accent }}>Pro</span></div>
            <div style={{ color:C.muted, fontSize:10, letterSpacing:2 }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {TABS.map(t => <button key={t.id} className="th" onClick={() => setTab(t.id)} style={{ background:tab === t.id ? C.accent + "22" : "transparent", color:tab === t.id ? C.accent : C.muted, border:`1px solid ${tab === t.id ? C.accent + "44" : "transparent"}`, borderRadius:8, padding:"6px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>{t.i} {t.l}</button>)}
          <button onClick={signOut} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"6px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 16px" }}>

        {/* TIME FILTER BAR */}
        {(tab === "dashboard" || tab === "stats" || tab === "psychology") && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
            {TIME_OPTIONS.map(o => <button key={o} onClick={() => setTimeFilter(o)} style={{ background:timeFilter === o ? C.accent + "22" : "transparent", color:timeFilter === o ? C.accent : C.muted, border:`1px solid ${timeFilter === o ? C.accent + "44" : C.border}`, borderRadius:6, padding:"5px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:timeFilter === o ? 700 : 400 }}>{o}</button>)}
          </div>
        )}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Dashboard</h2>
                <div style={{ color:C.muted, fontSize:12 }}>{ct.length} operaciones {timeFilter !== "Todo" ? "· " + timeFilter : ""}</div>
              </div>
              <button className="bp" onClick={() => { setEditId(null); setForm(ef()); setIp(null); setModal(true); }} style={{ padding:"10px 20px" }}>+ Nueva Operacion</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              <StatCard label="Balance" value={"$" + bal.toLocaleString("en", { maximumFractionDigits:0 })} sub={(calcMetrics(trades, settings.balance).tPnl >= 0 ? "+" : "") + "$" + calcMetrics(trades, settings.balance).tPnl.toFixed(0) + " P&L total"} color={calcMetrics(trades, settings.balance).tPnl >= 0 ? C.green : C.red} icon="💰" />
              <StatCard label="Winrate" value={wr + "%"} sub={wins.length + "W / " + losses.length + "L"} color={parseFloat(wr) >= 50 ? C.green : C.red} icon="🎯" />
              <StatCard label="Profit Factor" value={pf} color={parseFloat(pf) >= 1.5 ? C.green : C.yellow} icon="⚡" />
              <StatCard label="Max Drawdown" value={mDD.toFixed(1) + "%"} color={mDD > 10 ? C.red : mDD > 5 ? C.yellow : C.green} icon="📉" />
              <StatCard label="Avg R" value={aR + "R"} sub={ct.length + " ops"} color={parseFloat(aR) > 0 ? C.green : C.red} icon="📊" />
              <StatCard label="Psicologia" value={ae + "/10"} sub={rp + "% reglas"} color={parseFloat(ae) >= 7 ? C.green : C.yellow} icon="🧠" />
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              <div style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Equity Curve</div>
              <EquityCurve trades={ct} startBalance={settings.balance} />
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              <div style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Ultimas 5 operaciones</div>
              {tl ? <div style={{ color:C.muted }}>Cargando...</div> : trades.length === 0 ? <div style={{ textAlign:"center", color:C.muted, padding:"30px 0" }}>Registra tu primer trade!</div> :
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {trades.slice(0, 5).map(t => (
                    <div key={t.id} className="tr" style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, background:C.surface, border:`1px solid ${C.border}` }}>
                      <Badge text={t.type} color={t.type === "Buy" ? C.green : C.red} />
                      <span style={{ fontWeight:600, fontSize:13 }}>{t.asset}</span>
                      <span style={{ color:C.muted, fontSize:12 }}>{t.tf}</span>
                      <Badge text={t.setup} color={C.purple} />
                      <div style={{ marginLeft:"auto", display:"flex", gap:12, alignItems:"center" }}>
                        <span style={{ color:C.muted, fontSize:11 }}>{new Date(t.date).toLocaleDateString("es")}</span>
                        <span style={{ color:t.pnl_usd >= 0 ? C.green : C.red, fontWeight:700 }}>{t.pnl_usd >= 0 ? "+" : ""}${t.pnl_usd?.toFixed(0)}</span>
                        <span style={{ color:C.muted, fontSize:12 }}>{t.pnl_r > 0 ? "+" : ""}{t.pnl_r}R</span>
                      </div>
                    </div>
                  ))}
                </div>}
            </div>
          </div>
        )}

        {/* OPERACIONES */}
        {tab === "trades" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Operaciones</h2>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={{ ...iS, width:"auto", padding:"7px 12px" }}>
                  {TIME_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
                <select value={fs} onChange={e => setFs(e.target.value)} style={{ ...iS, width:"auto", padding:"7px 12px" }}>
                  <option>Todos</option>
                  {SETUPS.map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="bp" onClick={() => { setEditId(null); setForm(ef()); setIp(null); setModal(true); }} style={{ padding:"8px 18px" }}>+ Nuevo</button>
              </div>
            </div>
            {tl ? <div style={{ color:C.muted }}>Cargando...</div> : ft.length === 0 ? <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:"60px 20px", textAlign:"center", color:C.muted }}>Sin operaciones en este periodo</div> :
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {ft.map(t => (
                  <div key={t.id} className="tr" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", borderLeft:`3px solid ${t.pnl_usd >= 0 ? C.green : C.red}` }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                      <Badge text={t.type} color={t.type === "Buy" ? C.green : C.red} />
                      <span style={{ fontWeight:700, fontSize:14 }}>{t.asset}</span>
                      <span style={{ color:C.muted, fontSize:12 }}>{t.tf}</span>
                      <Badge text={t.setup} color={C.purple} />
                      <Badge text={t.market} color={C.yellow} />
                      <div style={{ marginLeft:"auto", display:"flex", gap:12, alignItems:"center" }}>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ color:t.pnl_usd >= 0 ? C.green : C.red, fontWeight:700, fontSize:16 }}>{t.pnl_usd >= 0 ? "+" : ""}${t.pnl_usd?.toFixed(2)}</div>
                          <div style={{ color:C.muted, fontSize:11 }}>{t.pnl_r > 0 ? "+" : ""}{t.pnl_r}R</div>
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button className="be" onClick={() => editTrade(t)}>Editar</button>
                          <button className="bd" onClick={() => delTrade(t.id)}>X</button>
                        </div>
                      </div>
                    </div>
                    {t.notes && <div style={{ color:C.muted, fontSize:12, marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>{t.notes}</div>}
                    {t.image && <img src={t.image} alt="trade" style={{ maxWidth:200, borderRadius:6, border:`1px solid ${C.border}`, marginTop:8, cursor:"pointer" }} onClick={() => window.open(t.image)} />}
                    <div style={{ color:C.muted, fontSize:11, marginTop:6 }}>{new Date(t.date).toLocaleString("es")} · E:{t.entry} · SL:{t.sl} · TP:{t.tp} · {t.risk_pct}% · {t.emotion}/10 · {t.followed_rules ? "Reglas OK" : "Sin reglas"}</div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* ESTADISTICAS */}
        {tab === "stats" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Estadisticas</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
                <BarChart label="P&L por Setup" data={setupStats.map(s => ({ label: s.setup.substring(0, 12), value: parseFloat(s.pnl.toFixed(1)), extra: s.wr + "%" }))} />
              </div>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
                <BarChart label="Winrate por Dia" data={dayStats} />
              </div>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
                <BarChart label="P&L por Activo" data={assetStats} />
              </div>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
                <div style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Resumen Setups</div>
                {setupStats.length === 0 ? <div style={{ color:C.muted }}>Sin datos</div> : setupStats.map(s => (
                  <div key={s.setup} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                    <span>{s.setup}</span>
                    <span style={{ color:C.muted }}>{s.count}op</span>
                    <span style={{ color:parseFloat(s.wr) >= 50 ? C.green : C.red }}>{s.wr}%</span>
                    <span style={{ color:s.pnl >= 0 ? C.green : C.red }}>{s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POR MES */}
        {tab === "monthly" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Estadisticas por Mes</h2>
            {monthlyList.length === 0 ? (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:60, textAlign:"center", color:C.muted }}>Sin operaciones registradas</div>
            ) : monthlyList.map(m => {
              const wrM = m.trades.length ? (m.wins / m.trades.length * 100).toFixed(1) : 0;
              const avgR = m.trades.length ? (m.pnlR / m.trades.length).toFixed(2) : 0;
              const avgEmo = m.emotions.length ? (m.emotions.reduce((a, b) => a + b, 0) / m.emotions.length).toFixed(1) : "-";
              const topSetups = Object.entries(m.trades.reduce((acc, t) => { acc[t.setup] = (acc[t.setup] || 0) + 1; return acc; }, {})).sort((a, x) => x[1] - a[1]).slice(0, 4);
              return (
                <div key={m.key} style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${m.pnl >= 0 ? C.green : C.red}`, borderRadius:12, padding:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16, textTransform:"capitalize" }}>{m.label}</div>
                      <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>{m.trades.length} operaciones · {m.wins}W / {m.losses}L</div>
                    </div>
                    <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ color:m.pnl >= 0 ? C.green : C.red, fontWeight:700, fontSize:22 }}>{m.pnl >= 0 ? "+" : ""}${m.pnl.toFixed(0)}</div>
                        <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>P&L</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ color:parseFloat(wrM) >= 50 ? C.green : C.red, fontWeight:700, fontSize:22 }}>{wrM}%</div>
                        <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>WINRATE</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ color:parseFloat(avgR) > 0 ? C.green : C.red, fontWeight:700, fontSize:22 }}>{parseFloat(avgR) > 0 ? "+" : ""}{avgR}R</div>
                        <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>AVG R</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ color:C.accent, fontWeight:700, fontSize:22 }}>{avgEmo}/10</div>
                        <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>EMOCION</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop:12, display:"flex", gap:6, flexWrap:"wrap" }}>
                    {topSetups.map(([s, c]) => <span key={s} style={{ background:C.purple + "22", color:C.purple, border:`1px solid ${C.purple}44`, borderRadius:4, padding:"2px 8px", fontSize:11 }}>{s} x{c}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REPORTE */}
        {tab === "report" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Reporte de Datos</h2>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={{ ...iS, width:"auto", padding:"7px 14px" }}>
                  {TIME_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
                <select value={fs} onChange={e => setFs(e.target.value)} style={{ ...iS, width:"auto", padding:"7px 14px" }}>
                  <option>Todos</option>
                  {SETUPS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {(() => {
              const trs = ft.filter(t => t.pnl_usd !== null);
              const w = trs.filter(t => t.pnl_usd > 0), l = trs.filter(t => t.pnl_usd < 0);
              const p = trs.reduce((s, t) => s + (t.pnl_usd || 0), 0);
              const gw = w.reduce((s, t) => s + t.pnl_usd, 0), gl = Math.abs(l.reduce((s, t) => s + t.pnl_usd, 0));
              const pff = gl > 0 ? (gw / gl).toFixed(2) : gw > 0 ? "inf" : "0.00";
              const ar = trs.length ? (trs.reduce((s, t) => s + (parseFloat(t.pnl_r) || 0), 0) / trs.length).toFixed(2) : "0.00";
              const wr2 = trs.length ? (w.length / trs.length * 100).toFixed(1) : "0.0";
              return (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10 }}>
                  <StatCard label="Operaciones" value={trs.length} icon="📊" />
                  <StatCard label="P&L" value={(p >= 0 ? "+" : "") + "$" + p.toFixed(0)} color={p >= 0 ? C.green : C.red} icon="💰" />
                  <StatCard label="Winrate" value={wr2 + "%"} color={parseFloat(wr2) >= 50 ? C.green : C.red} icon="🎯" />
                  <StatCard label="Profit Factor" value={pff} color={parseFloat(pff) >= 1.5 ? C.green : C.yellow} icon="⚡" />
                  <StatCard label="Avg R" value={ar + "R"} color={parseFloat(ar) > 0 ? C.green : C.red} icon="📈" />
                  <StatCard label="Ganadas" value={w.length} color={C.green} icon="✅" />
                  <StatCard label="Perdidas" value={l.length} color={C.red} icon="❌" />
                </div>
              );
            })()}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>{ft.length} operaciones</div>
              </div>
              {ft.length === 0 ? <div style={{ padding:40, textAlign:"center", color:C.muted }}>Sin operaciones en este periodo</div> : (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:C.surface }}>
                        {["Fecha","Activo","TF","Tipo","Setup","Entrada","SL","TP","R","P&L","Riesgo%","Emocion","Reglas","Error"].map(h => (
                          <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ft.map((t, i) => (
                        <tr key={t.id} className="tr" style={{ borderBottom:`1px solid ${C.border}`, background:i % 2 === 0 ? "transparent" : C.surface + "44" }}>
                          <td style={{ padding:"10px 14px", whiteSpace:"nowrap", color:C.muted }}>{new Date(t.date).toLocaleDateString("es")}</td>
                          <td style={{ padding:"10px 14px", fontWeight:700 }}>{t.asset}</td>
                          <td style={{ padding:"10px 14px", color:C.muted }}>{t.tf}</td>
                          <td style={{ padding:"10px 14px" }}><span style={{ color:t.type === "Buy" ? C.green : C.red, fontWeight:700 }}>{t.type}</span></td>
                          <td style={{ padding:"10px 14px" }}><span style={{ background:C.purple + "22", color:C.purple, borderRadius:4, padding:"2px 6px" }}>{t.setup}</span></td>
                          <td style={{ padding:"10px 14px", color:C.muted }}>{t.entry || "-"}</td>
                          <td style={{ padding:"10px 14px", color:C.red }}>{t.sl || "-"}</td>
                          <td style={{ padding:"10px 14px", color:C.green }}>{t.tp || "-"}</td>
                          <td style={{ padding:"10px 14px", color:parseFloat(t.pnl_r) > 0 ? C.green : C.red, fontWeight:600 }}>{t.pnl_r > 0 ? "+" : ""}{t.pnl_r}R</td>
                          <td style={{ padding:"10px 14px", color:t.pnl_usd >= 0 ? C.green : C.red, fontWeight:700 }}>{t.pnl_usd >= 0 ? "+" : ""}${t.pnl_usd?.toFixed(0)}</td>
                          <td style={{ padding:"10px 14px", color:C.muted }}>{t.risk_pct}%</td>
                          <td style={{ padding:"10px 14px", color:t.emotion >= 7 ? C.green : t.emotion >= 5 ? C.yellow : C.red }}>{t.emotion}/10</td>
                          <td style={{ padding:"10px 14px" }}><span style={{ color:t.followed_rules ? C.green : C.red }}>{t.followed_rules ? "OK" : "NO"}</span></td>
                          <td style={{ padding:"10px 14px", color:C.muted, fontSize:11 }}>{t.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PSICOLOGIA */}
        {tab === "psychology" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Psicologia del Trading</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
              <StatCard label="Nivel Emocional" value={ae + "/10"} color={parseFloat(ae) >= 7 ? C.green : C.yellow} icon="🧘" />
              <StatCard label="Siguio Reglas" value={rp + "%"} sub={ct.filter(t => t.followed_rules).length + " de " + ct.length} color={parseFloat(rp) >= 80 ? C.green : C.red} icon="📋" />
              <StatCard label="Trades Limpios" value={ct.filter(t => t.error === "Sin error").length} color={C.accent} icon="✅" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
                <div style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Errores Frecuentes</div>
                {te.length === 0 ? <div style={{ color:C.muted }}>Sin errores</div> : te.map(([err, cnt]) => (
                  <div key={err} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:13 }}>{err}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ height:4, width:cnt * 16, background:C.red, borderRadius:2 }} />
                      <span style={{ color:C.red, fontWeight:700 }}>{cnt}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
                <div style={{ color:C.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Emocion vs Resultado</div>
                {[...Array(10)].map((_, i) => {
                  const l = 10 - i; const ts = ct.filter(t => t.emotion === l); const p = ts.reduce((s, t) => s + t.pnl_usd, 0);
                  return ts.length > 0 ? (
                    <div key={l} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:6, fontSize:12 }}>
                      <span style={{ width:30, color:C.muted }}>Nv.{l}</span>
                      <div style={{ flex:1, height:14, background:C.border, borderRadius:2 }}>
                        <div style={{ height:"100%", width:`${(ts.length / ct.length) * 100}%`, background:p >= 0 ? C.green : C.red, borderRadius:2 }} />
                      </div>
                      <span style={{ color:p >= 0 ? C.green : C.red, width:55, textAlign:"right" }}>{p >= 0 ? "+" : ""}${p.toFixed(0)}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* IA COACH */}
        {tab === "ai" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>✦ IA Coach</h2>
                <div style={{ color:C.muted, fontSize:12 }}>Analisis personalizado de tu rendimiento</div>
              </div>
              <button className="bp" onClick={runAI} disabled={aiLoad} style={{ padding:"10px 22px", opacity:aiLoad ? 0.7 : 1 }}>{aiLoad ? "Analizando..." : "Analizar Ahora"}</button>
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:28, minHeight:300 }}>
              {aiLoad && <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:16 }}><div style={{ width:44, height:44, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"sp 0.8s linear infinite" }} /><div style={{ color:C.muted, fontSize:13 }}>Analizando tus datos...</div></div>}
              {!aiLoad && !aiMsg && <div style={{ textAlign:"center", color:C.muted, paddingTop:60 }}><div style={{ fontSize:40, marginBottom:16 }}>✦</div><div style={{ fontSize:14 }}>Haz clic en Analizar Ahora</div></div>}
              {aiMsg && !aiLoad && (
                <div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:20 }}>
                    <div style={{ background:"linear-gradient(135deg,#00d4ff,#b46ef5)", width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>✦</div>
                    <div><div style={{ fontWeight:700, fontSize:14 }}>IA Coach</div><div style={{ color:C.muted, fontSize:11 }}>Basado en {ct.length} operaciones</div></div>
                  </div>
                  <div className="ap" style={{ color:C.text }}>{aiMsg}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONFIG */}
        {tab === "settings" && (
          <div className="fa" style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:480 }}>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Configuracion</h2>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:24, display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:13, color:C.text, padding:"8px 12px", background:C.surface, borderRadius:8 }}>📧 {user.email}</div>
              <Field label="Balance Inicial ($)">
                <input type="number" value={settings.balance} onChange={e => { const v = { ...settings, balance: parseFloat(e.target.value) || 0 }; setSettings(v); clearTimeout(settingsTimer.current); settingsTimer.current = setTimeout(() => saveSettings(v), 800); }} style={iS} />
              </Field>
              <Field label="Riesgo por defecto (%)">
                <input type="number" step="0.1" value={settings.riskPct} onChange={e => { const v = { ...settings, riskPct: parseFloat(e.target.value) || 1 }; setSettings(v); clearTimeout(settingsTimer.current); settingsTimer.current = setTimeout(() => saveSettings(v), 800); }} style={iS} />
              </Field>
              <button onClick={signOut} style={{ background:C.red + "22", color:C.red, border:`1px solid ${C.red}44`, borderRadius:8, padding:"10px 18px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cerrar Sesion</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:700, maxHeight:"90vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:18, fontWeight:700 }}>{editId ? "Editar" : "Nueva"} Operacion</div>
              <button onClick={() => setModal(false)} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>X</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Field label="Fecha"><input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={iS} /></Field>
              <Field label="Activo"><select value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} style={iS}>{ASSETS.map(a => <option key={a}>{a}</option>)}</select></Field>
              <Field label="TF"><select value={form.tf} onChange={e => setForm(f => ({ ...f, tf: e.target.value }))} style={iS}>{TFS.map(t => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Tipo"><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...iS, color: form.type === "Buy" ? C.green : C.red }}><option>Buy</option><option>Sell</option></select></Field>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Field label="Entrada"><input type="number" step="any" placeholder="0.00" value={form.entry} onChange={e => setForm(f => ({ ...f, entry: e.target.value }))} style={iS} /></Field>
              <Field label="Stop Loss"><input type="number" step="any" placeholder="0.00" value={form.sl} onChange={e => setForm(f => ({ ...f, sl: e.target.value }))} style={iS} /></Field>
              <Field label="Take Profit"><input type="number" step="any" placeholder="0.00" value={form.tp} onChange={e => setForm(f => ({ ...f, tp: e.target.value }))} style={iS} /></Field>
              <Field label="Riesgo %"><input type="number" step="0.1" value={form.risk_pct} onChange={e => setForm(f => ({ ...f, risk_pct: e.target.value }))} style={iS} /></Field>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Field label="Resultado R"><input type="number" step="0.01" placeholder="1.5" value={form.pnl_r} onChange={e => setForm(f => ({ ...f, pnl_r: e.target.value }))} style={iS} /></Field>
              <Field label="Resultado $"><input type="number" step="0.01" placeholder="150.00" value={form.pnl_usd} onChange={e => setForm(f => ({ ...f, pnl_usd: e.target.value }))} style={iS} /></Field>
              <Field label="Setup"><select value={form.setup} onChange={e => setForm(f => ({ ...f, setup: e.target.value }))} style={iS}>{SETUPS.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Condiciones"><select value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))} style={iS}>{MARKET.map(m => <option key={m}>{m}</option>)}</select></Field>
            </div>
            <div style={{ background:C.surface, borderRadius:10, padding:16, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Field label={"Emocion: " + form.emotion + "/10"}><input type="range" min="1" max="10" value={form.emotion} onChange={e => setForm(f => ({ ...f, emotion: parseInt(e.target.value) }))} style={{ width:"100%", accentColor: form.emotion >= 7 ? C.green : form.emotion >= 5 ? C.yellow : C.red }} /></Field>
              <Field label="Siguio Reglas?"><select value={form.followed_rules ? "si" : "no"} onChange={e => setForm(f => ({ ...f, followed_rules: e.target.value === "si" }))} style={{ ...iS, color: form.followed_rules ? C.green : C.red }}><option value="si">Si</option><option value="no">No</option></select></Field>
              <Field label="Tipo de Error"><select value={form.error} onChange={e => setForm(f => ({ ...f, error: e.target.value }))} style={iS}>{ERRORS.map(e => <option key={e}>{e}</option>)}</select></Field>
            </div>
            <Field label="Notas"><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Describe tu analisis..." style={{ ...iS, resize:"vertical" }} /></Field>
            <Field label="Imagen del Trade">
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <label style={{ background:C.dim, border:`1px dashed ${C.border}`, borderRadius:8, padding:"10px 18px", cursor:"pointer", fontSize:12, color:C.muted }}>
                  Subir imagen
                  <input type="file" accept="image/*" onChange={handleImg} style={{ display:"none" }} />
                </label>
                {ip && <img src={ip} alt="preview" style={{ height:60, borderRadius:6, border:`1px solid ${C.border}` }} />}
              </div>
            </Field>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={() => setModal(false)} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
              <button className="bp" onClick={saveTrade} style={{ padding:"10px 24px" }}>{editId ? "Actualizar" : "Guardar"} Operacion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

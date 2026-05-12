import React, { useState, useEffect, useRef } from "react";

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const COLORS = [
  // Reds & Pinks
  "#e53935","#ff4081","#f06292",
  // Oranges
  "#f4511e","#fb8c00",
  // Yellows
  "#f9a825","#fdd835",
  // Greens
  "#43a047","#00c853","#69f0ae",
  // Teals & Cyan
  "#00897b","#00bcd4","#00e5ff",
  // Blues
  "#1e88e5","#1565c0","#42a5f5",
  // Purples & Indigo
  "#5e35b1","#8e24aa","#ce93d8",
  // Browns
  "#6d4c41","#a1887f",
  // Greys
  "#546e7a","#90a4ae","#b0bec5",
  // Black & White-ish
  "#212121","#eeeeee"
];

const GROUPS = ["Gesamt Equities", "German Equities", "International Equities"];

const BIN_ID  = import.meta.env.VITE_BIN_ID;
const API_KEY = import.meta.env.VITE_API_KEY;
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchData() {
  try {
    const res = await fetch(BIN_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
    const json = await res.json();
    return json.record ?? { entries: [], userDirectory: {} };
  } catch { return null; }
}
async function pushData(data) {
  try {
    await fetch(BIN_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
      body: JSON.stringify(data)
    });
  } catch {}
}

function toDateStr(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function fmtDate(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}.${m}.${y}`;
}
function dateInRange(date, start, end) { return date >= start && date <= end; }
function getKW(year, month, day) {
  const d = new Date(Date.UTC(year, month, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function loadProfile() {
  try { return JSON.parse(localStorage.getItem("kal-profile")) ?? null; } catch { return null; }
}
function saveProfile(p) {
  try { localStorage.setItem("kal-profile", JSON.stringify(p)); } catch {}
}
function loadTheme() {
  try { return localStorage.getItem("kal-theme") ?? "light"; } catch { return "light"; }
}
function saveTheme(t) {
  try { localStorage.setItem("kal-theme", t); } catch {}
}

// ─── Themes ──────────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg: "#f8f9fa",
    topbar: "#ffffff",
    topbarBorder: "#e0e0e0",
    topbarShadow: "0 1px 3px rgba(0,0,0,.08)",
    sidebar: "#ffffff",
    sidebarBorder: "#e0e0e0",
    sidebarLabel: "#5f6368",
    cellBg: "#ffffff",
    cellBorder: "#e8eaed",
    cellHover: "#f0f4ff",
    cellSelected: "#e8f0fe",
    cellSelectedOutline: "#1a73e8",
    dayNumColor: "#202124",
    dayNumWeekend: "#e74c3c",
    dayNumToday: "#1a73e8",
    dayNumTodayBg: "#1a73e8",
    dayNumTodayColor: "#fff",
    detailBg: "#ffffff",
    detailBorder: "#e0e0e0",
    detailShadow: "0 1px 6px rgba(0,0,0,.06)",
    entryBg: "#f8f9fa",
    textPrimary: "#202124",
    textSecondary: "#5f6368",
    accent: "#1a73e8",
    accentHover: "#1557b0",
    btnBorder: "#dadce0",
    inputBg: "#ffffff",
    inputBorder: "#dadce0",
    inputFocus: "#1a73e8",
    inputFocusShadow: "#1a73e820",
    modalBg: "#ffffff",
    modalOverlay: "rgba(0,0,0,.4)",
    syncColor: "#34a853",
    todayBtn: "#ffffff",
    todayBtnBorder: "#dadce0",
    todayBtnColor: "#3c4043",
    themeBtnBg: "#1a1a2e",
    themeBtnColor: "#c9a84c",
    themeBtnLabel: "✦ Gold",
    fontHeading: "'Inter','Segoe UI',sans-serif",
    fontImport: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    calendarTitle: "Kalender",
    calendarTitleColor: "#1a73e8",
  },
  gold: {
    bg: "#0d0d0d",
    topbar: "#111111",
    topbarBorder: "#2a2a2a",
    topbarShadow: "0 2px 12px rgba(0,0,0,.6)",
    sidebar: "#111111",
    sidebarBorder: "#2a2a2a",
    sidebarLabel: "#c9a84c",
    cellBg: "#161616",
    cellBorder: "#252525",
    cellHover: "#1e1a0e",
    cellSelected: "#2a2000",
    cellSelectedOutline: "#c9a84c",
    dayNumColor: "#e8e0cc",
    dayNumWeekend: "#c9a84c",
    dayNumToday: "#c9a84c",
    dayNumTodayBg: "#c9a84c",
    dayNumTodayColor: "#0d0d0d",
    detailBg: "#111111",
    detailBorder: "#2a2a2a",
    detailShadow: "0 4px 24px rgba(0,0,0,.5)",
    entryBg: "#1a1a1a",
    textPrimary: "#e8e0cc",
    textSecondary: "#a09070",
    accent: "#c9a84c",
    accentHover: "#b8973b",
    btnBorder: "#3a3020",
    inputBg: "#1a1a1a",
    inputBorder: "#3a3020",
    inputFocus: "#c9a84c",
    inputFocusShadow: "#c9a84c20",
    modalBg: "#161616",
    modalOverlay: "rgba(0,0,0,.75)",
    syncColor: "#c9a84c",
    todayBtn: "#1a1a1a",
    todayBtnBorder: "#3a3020",
    todayBtnColor: "#c9a84c",
    themeBtnBg: "#c9a84c",
    themeBtnColor: "#0d0d0d",
    themeBtnLabel: "☀ Hell",
    fontHeading: "'Playfair Display','Georgia',serif",
    fontImport: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap",
    calendarTitle: "Kalender",
    calendarTitleColor: "#c9a84c",
  }
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function Kalender() {
  const today    = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [theme, setTheme]         = useState(loadTheme);
  const T = THEMES[theme];

  const [year, setYear]           = useState(today.getFullYear());
  const [month, setMonth]         = useState(today.getMonth());
  const [entries, setEntries]     = useState([]);
  const [userDir, setUserDir]     = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [modal, setModal]         = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState({ title: "", startDate: "", endDate: "", note: "" });
  const [loaded, setLoaded]       = useState(false);
  const [syncing, setSyncing]     = useState(false);

  const [user, setUser]                         = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm]           = useState({ name: "", color: COLORS[2] });
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [nameHint, setNameHint]                 = useState(null);
  const [colorTakenWarning, setColorTakenWarning] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [hiddenUsers, setHiddenUsers] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null); // user key to confirm delete
  const [resetConfirm, setResetConfirm] = useState(null); // 'entries' | 'users' | null
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState("Gesamt Equities");
  const [groupEditor, setGroupEditor] = useState(false);
  const [groupConfig, setGroupConfig] = useState({}); // { "German Equities": ["anna","max"], ... }

  const intervalRef = useRef(null);
  const dataRef     = useRef({ entries: [], userDirectory: {} });

  useEffect(() => {
    const p = loadProfile();
    if (p?.name) setUser(p); else setShowProfileSetup(true);
    fetchData().then(data => {
      if (data) { dataRef.current = data; setEntries(data.entries ?? []); setUserDir(data.userDirectory ?? {}); setGroupConfig(data.groupConfig ?? {}); }
      setLoaded(true);
    });
    intervalRef.current = setInterval(() => {
      fetchData().then(data => {
        if (data) { dataRef.current = data; setEntries(data.entries ?? []); setUserDir(data.userDirectory ?? {}); setGroupConfig(data.groupConfig ?? {}); }
      });
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Auto close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "gold" : "light";
    setTheme(next);
    saveTheme(next);
  };

  const saveProfileHandler = () => {
    const name = profileForm.name.trim();
    if (!name) return;
    // Check if color is already taken by another user
    const takenBy = Object.entries(userDir).find(([k, v]) => v === profileForm.color && k !== name.toLowerCase());
    if (takenBy) {
      setColorTakenWarning(takenBy[0].charAt(0).toUpperCase() + takenBy[0].slice(1));
      return;
    }
    setColorTakenWarning(null);
    const p = { name, color: profileForm.color };
    setUser(p); saveProfile(p); setNameHint(null);
    const updatedDir = { ...dataRef.current.userDirectory, [name.toLowerCase()]: profileForm.color };
    const updatedData = { ...dataRef.current, userDirectory: updatedDir };
    dataRef.current = updatedData; setUserDir(updatedDir);
    setShowProfileSetup(false); setShowProfileEditor(false);
    pushData(updatedData);
  };

  const handleNameChange = (v) => {
    const knownColor = userDir[v.trim().toLowerCase()];
    setNameHint(knownColor ? "known" : null);
    setProfileForm(f => ({ ...f, name: v, ...(knownColor ? { color: knownColor } : {}) }));
    setColorTakenWarning(null);
  };

  const toggleUser = (key) => {
    setHiddenUsers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const deleteUser = (key) => {
    const updatedDir = { ...dataRef.current.userDirectory };
    delete updatedDir[key];
    const updatedData = { ...dataRef.current, userDirectory: updatedDir };
    dataRef.current = updatedData;
    setUserDir(updatedDir);
    setHiddenUsers(prev => { const next = new Set(prev); next.delete(key); return next; });
    setDeleteConfirm(null);
    pushData(updatedData);
  };

  const saveGroupConfig = (newConfig) => {
    setGroupConfig(newConfig);
    const updatedData = { ...dataRef.current, groupConfig: newConfig };
    dataRef.current = updatedData;
    pushData(updatedData);
  };

  const toggleUserInGroup = (group, userKey) => {
    const current = groupConfig[group] ?? [];
    const updated = current.includes(userKey)
      ? current.filter(k => k !== userKey)
      : [...current, userKey];
    saveGroupConfig({ ...groupConfig, [group]: updated });
  };

  const resetEntries = () => {
    const updatedData = { ...dataRef.current, entries: [] };
    dataRef.current = updatedData;
    setEntries([]);
    setResetConfirm(null);
    pushData(updatedData);
  };

  const resetUsers = () => {
    const updatedData = { ...dataRef.current, userDirectory: {} };
    dataRef.current = updatedData;
    setUserDir({});
    setHiddenUsers(new Set());
    setResetConfirm(null);
    pushData(updatedData);
  };

  const getVisibleUsers = () => {
    if (activeView === "Gesamt Equities") return null; // show all
    const groupUsers = groupConfig[activeView] ?? [];
    return groupUsers;
  };

  const getEntriesForDay = (dayStr) => {
    const visibleUsers = getVisibleUsers();
    return entries.filter(e => {
      if (!e?.startDate || !e?.endDate) return false;
      if (!dateInRange(dayStr, e.startDate, e.endDate)) return false;
      if (hiddenUsers.has(e.author?.toLowerCase())) return false;
      if (visibleUsers !== null && !visibleUsers.includes(e.author?.toLowerCase())) return false;
      return true;
    });
  };

  const openDay      = (d) => { setSelectedDay(d); setModal(false); setEditId(null); };
  const openAddModal = () => {
    const def = toDateStr(year, month, selectedDay);
    setForm({ title: "", startDate: def, endDate: def, note: "" });
    setEditId(null); setModal(true);
  };
  const openEditModal = (entry) => {
    setForm({ title: entry.title, startDate: entry.startDate, endDate: entry.endDate, note: entry.note || "" });
    setEditId(entry.id); setModal(true);
  };

  const saveEntry = () => {
    if (!form.title.trim() || !form.startDate || !form.endDate || !user) return;
    const start = form.startDate <= form.endDate ? form.startDate : form.endDate;
    const end   = form.startDate <= form.endDate ? form.endDate   : form.startDate;
    const entry = { title: form.title.trim(), startDate: start, endDate: end, note: form.note, color: user.color, author: user.name };
    const updated = editId
      ? dataRef.current.entries.map(e => e.id === editId ? { ...entry, id: editId } : e)
      : [...dataRef.current.entries, { ...entry, id: Date.now().toString() }];
    // Auto-register user in shared directory if not already there
    const userKey = user.name.toLowerCase();
    const updatedDir = dataRef.current.userDirectory[userKey]
      ? dataRef.current.userDirectory
      : { ...dataRef.current.userDirectory, [userKey]: user.color };
    if (!dataRef.current.userDirectory[userKey]) setUserDir(updatedDir);
    const updatedData = { ...dataRef.current, entries: updated, userDirectory: updatedDir };
    dataRef.current = updatedData; setEntries(updated);
    setModal(false); setEditId(null);
    setSyncing(true);
    pushData(updatedData).then(() => setSyncing(false));
  };

  const deleteEntry = (id) => {
    const updated = dataRef.current.entries.filter(e => e.id !== id);
    const updatedData = { ...dataRef.current, entries: updated };
    dataRef.current = updatedData; setEntries(updated);
    pushData(updatedData);
  };

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelectedDay(null); };

  const daysInMonth    = getDaysInMonth(year, month);
  const firstDay       = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday         = (d) => toDateStr(year, month, d) === todayStr;
  const selectedDayStr  = selectedDay ? toDateStr(year, month, selectedDay) : null;
  const selectedEntries = selectedDayStr ? getEntriesForDay(selectedDayStr) : [];
  const canSave         = form.title.trim() && form.startDate && form.endDate;

  const allUsers = Object.entries(userDir).map(([key, color]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1), color, key
  })).sort((a, b) => a.name.localeCompare(b.name));

  // Gold theme decorative gradient
  const goldBg = theme === "gold"
    ? `radial-gradient(ellipse at 20% 0%, #1a150088 0%, transparent 50%),
       radial-gradient(ellipse at 80% 100%, #1a0d0088 0%, transparent 50%),
       url('/image.png')`
    : T.bg;

  const inp = { background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 8, color: T.textPrimary, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", transition: "border-color .15s" };

  return (
    <div style={{ minHeight:"100vh", background: goldBg, backgroundSize:"cover", backgroundPosition:"center", backgroundAttachment:"fixed", fontFamily: T.fontHeading, display:"flex", flexDirection:"column", transition:"background .4s" }}>
      <style>{`
        @import url('${T.fontImport}');
        * { box-sizing:border-box; margin:0; padding:0; }
        .day-cell { cursor:pointer; transition:background .12s; border-radius:8px; }
        .day-cell:hover { background:${T.cellHover} !important; }
        .day-cell.sel { background:${T.cellSelected} !important; outline:2px solid ${T.cellSelectedOutline}; }
        .btn { cursor:pointer; border:none; transition:all .15s; background:none; }
        .btn:hover { opacity:.85; }
        .mbg { animation:fi .18s ease; }
        .mbox { animation:si .2s cubic-bezier(.22,1,.36,1); }
        @keyframes fi { from{opacity:0}to{opacity:1} }
        @keyframes si { from{transform:translateY(20px) scale(.97);opacity:0}to{transform:none;opacity:1} }
        @media (max-width: 768px) {
          .cal-grid { grid-template-columns: 30px repeat(7,1fr) !important; gap: 2px !important; }
          .cal-headers { grid-template-columns: 30px repeat(7,1fr) !important; gap: 2px !important; }
          .day-cell { min-height: 64px !important; padding: 4px 2px 2px !important; border-radius: 4px !important; }
          .kw-cell { font-size: 9px !important; padding-top: 6px !important; min-height: 64px !important; }
          .entry-bar { font-size: 10px !important; padding: 2px 4px !important; border-radius: 3px !important; margin-bottom: 1px; }
          .detail-panel { padding: 14px !important; margin: 8px !important; }
          .main-padding { padding: 8px !important; }
        }
        @media (max-width: 480px) {
          .cal-grid { grid-template-columns: 26px repeat(7,1fr) !important; gap: 1px !important; }
          .cal-headers { grid-template-columns: 26px repeat(7,1fr) !important; gap: 1px !important; }
          .day-cell { min-height: 56px !important; }
          .entry-bar { font-size: 9px !important; padding: 1px 3px !important; }
        }
        input,textarea { background:${T.inputBg}; border:1.5px solid ${T.inputBorder}; border-radius:8px; color:${T.textPrimary}; padding:10px 12px; font-size:14px; font-family:inherit; outline:none; width:100%; transition:border-color .15s; }
        input:focus,textarea:focus { border-color:${T.inputFocus}; box-shadow:0 0 0 3px ${T.inputFocusShadow}; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor:pointer; opacity:.6; ${theme==="gold"?"filter:invert(.8) sepia(1) saturate(2) hue-rotate(5deg);":""} }
        input[type="checkbox"] { width:16px; height:16px; cursor:pointer; accent-color:${T.accent}; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:${theme==="gold"?"#1a1a1a":"#f1f1f1"}; } ::-webkit-scrollbar-thumb { background:${theme==="gold"?"#3a3020":"#ccc"}; border-radius:4px; }
        ${theme==="gold" ? `
          .gold-shimmer { background: linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-size:200%; animation: shimmer 3s linear infinite; }
          @keyframes shimmer { 0%{background-position:0%} 100%{background-position:200%} }
        ` : ""}
      `}</style>

      {/* ── Top Bar ── */}
      <div style={{ background:T.topbar, borderBottom:`1px solid ${T.topbarBorder}`, padding:"0 20px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, boxShadow:T.topbarShadow, transition:"all .4s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="btn" onClick={()=>setSidebarOpen(o=>!o)} style={{ padding:8, borderRadius:8, color:T.textSecondary, fontSize:20 }}>☰</button>
          <span style={{ fontSize:22, fontWeight:700, color:T.calendarTitleColor, fontFamily:T.fontHeading }} className={theme==="gold"?"gold-shimmer":""}>
            {T.calendarTitle}
          </span>
          {/* View selector */}
          <div style={{ display:"flex", gap:4, marginLeft:8, background:theme==="gold"?"#1a1a0a":"#f0f4ff", borderRadius:20, padding:3 }}>
            {GROUPS.map(g => (
              <button key={g} className="btn" onClick={()=>setActiveView(g)} style={{
                background: activeView===g ? (theme==="gold"?"#c9a84c":"#1a73e8") : "transparent",
                color: activeView===g ? (theme==="gold"?"#0d0d0d":"#fff") : T.textSecondary,
                borderRadius:16, padding:"5px 12px", fontSize:12, fontWeight:600, fontFamily:"inherit",
                whiteSpace:"nowrap"
              }}>{g}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:12 }}>
            <button className="btn" onClick={prevMonth} style={{ padding:"6px 10px", borderRadius:8, color:T.textSecondary, fontSize:18 }}>‹</button>
            <span style={{ fontWeight:600, fontSize:17, color:T.textPrimary, minWidth:160, textAlign:"center" }}>{MONTHS[month]} {year}</span>
            <button className="btn" onClick={nextMonth} style={{ padding:"6px 10px", borderRadius:8, color:T.textSecondary, fontSize:18 }}>›</button>
          </div>
          <button className="btn" onClick={()=>{setYear(today.getFullYear());setMonth(today.getMonth());setSelectedDay(today.getDate());}} style={{ background:T.todayBtn, border:`1px solid ${T.todayBtnBorder}`, borderRadius:20, padding:"6px 16px", fontSize:13, color:T.todayBtnColor, fontFamily:"inherit" }}>Heute</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Theme toggle */}
          <button className="btn" onClick={toggleTheme} style={{ background:T.themeBtnBg, color:T.themeBtnColor, borderRadius:20, padding:"6px 16px", fontSize:13, fontFamily:"inherit", fontWeight:600, border:"none", letterSpacing:.5 }}>
            {T.themeBtnLabel}
          </button>
          <div style={{ fontSize:12, color:syncing?T.accent:T.syncColor, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:syncing?T.accent:T.syncColor, display:"inline-block" }}/>
            {syncing?"Speichert…":"Synchronisiert"}
          </div>
          {user && (
            <button className="btn" onClick={()=>{setProfileForm({name:user.name,color:user.color});setShowProfileEditor(true);}} style={{ display:"flex", alignItems:"center", gap:8, background:T.inputBg, border:`1px solid ${T.btnBorder}`, borderRadius:20, padding:"6px 14px" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:user.color }}/>
              <span style={{ fontSize:13, color:T.textPrimary, fontFamily:"inherit", fontWeight:500 }}>{user.name}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"flex", flex:1 }}>

        {/* ── Sidebar ── */}
        <div className="sidebar-width" style={{ width:sidebarOpen?220:0, overflow:"hidden", transition:"width .2s ease", background:T.sidebar, borderRight:`1px solid ${T.sidebarBorder}`, flexShrink:0 }}>
          <div style={{ width:220, padding:"20px 12px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.sidebarLabel, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12, paddingLeft:8 }}>Benutzer</div>
            {allUsers.length===0 && <div style={{ fontSize:13, color:T.textSecondary, paddingLeft:8 }}>Noch keine Benutzer</div>}
            {allUsers.map(u=>(
              <div key={u.key}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px", borderRadius:8, marginBottom:2, transition:"background .12s", position:"relative" }}
                onMouseEnter={e=>{e.currentTarget.style.background=theme==="gold"?"#1a1a0a":"#f8f9fa"; e.currentTarget.querySelector('.del-btn').style.opacity="1";}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent"; e.currentTarget.querySelector('.del-btn').style.opacity="0";}}>
                <input type="checkbox" checked={!hiddenUsers.has(u.key)} onChange={()=>toggleUser(u.key)} style={{ accentColor:u.color, cursor:"pointer" }}/>
                <div style={{ width:12, height:12, borderRadius:3, background:hiddenUsers.has(u.key)?(theme==="gold"?"#333":"#ddd"):u.color, flexShrink:0, cursor:"pointer" }} onClick={()=>toggleUser(u.key)}/>
                <span style={{ fontSize:14, color:hiddenUsers.has(u.key)?T.textSecondary:T.textPrimary, fontWeight:500, flex:1, cursor:"pointer" }} onClick={()=>toggleUser(u.key)}>{u.name}</span>
                <button className="del-btn btn" onClick={e=>{e.stopPropagation();setDeleteConfirm(u.key);}} style={{ opacity:0, transition:"opacity .15s", background:"none", color:"#e74c3c", fontSize:14, padding:"2px 4px", borderRadius:4, lineHeight:1 }}>✕</button>
              </div>
            ))}
            {/* Settings dropdown */}
            <div style={{ marginTop:20, borderTop:`1px solid ${T.sidebarBorder}`, paddingTop:12, position:"relative" }}>
              <button className="btn" onClick={()=>setSettingsOpen(o=>!o)} style={{ width:"100%", background:settingsOpen?(theme==="gold"?"#1a1a0a":"#f0f4ff"):"none", border:`1px solid ${T.btnBorder}`, color:T.textSecondary, borderRadius:8, padding:"9px 12px", fontFamily:"inherit", fontSize:13, textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span>⚙ Settings</span>
                <span style={{ fontSize:10, transition:"transform .2s", display:"inline-block", transform:settingsOpen?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
              </button>
              {settingsOpen && (
                <div style={{ marginTop:6, background:theme==="gold"?"#1a1a0a":"#f8f9fa", borderRadius:8, border:`1px solid ${T.btnBorder}`, overflow:"hidden" }}>
                  <button className="btn" onClick={()=>{setGroupEditor(true);setSettingsOpen(false);}} style={{ width:"100%", background:"none", color:T.textSecondary, padding:"10px 12px", fontFamily:"inherit", fontSize:13, textAlign:"left", borderBottom:`1px solid ${T.btnBorder}` }}>
                    👥 Gruppeneinteilung
                  </button>
                  <button className="btn" onClick={()=>{setResetConfirm('entries');setSettingsOpen(false);}} style={{ width:"100%", background:"none", color:"#e74c3c", padding:"10px 12px", fontFamily:"inherit", fontSize:13, textAlign:"left", borderBottom:`1px solid ${T.btnBorder}` }}>
                    🗑 Alle Einträge löschen
                  </button>
                  <button className="btn" onClick={()=>{setResetConfirm('users');setSettingsOpen(false);}} style={{ width:"100%", background:"none", color:T.textSecondary, padding:"10px 12px", fontFamily:"inherit", fontSize:13, textAlign:"left" }}>
                    🗑 Alle User löschen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Calendar ── */}
        <div className="main-padding" style={{ flex:1, padding:"16px 20px", overflow:"auto" }}>
          {/* Day headers */}
          <div className="cal-headers" style={{ display:"grid", gridTemplateColumns:"48px repeat(7,1fr)", gap:4, marginBottom:4 }}>
            <div style={{ textAlign:"center", fontSize:11, fontWeight:700, color:T.textSecondary, padding:"6px 0" }}>KW</div>
            {DAYS.map((d,i)=>(
              <div key={d} style={{ textAlign:"center", fontSize:12, fontWeight:600, color:i>=5?T.dayNumWeekend:T.textSecondary, padding:"6px 0", letterSpacing:.5 }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="cal-grid" style={{ display:"grid", gridTemplateColumns:"48px repeat(7,1fr)", gap:4 }}>
            {cells.map((d,i)=>{
              // Insert KW label at start of each week row
              const weekIndex = Math.floor(i / 7);
              const dayInWeek = i % 7;
              const kwEl = dayInWeek === 0 ? (() => {
                const weekCells = cells.slice(i, i+7);
                const realDays = weekCells.filter(x => x !== null);
                // Only show KW if Monday of this week is a real day (not a leading empty week)
                const mondayIsReal = weekCells[0] !== null;
                const hasAnyReal = realDays.length > 0;
                // Show KW only if Monday is real, OR if this week has more real days than empty days (majority)
                const showKW = mondayIsReal || realDays.length >= 4;
                const firstRealDay = realDays[0];
                const kw = firstRealDay ? getKW(year, month, firstRealDay - 1) : "";
                return (
                  <div key={`kw-${weekIndex}`} className="kw-cell" style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:8, fontSize:11, fontWeight:700, color:T.textSecondary, minHeight:100 }}>
                    {showKW ? kw : ""}
                  </div>
                );
              })() : null;
              if(!d) return <React.Fragment key={`empty-${i}`}>{kwEl}<div style={{ minHeight:100 }}/></React.Fragment>;
              const dayStr  = toDateStr(year,month,d);
              const dayEnts = getEntriesForDay(dayStr);
              const isSel   = selectedDay===d;
              const isTod   = isToday(d);
              const dow     = (firstDay+d-1)%7;
              const isWe    = dow===5||dow===6;
              return (
                <React.Fragment key={i}>
                  {kwEl}
                  <div className={`day-cell${isSel?" sel":""}`} onClick={()=>openDay(d)}
                  style={{ background:T.cellBg, border:`1px solid ${T.cellBorder}`, minHeight:100, padding:"6px 4px 4px", display:"flex", flexDirection:"column", gap:2, transition:"background .12s" }}>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:2 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                      background:isTod?T.dayNumTodayBg:"transparent",
                      fontWeight:isTod?700:400, fontSize:13,
                      color:isTod?T.dayNumTodayColor:isWe?T.dayNumWeekend:T.dayNumColor,
                      boxShadow:isTod&&theme==="gold"?`0 0 12px ${T.accent}66`:"none",
                    }}>{d}</div>
                  </div>
                  {dayEnts.map((e,ei)=>(
                    <div key={ei} className="entry-bar" style={{ background:e.color, borderRadius:4, padding:"2px 6px", fontSize:11, color:"#fff", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", fontWeight:500, boxShadow:theme==="gold"?`0 1px 4px ${e.color}66`:"none" }}>{e.title}</div>
                  ))}
                </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Day detail */}
          {selectedDay && (
            <div className="detail-panel" style={{ marginTop:20, background:T.detailBg, borderRadius:12, border:`1px solid ${T.detailBorder}`, padding:20, boxShadow:T.detailShadow }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:13, color:T.textSecondary }}>{MONTHS[month]} {year}</div>
                  <div style={{ fontSize:24, fontWeight:700, color:T.textPrimary }}>{selectedDay}.</div>
                </div>
                <button className="btn" onClick={openAddModal} style={{ background:T.accent, color:theme==="gold"?"#0d0d0d":"#fff", borderRadius:20, padding:"10px 20px", fontWeight:600, fontSize:13, fontFamily:"inherit", boxShadow:`0 2px 8px ${T.accent}55` }}>+ Eintrag</button>
              </div>
              {selectedEntries.length===0
                ? <div style={{ textAlign:"center", color:T.textSecondary, padding:"24px 0", fontSize:14 }}>Keine Einträge für diesen Tag.</div>
                : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {selectedEntries.map(entry=>(
                      <div key={entry.id} style={{ background:T.entryBg, borderRadius:10, padding:"12px 14px", borderLeft:`4px solid ${entry.color}`, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            <span style={{ fontWeight:600, fontSize:15, color:T.textPrimary }}>{entry.title}</span>
                            {entry.author && <span style={{ fontSize:11, color:"#fff", background:entry.color, borderRadius:10, padding:"2px 8px", fontWeight:500 }}>{entry.author}</span>}
                          </div>
                          <div style={{ fontSize:12, color:T.textSecondary, marginTop:3 }}>
                            {entry.startDate===entry.endDate?fmtDate(entry.startDate):`${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate)}`}
                          </div>
                          {entry.note && <div style={{ fontSize:13, color:T.textSecondary, marginTop:4 }}>{entry.note}</div>}
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          <button className="btn" onClick={()=>openEditModal(entry)} style={{ background:T.inputBg, border:`1px solid ${T.btnBorder}`, color:T.textSecondary, borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:"inherit" }}>✎</button>
                          <button className="btn" onClick={()=>deleteEntry(entry.id)} style={{ background:T.inputBg, border:"1px solid #c0392b44", color:"#e74c3c", borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:"inherit" }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Entry Modal ── */}
      {modal && (
        <div className="mbg" onClick={()=>setModal(false)} style={{ position:"fixed", inset:0, background:T.modalOverlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(3px)" }}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{ background:T.modalBg, borderRadius:16, padding:28, width:"90%", maxWidth:460, boxShadow:"0 8px 40px rgba(0,0,0,.3)", border:theme==="gold"?`1px solid #3a3020`:"none" }}>
            <div style={{ fontWeight:700, fontSize:18, color:T.textPrimary, marginBottom:4 }}>{editId?"Eintrag bearbeiten":"Neuer Eintrag"}</div>
            {user && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:18 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:user.color }}/>
              <span style={{ fontSize:12, color:T.textSecondary }}>Als {user.name}</span>
            </div>}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:T.textSecondary, display:"block", marginBottom:6 }}>TITEL *</label>
                <input placeholder="z.B. Urlaub, Meeting, Geburtstag…" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:T.textSecondary, display:"block", marginBottom:6 }}>STARTDATUM *</label>
                  <input type="date" value={form.startDate} onChange={e=>{const v=e.target.value;setForm(f=>({...f,startDate:v,endDate:f.endDate<v?v:f.endDate}));}}/>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:T.textSecondary, display:"block", marginBottom:6 }}>ENDDATUM *</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:T.textSecondary, display:"block", marginBottom:6 }}>NOTIZ</label>
                <textarea rows={3} placeholder="Optionale Notiz…" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{ resize:"none" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              <button className="btn" onClick={()=>setModal(false)} style={{ flex:1, background:T.inputBg, border:`1px solid ${T.btnBorder}`, color:T.textSecondary, borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14 }}>Abbrechen</button>
              <button className="btn" onClick={saveEntry} style={{ flex:2, background:canSave?T.accent:T.btnBorder, color:canSave?(theme==="gold"?"#0d0d0d":"#fff"):T.textSecondary, borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:canSave?"pointer":"default" }}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Modal ── */}
      {(showProfileSetup||showProfileEditor) && (
        <div className="mbg" onClick={()=>{if(showProfileEditor)setShowProfileEditor(false);}} style={{ position:"fixed", inset:0, background:T.modalOverlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(3px)" }}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{ background:T.modalBg, borderRadius:16, padding:32, width:"90%", maxWidth:420, boxShadow:"0 8px 40px rgba(0,0,0,.3)", border:theme==="gold"?`1px solid #3a3020`:"none" }}>
            {showProfileSetup
              ? <div style={{ textAlign:"center", marginBottom:24 }}>
                  <div style={{ fontSize:28, fontWeight:700, color:T.accent, marginBottom:6 }}>Willkommen!</div>
                  <div style={{ color:T.textSecondary, fontSize:14, lineHeight:1.6 }}>Wähle deinen Namen und deine Farbe.<br/>Alle deine Einträge erscheinen in dieser Farbe.</div>
                </div>
              : <div style={{ fontWeight:700, fontSize:18, color:T.textPrimary, marginBottom:20 }}>Profil bearbeiten</div>
            }
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:T.textSecondary, display:"block", marginBottom:6 }}>DEIN NAME *</label>
                <input placeholder="z.B. Anna, Max…" value={profileForm.name} onChange={e=>handleNameChange(e.target.value)} autoFocus/>
                {nameHint==="known" && <div style={{ marginTop:8, fontSize:12, color:T.syncColor, background:theme==="gold"?"#0a1a0a":"#e6f4ea", borderRadius:6, padding:"8px 12px" }}>✓ Name erkannt — deine Farbe wurde automatisch gesetzt.</div>}
                {colorTakenWarning && <div style={{ marginTop:8, fontSize:12, color:"#e74c3c", background:theme==="gold"?"#2a0a0a":"#fce8e6", borderRadius:6, padding:"8px 12px" }}>⚠ Diese Farbe ist bereits von <strong>{colorTakenWarning}</strong> belegt — bitte wähle eine andere.</div>}
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:T.textSecondary, display:"block", marginBottom:10 }}>DEINE FARBE</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {COLORS.map(c=>{
                    const takenBy = Object.entries(userDir).find(([k,v]) => v === c);
                    const isTaken = takenBy && takenBy[0] !== profileForm.name.trim().toLowerCase();
                    const takenName = takenBy ? takenBy[0].charAt(0).toUpperCase() + takenBy[0].slice(1) : null;
                    return (
                      <div key={c} style={{ position:"relative", flexShrink:0 }}>
                        <div onClick={()=>setProfileForm(f=>({...f,color:c}))} style={{ width:30, height:30, borderRadius:"50%", background:c, cursor:"pointer", border:profileForm.color===c?`3px solid ${T.accent}`:"3px solid transparent", transform:profileForm.color===c?"scale(1.2)":"scale(1)", transition:"transform .1s,border-color .1s", opacity:isTaken?.8:1 }}/>
                        {isTaken && (
                          <div style={{ position:"absolute", top:-6, right:-6, background:"#e74c3c", color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, pointerEvents:"none" }} title={`Belegt von ${takenName}`}>!</div>
                        )}
                        {isTaken && (
                          <div style={{ position:"absolute", bottom:-16, left:"50%", transform:"translateX(-50%)", fontSize:8, color:T.textSecondary, whiteSpace:"nowrap" }}>{takenName}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:20, fontSize:12, color:T.textSecondary }}>
                  <span style={{ color:"#e74c3c", fontWeight:700 }}>!</span> = bereits vergeben
                </div>
              </div>
              <div style={{ background:T.entryBg, borderRadius:10, padding:"12px 14px", borderLeft:`4px solid ${profileForm.color}`, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:profileForm.color }}/>
                <span style={{ fontSize:14, color:T.textSecondary }}>Vorschau:</span>
                <span style={{ fontWeight:600, fontSize:14, flex:1, color:T.textPrimary }}>{profileForm.name||"Dein Name"}</span>
                <span style={{ fontSize:11, color:"#fff", background:profileForm.color, borderRadius:10, padding:"2px 8px" }}>{profileForm.name||"Dein Name"}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              {showProfileEditor && <button className="btn" onClick={()=>setShowProfileEditor(false)} style={{ flex:1, background:T.inputBg, border:`1px solid ${T.btnBorder}`, color:T.textSecondary, borderRadius:10, padding:"12px", fontFamily:"inherit", fontSize:14 }}>Abbrechen</button>}
              <button className="btn" onClick={saveProfileHandler} style={{ flex:2, background:profileForm.name.trim()?T.accent:T.btnBorder, color:profileForm.name.trim()?(theme==="gold"?"#0d0d0d":"#fff"):T.textSecondary, borderRadius:10, padding:"13px", fontFamily:"inherit", fontSize:15, fontWeight:600, cursor:profileForm.name.trim()?"pointer":"default" }}>
                {showProfileSetup?"Los geht's →":"Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Editor Modal ── */}
      {groupEditor && (
        <div className="mbg" onClick={()=>setGroupEditor(false)} style={{ position:"fixed", inset:0, background:T.modalOverlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(3px)" }}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{ background:T.modalBg, borderRadius:16, padding:28, width:"90%", maxWidth:520, boxShadow:"0 8px 40px rgba(0,0,0,.3)", border:theme==="gold"?"1px solid #3a3020":"none", maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:18, color:T.textPrimary }}>👥 Gruppeneinteilung</div>
              <button className="btn" onClick={()=>setGroupEditor(false)} style={{ color:T.textSecondary, fontSize:20, padding:4 }}>✕</button>
            </div>
            <div style={{ fontSize:13, color:T.textSecondary, marginBottom:20 }}>Ein User kann in mehreren Gruppen gleichzeitig sein.</div>
            {GROUPS.filter(g => g !== "Gesamt Equities").map(group => (
              <div key={group} style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.accent, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${T.btnBorder}` }}>{group}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {allUsers.map(u => {
                    const inGroup = (groupConfig[group] ?? []).includes(u.key);
                    return (
                      <div key={u.key} onClick={()=>toggleUserInGroup(group, u.key)} style={{
                        display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20,
                        border:`2px solid ${inGroup ? u.color : T.btnBorder}`,
                        background: inGroup ? u.color+"22" : "transparent",
                        cursor:"pointer", transition:"all .15s"
                      }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:u.color }}/>
                        <span style={{ fontSize:13, fontWeight:inGroup?600:400, color:inGroup?T.textPrimary:T.textSecondary }}>{u.name}</span>
                        {inGroup && <span style={{ fontSize:10, color:u.color }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button className="btn" onClick={()=>setGroupEditor(false)} style={{ width:"100%", background:T.accent, color:theme==="gold"?"#0d0d0d":"#fff", borderRadius:10, padding:"12px", fontFamily:"inherit", fontSize:14, fontWeight:600, marginTop:8 }}>Fertig</button>
          </div>
        </div>
      )}

      {/* ── Reset Confirm Dialog ── */}
      {resetConfirm && (
        <div className="mbg" onClick={()=>setResetConfirm(null)} style={{ position:"fixed", inset:0, background:T.modalOverlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(3px)" }}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{ background:T.modalBg, borderRadius:16, padding:28, width:"90%", maxWidth:380, boxShadow:"0 8px 40px rgba(0,0,0,.3)", border:theme==="gold"?"1px solid #3a3020":"none", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
            <div style={{ fontWeight:700, fontSize:18, color:T.textPrimary, marginBottom:8 }}>
              {resetConfirm==="entries" ? "Alle Einträge löschen?" : "Alle User löschen?"}
            </div>
            <div style={{ fontSize:14, color:T.textSecondary, marginBottom:24, lineHeight:1.6 }}>
              {resetConfirm==="entries"
                ? "Alle Kalendereinträge werden unwiderruflich gelöscht. User bleiben erhalten."
                : "Alle User werden aus der Sidebar entfernt. Einträge bleiben erhalten."}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={()=>setResetConfirm(null)} style={{ flex:1, background:T.inputBg, border:`1px solid ${T.btnBorder}`, color:T.textSecondary, borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14 }}>Abbrechen</button>
              <button className="btn" onClick={resetConfirm==="entries" ? resetEntries : resetUsers} style={{ flex:1, background:"#e74c3c", color:"#fff", borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14, fontWeight:600 }}>Ja, löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {deleteConfirm && (
        <div className="mbg" onClick={()=>setDeleteConfirm(null)} style={{ position:"fixed", inset:0, background:T.modalOverlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(3px)" }}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{ background:T.modalBg, borderRadius:16, padding:28, width:"90%", maxWidth:380, boxShadow:"0 8px 40px rgba(0,0,0,.3)", border:theme==="gold"?"1px solid #3a3020":"none", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
            <div style={{ fontWeight:700, fontSize:18, color:T.textPrimary, marginBottom:8 }}>User löschen?</div>
            <div style={{ fontSize:14, color:T.textSecondary, marginBottom:24, lineHeight:1.6 }}>
              Möchtest du <strong style={{ color:T.textPrimary }}>{deleteConfirm.charAt(0).toUpperCase() + deleteConfirm.slice(1)}</strong> wirklich komplett löschen?<br/>
              Alle Einträge dieses Users bleiben erhalten.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={()=>setDeleteConfirm(null)} style={{ flex:1, background:T.inputBg, border:`1px solid ${T.btnBorder}`, color:T.textSecondary, borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14 }}>Abbrechen</button>
              <button className="btn" onClick={()=>deleteUser(deleteConfirm)} style={{ flex:1, background:"#e74c3c", color:"#fff", borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14, fontWeight:600 }}>Ja, löschen</button>
            </div>
          </div>
        </div>
      )}

      {!loaded && (
        <div style={{ position:"fixed", inset:0, background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
          <div style={{ color:T.textSecondary, fontSize:14 }}>Lade Kalender…</div>
        </div>
      )}
    </div>
  );
}

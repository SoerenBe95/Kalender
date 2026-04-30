import { useState, useEffect, useRef } from "react";

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const COLORS = [
  "#e74c3c","#c0392b","#ff6b6b","#e67e22","#f39c12","#f1c40f",
  "#a8e063","#2ecc71","#1abc9c","#16a085","#3498db","#2980b9",
  "#1565c0","#9b59b6","#8e44ad","#e91e63","#ad1457","#795548",
  "#90a4ae","#607d8b"
];

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

function loadProfile() {
  try { return JSON.parse(localStorage.getItem("kal-profile")) ?? null; } catch { return null; }
}
function saveProfile(p) {
  try { localStorage.setItem("kal-profile", JSON.stringify(p)); } catch {}
}

export default function Kalender() {
  const today    = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth());
  const [entries, setEntries] = useState([]);
  const [userDir, setUserDir] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [modal, setModal]     = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState({ title: "", startDate: "", endDate: "", note: "" });
  const [loaded, setLoaded]   = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [user, setUser]                         = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm]           = useState({ name: "", color: COLORS[2] });
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [nameHint, setNameHint]                 = useState(null);

  // Sidebar
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [hiddenUsers, setHiddenUsers]   = useState(new Set());

  const intervalRef = useRef(null);
  const dataRef     = useRef({ entries: [], userDirectory: {} });

  useEffect(() => {
    const p = loadProfile();
    if (p?.name) setUser(p); else setShowProfileSetup(true);
    fetchData().then(data => {
      if (data) { dataRef.current = data; setEntries(data.entries ?? []); setUserDir(data.userDirectory ?? {}); }
      setLoaded(true);
    });
    intervalRef.current = setInterval(() => {
      fetchData().then(data => {
        if (data) { dataRef.current = data; setEntries(data.entries ?? []); setUserDir(data.userDirectory ?? {}); }
      });
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const saveProfileHandler = async () => {
    const name = profileForm.name.trim();
    if (!name) return;
    const p = { name, color: profileForm.color };
    setUser(p); saveProfile(p); setNameHint(null);
    const updatedDir = { ...dataRef.current.userDirectory, [name.toLowerCase()]: profileForm.color };
    const updatedData = { ...dataRef.current, userDirectory: updatedDir };
    dataRef.current = updatedData; setUserDir(updatedDir);
    await pushData(updatedData);
    setShowProfileSetup(false); setShowProfileEditor(false);
  };

  const handleNameChange = (v) => {
    const knownColor = userDir[v.trim().toLowerCase()];
    setNameHint(knownColor ? "known" : null);
    setProfileForm(f => ({ ...f, name: v, ...(knownColor ? { color: knownColor } : {}) }));
  };

  const toggleUser = (name) => {
    setHiddenUsers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const getEntriesForDay = (dayStr) =>
    entries.filter(e => e?.startDate && e?.endDate && dateInRange(dayStr, e.startDate, e.endDate) && !hiddenUsers.has(e.author));

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

  const saveEntry = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate || !user) return;
    setSyncing(true);
    const start = form.startDate <= form.endDate ? form.startDate : form.endDate;
    const end   = form.startDate <= form.endDate ? form.endDate   : form.startDate;
    const entry = { title: form.title.trim(), startDate: start, endDate: end, note: form.note, color: user.color, author: user.name };
    const updated = editId
      ? dataRef.current.entries.map(e => e.id === editId ? { ...entry, id: editId } : e)
      : [...dataRef.current.entries, { ...entry, id: Date.now().toString() }];
    const updatedData = { ...dataRef.current, entries: updated };
    dataRef.current = updatedData; setEntries(updated);
    await pushData(updatedData);
    setSyncing(false); setModal(false); setEditId(null);
  };

  const deleteEntry = async (id) => {
    const updated = dataRef.current.entries.filter(e => e.id !== id);
    const updatedData = { ...dataRef.current, entries: updated };
    dataRef.current = updatedData; setEntries(updated);
    await pushData(updatedData);
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

  // All known users from directory
  const allUsers = Object.entries(userDir).map(([name, color]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    color,
    key: name
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fa", fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f9fa; }
        .btn { cursor:pointer; border:none; transition:all .15s; }
        .btn:hover { opacity:.85; }
        .day-cell { cursor:pointer; transition:background .12s; border-radius:8px; }
        .day-cell:hover { background:#f0f4ff !important; }
        .day-cell.selected { background:#e8f0fe !important; outline: 2px solid #1a73e8; }
        .mbg { animation:fi .18s ease; }
        .mbox { animation:si .2s cubic-bezier(.22,1,.36,1); }
        @keyframes fi { from{opacity:0}to{opacity:1} }
        @keyframes si { from{transform:translateY(20px) scale(.97);opacity:0}to{transform:none;opacity:1} }
        input, textarea { background:#fff; border:1.5px solid #dadce0; border-radius:8px; color:#202124; padding:10px 12px; font-size:14px; font-family:inherit; outline:none; width:100%; transition:border-color .15s; }
        input:focus, textarea:focus { border-color:#1a73e8; box-shadow: 0 0 0 3px #1a73e820; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor:pointer; opacity:.6; }
        input[type="checkbox"] { width:16px; height:16px; cursor:pointer; accent-color:#1a73e8; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#f1f1f1; } ::-webkit-scrollbar-thumb { background:#ccc; border-radius:4px; }
      `}</style>

      {/* ── Top Bar ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e0e0e0", padding:"0 20px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 3px rgba(0,0,0,.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <button className="btn" onClick={()=>setSidebarOpen(o=>!o)} style={{ background:"none", padding:8, borderRadius:8, color:"#5f6368", fontSize:20 }}>☰</button>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:22, fontWeight:700, color:"#1a73e8" }}>Kalender</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:16 }}>
            <button className="btn" onClick={prevMonth} style={{ background:"none", padding:"6px 10px", borderRadius:8, color:"#5f6368", fontSize:18 }}>‹</button>
            <span style={{ fontWeight:600, fontSize:17, color:"#202124", minWidth:160, textAlign:"center" }}>{MONTHS[month]} {year}</span>
            <button className="btn" onClick={nextMonth} style={{ background:"none", padding:"6px 10px", borderRadius:8, color:"#5f6368", fontSize:18 }}>›</button>
          </div>
          <button className="btn" onClick={()=>{setYear(today.getFullYear());setMonth(today.getMonth());setSelectedDay(today.getDate());}} style={{ background:"#fff", border:"1px solid #dadce0", borderRadius:20, padding:"6px 16px", fontSize:13, color:"#3c4043", fontFamily:"inherit" }}>Heute</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:12, color: syncing?"#f39c12":"#34a853", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background: syncing?"#f39c12":"#34a853", display:"inline-block" }}/>
            {syncing ? "Speichert…" : "Synchronisiert"}
          </div>
          {user && (
            <button className="btn" onClick={()=>{setProfileForm({name:user.name,color:user.color});setShowProfileEditor(true);}} style={{ display:"flex", alignItems:"center", gap:8, background:"#f8f9fa", border:"1px solid #dadce0", borderRadius:20, padding:"6px 14px" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:user.color }}/>
              <span style={{ fontSize:13, color:"#202124", fontFamily:"inherit", fontWeight:500 }}>{user.name}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"flex", flex:1 }}>

        {/* ── Sidebar ── */}
        <div style={{ width: sidebarOpen ? 220 : 0, overflow:"hidden", transition:"width .2s ease", background:"#fff", borderRight:"1px solid #e0e0e0", flexShrink:0 }}>
          <div style={{ width:220, padding:"20px 12px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#5f6368", letterSpacing:1, textTransform:"uppercase", marginBottom:12, paddingLeft:8 }}>Benutzer</div>
            {allUsers.length === 0 && (
              <div style={{ fontSize:13, color:"#bbb", paddingLeft:8 }}>Noch keine Benutzer</div>
            )}
            {allUsers.map(u => (
              <div key={u.key} onClick={()=>toggleUser(u.key)} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 8px", borderRadius:8, cursor:"pointer", transition:"background .12s", marginBottom:2, background: hiddenUsers.has(u.key) ? "transparent" : "transparent" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f8f9fa"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={!hiddenUsers.has(u.key)} onChange={()=>toggleUser(u.key)} onClick={e=>e.stopPropagation()} style={{ accentColor: u.color }}/>
                <div style={{ width:12, height:12, borderRadius:3, background: hiddenUsers.has(u.key) ? "#ddd" : u.color, flexShrink:0, transition:"background .15s" }}/>
                <span style={{ fontSize:14, color: hiddenUsers.has(u.key) ? "#aaa" : "#202124", fontWeight:500 }}>{u.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Calendar ── */}
        <div style={{ flex:1, padding:"16px 20px", overflow:"auto" }}>

          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
            {DAYS.map((d,i) => (
              <div key={d} style={{ textAlign:"center", fontSize:12, fontWeight:600, color: i>=5 ? "#e74c3c" : "#5f6368", padding:"6px 0", letterSpacing:.5 }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} style={{ minHeight:100 }}/>;
              const dayStr  = toDateStr(year, month, d);
              const dayEnts = getEntriesForDay(dayStr);
              const isSel   = selectedDay === d;
              const isTod   = isToday(d);
              const dow     = (firstDay+d-1)%7;
              const isWe    = dow===5||dow===6;
              return (
                <div key={i} className={`day-cell${isSel?" selected":""}`} onClick={()=>openDay(d)}
                  style={{ background:"#fff", border:"1px solid #e8eaed", minHeight:100, padding:"6px 4px 4px", display:"flex", flexDirection:"column", gap:2, position:"relative" }}>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:2 }}>
                    <div style={{
                      width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                      background: isTod ? "#1a73e8" : "transparent",
                      fontWeight: isTod ? 700 : 400,
                      fontSize:13,
                      color: isTod ? "#fff" : isWe ? "#e74c3c" : "#202124",
                    }}>{d}</div>
                  </div>
                  {dayEnts.slice(0,3).map((e,ei)=>(
                    <div key={ei} style={{ background:e.color, borderRadius:4, padding:"2px 6px", fontSize:11, color:"#fff", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", fontWeight:500 }}>{e.title}</div>
                  ))}
                  {dayEnts.length>3 && <div style={{ fontSize:11, color:"#5f6368", paddingLeft:4 }}>+{dayEnts.length-3} weitere</div>}
                </div>
              );
            })}
          </div>

          {/* Day detail */}
          {selectedDay && (
            <div style={{ marginTop:20, background:"#fff", borderRadius:12, border:"1px solid #e0e0e0", padding:20, boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:13, color:"#5f6368" }}>{MONTHS[month]} {year}</div>
                  <div style={{ fontSize:24, fontWeight:700, color:"#202124" }}>{selectedDay}.</div>
                </div>
                <button className="btn" onClick={openAddModal} style={{ background:"#1a73e8", color:"#fff", borderRadius:20, padding:"10px 20px", fontWeight:600, fontSize:13, fontFamily:"inherit", boxShadow:"0 1px 3px rgba(26,115,232,.4)" }}>+ Eintrag</button>
              </div>
              {selectedEntries.length===0
                ? <div style={{ textAlign:"center", color:"#bbb", padding:"24px 0", fontSize:14 }}>Keine Einträge für diesen Tag.</div>
                : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {selectedEntries.map(entry=>(
                      <div key={entry.id} style={{ background:"#f8f9fa", borderRadius:10, padding:"12px 14px", borderLeft:`4px solid ${entry.color}`, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            <span style={{ fontWeight:600, fontSize:15, color:"#202124" }}>{entry.title}</span>
                            {entry.author && <span style={{ fontSize:11, color:"#fff", background:entry.color, borderRadius:10, padding:"2px 8px", fontWeight:500 }}>{entry.author}</span>}
                          </div>
                          <div style={{ fontSize:12, color:"#5f6368", marginTop:3 }}>
                            {entry.startDate===entry.endDate ? fmtDate(entry.startDate) : `${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate)}`}
                          </div>
                          {entry.note && <div style={{ fontSize:13, color:"#5f6368", marginTop:4 }}>{entry.note}</div>}
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          <button className="btn" onClick={()=>openEditModal(entry)} style={{ background:"#fff", border:"1px solid #dadce0", color:"#5f6368", borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:"inherit" }}>✎</button>
                          <button className="btn" onClick={()=>deleteEntry(entry.id)} style={{ background:"#fff", border:"1px solid #fce8e6", color:"#d93025", borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:"inherit" }}>✕</button>
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
        <div className="mbg" onClick={()=>setModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(2px)" }}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:28, width:"90%", maxWidth:460, boxShadow:"0 8px 32px rgba(0,0,0,.18)" }}>
            <div style={{ fontWeight:700, fontSize:18, color:"#202124", marginBottom:4 }}>{editId?"Eintrag bearbeiten":"Neuer Eintrag"}</div>
            {user && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:18 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:user.color }}/>
              <span style={{ fontSize:12, color:"#5f6368" }}>Als {user.name}</span>
            </div>}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"#5f6368", display:"block", marginBottom:6 }}>TITEL *</label>
                <input placeholder="z.B. Urlaub, Meeting, Geburtstag…" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#5f6368", display:"block", marginBottom:6 }}>STARTDATUM *</label>
                  <input type="date" value={form.startDate} onChange={e=>{const v=e.target.value;setForm(f=>({...f,startDate:v,endDate:f.endDate<v?v:f.endDate}));}}/>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#5f6368", display:"block", marginBottom:6 }}>ENDDATUM *</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"#5f6368", display:"block", marginBottom:6 }}>NOTIZ</label>
                <textarea rows={3} placeholder="Optionale Notiz…" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{ resize:"none" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              <button className="btn" onClick={()=>setModal(false)} style={{ flex:1, background:"#fff", border:"1px solid #dadce0", color:"#5f6368", borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14 }}>Abbrechen</button>
              <button className="btn" onClick={saveEntry} style={{ flex:2, background:canSave?"#1a73e8":"#e8eaed", color:canSave?"#fff":"#bbb", borderRadius:10, padding:"11px", fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:canSave?"pointer":"default" }}>
                {syncing?"Speichert…":"Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Modal ── */}
      {(showProfileSetup||showProfileEditor) && (
        <div className="mbg" onClick={()=>{if(showProfileEditor)setShowProfileEditor(false);}} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(2px)" }}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:32, width:"90%", maxWidth:420, boxShadow:"0 8px 32px rgba(0,0,0,.18)" }}>
            {showProfileSetup
              ? <div style={{ textAlign:"center", marginBottom:24 }}>
                  <div style={{ fontSize:28, fontWeight:700, color:"#1a73e8", marginBottom:6 }}>Willkommen!</div>
                  <div style={{ color:"#5f6368", fontSize:14, lineHeight:1.6 }}>Wähle deinen Namen und deine Farbe.<br/>Alle deine Einträge erscheinen in dieser Farbe.</div>
                </div>
              : <div style={{ fontWeight:700, fontSize:18, color:"#202124", marginBottom:20 }}>Profil bearbeiten</div>
            }
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"#5f6368", display:"block", marginBottom:6 }}>DEIN NAME *</label>
                <input placeholder="z.B. Anna, Max…" value={profileForm.name} onChange={e=>handleNameChange(e.target.value)} autoFocus/>
                {nameHint==="known" && <div style={{ marginTop:8, fontSize:12, color:"#34a853", background:"#e6f4ea", borderRadius:6, padding:"8px 12px" }}>✓ Name erkannt — deine Farbe wurde automatisch gesetzt.</div>}
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"#5f6368", display:"block", marginBottom:10 }}>DEINE FARBE</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {COLORS.map(c=>(
                    <div key={c} onClick={()=>setProfileForm(f=>({...f,color:c}))} style={{ width:30, height:30, borderRadius:"50%", background:c, cursor:"pointer", border:profileForm.color===c?"3px solid #202124":"3px solid transparent", transform:profileForm.color===c?"scale(1.2)":"scale(1)", transition:"transform .1s,border-color .1s", flexShrink:0 }}/>
                  ))}
                </div>
              </div>
              <div style={{ background:"#f8f9fa", borderRadius:10, padding:"12px 14px", borderLeft:`4px solid ${profileForm.color}`, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:profileForm.color }}/>
                <span style={{ fontSize:14, color:"#5f6368" }}>Vorschau:</span>
                <span style={{ fontWeight:600, fontSize:14, flex:1, color:"#202124" }}>{profileForm.name||"Dein Name"}</span>
                <span style={{ fontSize:11, color:"#fff", background:profileForm.color, borderRadius:10, padding:"2px 8px" }}>{profileForm.name||"Dein Name"}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              {showProfileEditor && <button className="btn" onClick={()=>setShowProfileEditor(false)} style={{ flex:1, background:"#fff", border:"1px solid #dadce0", color:"#5f6368", borderRadius:10, padding:"12px", fontFamily:"inherit", fontSize:14 }}>Abbrechen</button>}
              <button className="btn" onClick={saveProfileHandler} style={{ flex:2, background:profileForm.name.trim()?"#1a73e8":"#e8eaed", color:profileForm.name.trim()?"#fff":"#bbb", borderRadius:10, padding:"13px", fontFamily:"inherit", fontSize:15, fontWeight:600, cursor:profileForm.name.trim()?"pointer":"default" }}>
                {showProfileSetup?"Los geht's →":"Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!loaded && (
        <div style={{ position:"fixed", inset:0, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
          <div style={{ color:"#5f6368", fontSize:14 }}>Lade Kalender…</div>
        </div>
      )}
    </div>
  );
}	

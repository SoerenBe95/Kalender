import { useState, useEffect, useRef } from "react";

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const COLORS = [
  "#e74c3c","#c0392b","#ff6b6b","#e67e22","#f39c12","#f1c40f",
  "#a8e063","#2ecc71","#1abc9c","#16a085","#3498db","#2980b9",
  "#1565c0","#9b59b6","#8e44ad","#e91e63","#ad1457","#795548",
  "#90a4ae","#ecf0f1"
];

// ─── JSONBin.io API ───────────────────────────────────────────────────────────
// Replace these two values with your own from jsonbin.io (see README.md)
const BIN_ID  = import.meta.env.VITE_BIN_ID;
const API_KEY = import.meta.env.VITE_API_KEY;
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function fetchData() {
  try {
    const res = await fetch(BIN_URL + "/latest", {
      headers: { "X-Master-Key": API_KEY }
    });
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// Profile stored only locally per device
function loadProfile() {
  try { return JSON.parse(localStorage.getItem("kal-profile")) ?? null; } catch { return null; }
}
function saveProfile(p) {
  try { localStorage.setItem("kal-profile", JSON.stringify(p)); } catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Kalender() {
  const today    = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

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

  const [user, setUser]                   = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm]     = useState({ name: "", color: COLORS[2] });
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [nameHint, setNameHint]           = useState(null); // "known" | null

  const intervalRef = useRef(null);
  const dataRef     = useRef({ entries: [], userDirectory: {} });

  // Initial load
  useEffect(() => {
    const p = loadProfile();
    if (p?.name) setUser(p); else setShowProfileSetup(true);

    fetchData().then(data => {
      if (data) {
        dataRef.current = data;
        setEntries(data.entries ?? []);
        setUserDir(data.userDirectory ?? {});
      }
      setLoaded(true);
    });

    // Poll every 10s
    intervalRef.current = setInterval(() => {
      fetchData().then(data => {
        if (data) {
          dataRef.current = data;
          setEntries(data.entries ?? []);
          setUserDir(data.userDirectory ?? {});
        }
      });
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Profile ────────────────────────────────────────────────────────────────
  const saveProfileHandler = async () => {
    const name = profileForm.name.trim();
    if (!name) return;
    const p = { name, color: profileForm.color };
    setUser(p);
    saveProfile(p);
    setNameHint(null);

    // Write name->color into shared directory
    const updatedDir = { ...dataRef.current.userDirectory, [name.toLowerCase()]: profileForm.color };
    const updatedData = { ...dataRef.current, userDirectory: updatedDir };
    dataRef.current = updatedData;
    setUserDir(updatedDir);
    await pushData(updatedData);

    setShowProfileSetup(false);
    setShowProfileEditor(false);
  };

  const handleNameChange = (v) => {
    const knownColor = userDir[v.trim().toLowerCase()];
    setNameHint(knownColor ? "known" : null);
    setProfileForm(f => ({ ...f, name: v, ...(knownColor ? { color: knownColor } : {}) }));
  };

  // ── Entries ────────────────────────────────────────────────────────────────
  const getEntriesForDay = (dayStr) =>
    entries.filter(e => e?.startDate && e?.endDate && dateInRange(dayStr, e.startDate, e.endDate));

  const openDay      = (d) => { setSelectedDay(d); setModal(false); setEditId(null); };
  const openAddModal = () => {
    const def = toDateStr(year, month, selectedDay);
    setForm({ title: "", startDate: def, endDate: def, note: "" });
    setEditId(null);
    setModal(true);
  };
  const openEditModal = (entry) => {
    setForm({ title: entry.title, startDate: entry.startDate, endDate: entry.endDate, note: entry.note || "" });
    setEditId(entry.id);
    setModal(true);
  };

  const saveEntry = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate || !user) return;
    setSyncing(true);
    const start = form.startDate <= form.endDate ? form.startDate : form.endDate;
    const end   = form.startDate <= form.endDate ? form.endDate   : form.startDate;
    const entry = { title: form.title.trim(), startDate: start, endDate: end,
                    note: form.note, color: user.color, author: user.name };

    const updated = editId
      ? dataRef.current.entries.map(e => e.id === editId ? { ...entry, id: editId } : e)
      : [...dataRef.current.entries, { ...entry, id: Date.now().toString() }];

    const updatedData = { ...dataRef.current, entries: updated };
    dataRef.current = updatedData;
    setEntries(updated);
    await pushData(updatedData);
    setSyncing(false);
    setModal(false);
    setEditId(null);
  };

  const deleteEntry = async (id) => {
    const updated = dataRef.current.entries.filter(e => e.id !== id);
    const updatedData = { ...dataRef.current, entries: updated };
    dataRef.current = updatedData;
    setEntries(updated);
    await pushData(updatedData);
  };

  // ── Calendar math ──────────────────────────────────────────────────────────
  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelectedDay(null); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday        = (d) => toDateStr(year, month, d) === todayStr;
  const selectedDayStr = selectedDay ? toDateStr(year, month, selectedDay) : null;
  const selectedEntries= selectedDayStr ? getEntriesForDay(selectedDayStr) : [];
  const canSave        = form.title.trim() && form.startDate && form.endDate;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#0f0f13",color:"#f0ede8",
      fontFamily:"'DM Sans','Segoe UI',sans-serif",
      display:"flex",flexDirection:"column",alignItems:"center",padding:"0 0 60px"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Playfair+Display:ital,wght@1,700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#1a1a22}::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
        .dc{transition:background .15s,transform .1s;cursor:pointer}
        .dc:hover{background:#1e1e2a!important;transform:scale(1.04)}
        .dc.sel{background:#1e1e2a!important;outline:2px solid #f0ede8}
        .btn{cursor:pointer;border:none;transition:opacity .15s,transform .1s}
        .btn:hover{opacity:.85;transform:translateY(-1px)}.btn:active{transform:translateY(0)}
        .mbg{animation:fi .18s ease}.mbox{animation:si .2s cubic-bezier(.22,1,.36,1)}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        @keyframes si{from{transform:translateY(24px) scale(.97);opacity:0}to{transform:none;opacity:1}}
        input,textarea{background:#1a1a22;border:1.5px solid #2a2a36;border-radius:8px;color:#f0ede8;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;width:100%;transition:border-color .15s}
        input:focus,textarea:focus{border-color:#f0ede8}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.6);cursor:pointer}
        .cdot{cursor:pointer;border-radius:50%;flex-shrink:0;transition:transform .12s,border-color .12s}
      `}</style>

      {/* ── Header ── */}
      <div style={{width:"100%",maxWidth:820,padding:"36px 24px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32}}>
          <div>
            <div style={{fontSize:12,letterSpacing:3,color:"#888",textTransform:"uppercase",marginBottom:4}}>Gemeinsamer</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:36,fontWeight:700,lineHeight:1}}>Kalender</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {user && (
              <button className="btn" onClick={()=>{setProfileForm({name:user.name,color:user.color});setShowProfileEditor(true);}} style={{display:"flex",alignItems:"center",gap:8,background:"#1e1e2a",borderRadius:10,padding:"8px 14px"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:user.color}}/>
                <span style={{fontSize:13,color:"#f0ede8",fontFamily:"inherit"}}>{user.name}</span>
              </button>
            )}
            <button className="btn" onClick={prevMonth} style={{background:"#1e1e2a",color:"#f0ede8",borderRadius:8,width:38,height:38,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <div style={{textAlign:"center",minWidth:120}}>
              <div style={{fontWeight:700,fontSize:18}}>{MONTHS[month]}</div>
              <div style={{color:"#888",fontSize:13}}>{year}</div>
            </div>
            <button className="btn" onClick={nextMonth} style={{background:"#1e1e2a",color:"#f0ede8",borderRadius:8,width:38,height:38,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          </div>
        </div>

        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
          {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,letterSpacing:2,color:"#555",textTransform:"uppercase",padding:"4px 0"}}>{d}</div>)}
        </div>

        {/* Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const dayStr    = toDateStr(year,month,d);
            const dayEnts   = getEntriesForDay(dayStr);
            const isSel     = selectedDay===d;
            const isTod     = isToday(d);
            const dow       = (firstDay+d-1)%7;
            const isWe      = dow===5||dow===6;
            return (
              <div key={i} className={`dc${isSel?" sel":""}`} onClick={()=>openDay(d)}
                style={{background:isSel?"#1e1e2a":"#15151c",borderRadius:10,padding:"8px 6px 6px",minHeight:72,display:"flex",flexDirection:"column",gap:3}}>
                <div style={{fontWeight:isTod?700:400,fontSize:13,color:isTod?"#f0ede8":isWe?"#555":"#aaa",
                  background:isTod?"#e74c3c":"transparent",borderRadius:isTod?"50%":0,
                  width:isTod?24:"auto",height:isTod?24:"auto",
                  display:"flex",alignItems:"center",justifyContent:"center",alignSelf:"flex-start",marginBottom:2}}>{d}</div>
                {dayEnts.slice(0,2).map((e,ei)=>(
                  <div key={ei} style={{background:e.color+"33",borderLeft:`2px solid ${e.color}`,borderRadius:4,padding:"1px 5px",fontSize:10,color:"#f0ede8",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{e.title}</div>
                ))}
                {dayEnts.length>2&&<div style={{fontSize:9,color:"#555",paddingLeft:4}}>+{dayEnts.length-2}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day detail ── */}
      {selectedDay&&(
        <div style={{width:"100%",maxWidth:820,padding:"28px 24px 0"}}>
          <div style={{background:"#15151c",borderRadius:16,padding:24,border:"1px solid #1e1e2a"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <div style={{fontSize:12,color:"#666",letterSpacing:2,textTransform:"uppercase"}}>{MONTHS[month]} {year}</div>
                <div style={{fontSize:28,fontWeight:700}}>{selectedDay}.</div>
              </div>
              <button className="btn" onClick={openAddModal} style={{background:"#f0ede8",color:"#0f0f13",borderRadius:10,padding:"10px 18px",fontWeight:600,fontSize:13,fontFamily:"inherit"}}>+ Eintrag</button>
            </div>
            {selectedEntries.length===0
              ? <div style={{textAlign:"center",color:"#444",padding:"28px 0",fontSize:14}}>Noch keine Einträge für diesen Tag.</div>
              : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {selectedEntries.map(entry=>(
                    <div key={entry.id} style={{background:"#0f0f13",borderRadius:12,padding:"14px 16px",borderLeft:`3px solid ${entry.color}`,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{fontWeight:600,fontSize:15}}>{entry.title}</span>
                          {entry.author&&<span style={{fontSize:11,color:entry.color,background:entry.color+"22",borderRadius:6,padding:"2px 8px",fontWeight:500}}>{entry.author}</span>}
                        </div>
                        <div style={{fontSize:12,color:"#555",marginTop:4}}>
                          {entry.startDate===entry.endDate?fmtDate(entry.startDate):`${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate)}`}
                        </div>
                        {entry.note&&<div style={{fontSize:13,color:"#888",marginTop:6}}>{entry.note}</div>}
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button className="btn" onClick={()=>openEditModal(entry)} style={{background:"#1e1e2a",color:"#aaa",borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"inherit"}}>✎</button>
                        <button className="btn" onClick={()=>deleteEntry(entry.id)} style={{background:"#2a1515",color:"#e74c3c",borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"inherit"}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* Status */}
      <div style={{width:"100%",maxWidth:820,padding:"14px 24px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,color:"#444",fontSize:12}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:syncing?"#f39c12":"#2ecc71",display:"inline-block",transition:"background .3s"}}/>
          {syncing?"Wird gespeichert…":"Einträge für alle sichtbar · Sync alle 10 Sek."}
        </div>
      </div>

      {/* ── Entry Modal ── */}
      {modal&&(
        <div className="mbg" onClick={()=>setModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{background:"#15151c",borderRadius:18,padding:28,width:"90%",maxWidth:460,border:"1px solid #2a2a36"}}>
            <div style={{fontWeight:700,fontSize:18,marginBottom:4}}>{editId?"Eintrag bearbeiten":"Neuer Eintrag"}</div>
            {user&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:20}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:user.color}}/>
              <span style={{fontSize:12,color:"#666"}}>Als {user.name}</span>
            </div>}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:12,color:"#666",display:"block",marginBottom:6}}>TITEL *</label>
                <input placeholder="z.B. Urlaub, Meeting, Geburtstag…" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:12,color:"#666",display:"block",marginBottom:6}}>STARTDATUM *</label>
                  <input type="date" value={form.startDate} onChange={e=>{const v=e.target.value;setForm(f=>({...f,startDate:v,endDate:f.endDate<v?v:f.endDate}));}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#666",display:"block",marginBottom:6}}>ENDDATUM *</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,color:"#666",display:"block",marginBottom:6}}>NOTIZ</label>
                <textarea rows={3} placeholder="Optionale Notiz…" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{resize:"none"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:22}}>
              <button className="btn" onClick={()=>setModal(false)} style={{flex:1,background:"#1e1e2a",color:"#888",borderRadius:10,padding:"12px",fontFamily:"inherit",fontSize:14}}>Abbrechen</button>
              <button className="btn" onClick={saveEntry} style={{flex:2,background:canSave?"#f0ede8":"#2a2a36",color:canSave?"#0f0f13":"#555",borderRadius:10,padding:"12px",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:canSave?"pointer":"default"}}>
                {syncing?"Speichert…":"Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Modal ── */}
      {(showProfileSetup||showProfileEditor)&&(
        <div className="mbg" onClick={()=>{if(showProfileEditor)setShowProfileEditor(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(6px)"}}>
          <div className="mbox" onClick={e=>e.stopPropagation()} style={{background:"#15151c",borderRadius:18,padding:32,width:"90%",maxWidth:420,border:"1px solid #2a2a36"}}>
            {showProfileSetup
              ? <div style={{textAlign:"center",marginBottom:24}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:28,fontWeight:700,marginBottom:8}}>Willkommen!</div>
                  <div style={{color:"#666",fontSize:14,lineHeight:1.6}}>Wähle deinen Namen und deine Farbe.<br/>Alle deine Einträge erscheinen in dieser Farbe.</div>
                </div>
              : <div style={{fontWeight:700,fontSize:18,marginBottom:20}}>Profil bearbeiten</div>
            }
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:12,color:"#666",display:"block",marginBottom:6}}>DEIN NAME *</label>
                <input placeholder="z.B. Anna, Max…" value={profileForm.name} onChange={e=>handleNameChange(e.target.value)} autoFocus/>
                {nameHint==="known"&&(
                  <div style={{marginTop:8,fontSize:12,color:"#2ecc71",background:"#0a2a10",borderRadius:6,padding:"8px 12px"}}>
                    ✓ Name erkannt — deine Farbe wurde automatisch gesetzt.
                  </div>
                )}
              </div>
              <div>
                <label style={{fontSize:12,color:"#666",display:"block",marginBottom:10}}>DEINE FARBE</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  {COLORS.map(c=>(
                    <div key={c} className="cdot" onClick={()=>setProfileForm(f=>({...f,color:c}))} style={{width:30,height:30,background:c,border:profileForm.color===c?"3px solid #f0ede8":"3px solid transparent",transform:profileForm.color===c?"scale(1.25)":"scale(1)"}}/>
                  ))}
                </div>
              </div>
              <div style={{background:"#0f0f13",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${profileForm.color}`,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:profileForm.color}}/>
                <span style={{fontSize:14,color:"#888"}}>Vorschau:</span>
                <span style={{fontWeight:600,fontSize:14,flex:1}}>{profileForm.name||"Dein Name"}</span>
                <span style={{fontSize:11,color:profileForm.color,background:profileForm.color+"22",borderRadius:6,padding:"2px 8px"}}>{profileForm.name||"Dein Name"}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:24}}>
              {showProfileEditor&&<button className="btn" onClick={()=>setShowProfileEditor(false)} style={{flex:1,background:"#1e1e2a",color:"#888",borderRadius:10,padding:"12px",fontFamily:"inherit",fontSize:14}}>Abbrechen</button>}
              <button className="btn" onClick={saveProfileHandler} style={{flex:2,background:profileForm.name.trim()?"#f0ede8":"#2a2a36",color:profileForm.name.trim()?"#0f0f13":"#555",borderRadius:10,padding:"13px",fontFamily:"inherit",fontSize:15,fontWeight:700,cursor:profileForm.name.trim()?"pointer":"default"}}>
                {showProfileSetup?"Los geht's →":"Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!loaded&&(
        <div style={{position:"fixed",inset:0,background:"#0f0f13",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{color:"#444",fontSize:14}}>Lade Kalender…</div>
        </div>
      )}
    </div>
  );
}

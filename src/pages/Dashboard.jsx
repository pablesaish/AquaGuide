import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
:root{--bg:#03100d;--bg2:#061a14;--surface:#0a2318;--border:#163d2e;--accent:#00e8a2;--accent2:#00b87a;--accent-dim:rgba(0,232,162,0.12);--accent-glow:rgba(0,232,162,0.25);--text:#ddf0e8;--muted:#5a8a77;--warn:#f5a623;--danger:#e84040;--semi:#f0dc3a;--font-display:'Playfair Display',serif;--font-body:'DM Sans',sans-serif;--font-mono:'DM Mono',monospace;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:var(--bg);color:var(--text);font-family:var(--font-body);height:100%;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:var(--bg);}::-webkit-scrollbar-thumb{background:var(--accent2);border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse-dot{0%,100%{opacity:1;}50%{opacity:0.3;}}
@keyframes bar-grow{from{width:0;}}
@keyframes glow-pulse{0%,100%{opacity:0.06;}50%{opacity:0.13;}}
.nav-item:hover{background:var(--accent-dim)!important;color:var(--accent)!important;}
.nav-item.active{background:var(--accent-dim)!important;color:var(--accent)!important;border-right:2px solid var(--accent);}
.stat-card:hover{border-color:rgba(0,232,162,0.3)!important;transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,0.3)!important;}
.quick-action:hover{border-color:rgba(0,232,162,0.35)!important;background:#0d2a1f!important;transform:translateY(-4px);}
.chat-chip:hover{border-color:rgba(0,232,162,0.35)!important;color:var(--accent)!important;background:rgba(0,232,162,0.08)!important;transform:translateX(4px);}
`;

const statusColors = { safe:"#00e8a2", semi:"#f0dc3a", critical:"#f5a623", over:"#e84040" };

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [data, setData] = useState(null);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    const u = onAuthStateChanged(auth, u => { if (!u) navigate("/login"); else setUser(u); });
    
    fetch('/summaryData.json')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(console.error);

    return u;
  }, []);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const navItems = [
    { id:"dashboard", icon:"⊞", label:"Dashboard" },
    { id:"chatbot",   icon:"💬", label:"AI Chatbot" },
    { id:"maps",      icon:"🗺️", label:"Map View" },
    { id:"data",      icon:"📊", label:"Data Explorer" },
    { id:"history",   icon:"🕐", label:"Chat History" },
    { id:"reports",   icon:"📄", label:"Saved Reports" },
  ];

  const stats = data ? [
    { label:"Total Districts", value: data.national.totalDistricts.toLocaleString(), sub:"Assessed globally", color:"#00e8a2", icon:"🔷" },
    { label:"Over-Exploited", value: data.national.overExploited.toLocaleString(), sub:"Need urgent action", color:"#e84040", icon:"🔴" },
    { label:"Critical Zones", value: data.national.critical.toLocaleString(), sub:"Under stress", color:"#f5a623", icon:"🟠" },
    { label:"Safe Districts", value: data.national.safe.toLocaleString(), sub:"Within limits", color:"#00e8a2", icon:"🟢" },
  ] : [];

  const recentChats = [
    "Groundwater status in Maharashtra districts",
    "Over-exploited blocks in Rajasthan 2023",
    "Compare Punjab vs UP extraction rates",
    "Safe zones in Tamil Nadu this year",
  ];

  const quickActions = [
    { icon:"💬", label:"Ask AI", desc:"Query groundwater data", path:"/chatbot", accent:"#00e8a2" },
    { icon:"🗺️", label:"View Map", desc:"India block-level map", path:"/maps", accent:"#f0dc3a" },
    { icon:"📊", label:"Explore Data", desc:"Filter by state/district", path:"/data", accent:"#f5a623" },
    { icon:"📄", label:"My Reports", desc:"View saved reports", path:"/reports", accent:"#60a5fa" },
  ];

  const nationalData = data ? [
    { label:"Safe",           pct: Math.round(data.national.safe / data.national.totalDistricts * 100), count: data.national.safe.toLocaleString(), color:"#00e8a2" },
    { label:"Semi-Critical",  pct: Math.round(data.national.semiCritical / data.national.totalDistricts * 100), count: data.national.semiCritical.toLocaleString(),   color:"#f0dc3a" },
    { label:"Critical",       pct: Math.round(data.national.critical / data.national.totalDistricts * 100),  count: data.national.critical.toLocaleString(),   color:"#f5a623" },
    { label:"Over-Exploited", pct: Math.round(data.national.overExploited / data.national.totalDistricts * 100), count: data.national.overExploited.toLocaleString(), color:"#e84040" },
  ] : [];

  const trendData = [78,74,71,68,65,64,63,62,64,67,68,68];
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];

  return (
    <>
      <style>{css}</style>
      <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)" }}>

        {/* Sidebar */}
        <aside style={{ width:220, background:"var(--bg2)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", position:"fixed", height:"100vh", zIndex:10 }}>
          <div style={{ padding:"24px 20px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:14, boxShadow:"0 0 16px rgba(0,232,162,0.2)" }}>IN</div>
              <div>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>INGRES</div>
                <div style={{ fontSize:10, color:"var(--accent)", fontFamily:"var(--font-mono)", letterSpacing:"0.06em" }}>AI ASSISTANT</div>
              </div>
            </div>
          </div>
          <nav style={{ flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 }}>
            {navItems.map(n => (
              <button key={n.id} className={`nav-item${activeNav===n.id?" active":""}`} onClick={()=>{setActiveNav(n.id);if(n.id!=="dashboard")navigate("/"+n.id);}} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:"none", background:"transparent", color: activeNav===n.id?"var(--accent)":"var(--muted)", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"var(--font-body)", textAlign:"left", transition:"all 0.2s", width:"100%", borderRight: activeNav===n.id?"2px solid var(--accent)":"2px solid transparent" }}>
                <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
          <div style={{ padding:"16px 12px", borderTop:"1px solid var(--border)" }}>
            {user && (
              <div style={{ marginBottom:12, padding:"10px 12px", background:"rgba(0,232,162,0.05)", borderRadius:8, border:"1px solid var(--border)" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.displayName || "User"}</div>
                <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
              </div>
            )}
            <button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:8, border:"none", background:"rgba(232,64,64,0.08)", color:"#fca5a5", cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"var(--font-body)", width:"100%", transition:"all 0.2s" }}>
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ marginLeft:220, flex:1, padding:"32px 36px", overflowY:"auto" }}>
          {!data ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
              <div style={{ color:"var(--accent)", fontFamily:"var(--font-mono)" }}>Loading FY 2024-25 Data...</div>
            </div>
          ) : (
            <>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32, animation:"fadeUp 0.5s ease both" }}>
            <div>
              <div style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", marginBottom:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block", marginRight:6, animation:"pulse-dot 1.5s infinite" }} />
                FY 2024-25 DATA CONNECTED · {new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
              </div>
              <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(24px,3vw,34px)", fontWeight:900, lineHeight:1.15 }}>
                {greeting},{" "}
                <em style={{ color:"var(--accent)" }}>{user?.displayName?.split(" ")[0] || "Explorer"}</em>
              </h1>
              <p style={{ color:"var(--muted)", fontSize:14, marginTop:4, fontWeight:300 }}>India groundwater intelligence — ask anything.</p>
            </div>
            <button onClick={()=>navigate("/chatbot")} style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 24px", background:"var(--accent)", border:"none", borderRadius:10, color:"#03100d", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", boxShadow:"0 0 24px rgba(0,232,162,0.3)", transition:"all 0.25s", animation:"fadeUp 0.5s ease 0.1s both" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,232,162,0.35)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 0 24px rgba(0,232,162,0.3)";}}>
              💬 Ask AI Now
            </button>
          </div>

          {/* Stat Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
            {stats.map((s,i) => (
              <div key={s.label} className="stat-card" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"20px", transition:"all 0.3s", cursor:"default", animation:`fadeUp 0.5s ease ${i*0.08}s both` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase" }}>{s.label}</div>
                  <div style={{ fontSize:18 }}>{s.icon}</div>
                </div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:900, color:s.color, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontSize:11, color:"var(--muted)" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20, marginBottom:20 }}>

            {/* Quick actions */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"24px", animation:"fadeUp 0.5s ease 0.2s both" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Quick Actions</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700 }}>What would you like to do?</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                {quickActions.map((a,i) => (
                  <div key={a.label} className="quick-action" onClick={()=>navigate(a.path)} style={{ padding:"20px", background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)", borderRadius:12, cursor:"pointer", transition:"all 0.3s", animation:`fadeUp 0.5s ease ${0.3+i*0.05}s both` }}>
                    <div style={{ fontSize:28, marginBottom:10 }}>{a.icon}</div>
                    <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:4 }}>{a.label}</div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>{a.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* National Summary */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"24px", animation:"fadeUp 0.5s ease 0.25s both" }}>
              <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>National Summary</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, marginBottom:20 }}>India · FY 2024-25</div>
              {nationalData.map((r,i) => (
                <div key={r.label} style={{ marginBottom:16, animation:`fadeUp 0.5s ease ${0.35+i*0.07}s both` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                    <span style={{ fontWeight:500, color:"var(--text)" }}>{r.label}</span>
                    <span style={{ color:r.color, fontFamily:"var(--font-mono)", fontWeight:600 }}>{r.count}</span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.04)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${r.pct}%`, background:r.color, borderRadius:3, animation:`bar-grow 1.2s cubic-bezier(.22,1,.36,1) ${0.5+i*0.1}s both`, boxShadow:`0 0 8px ${r.color}55` }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop:20, padding:"10px 12px", background:"rgba(0,232,162,0.06)", border:"1px solid rgba(0,232,162,0.15)", borderRadius:8, fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>
                Source: CGWB FY 2024-25 Assessment
              </div>
            </div>
          </div>

          {/* Bottom grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

            {/* Recent Queries */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"24px", animation:"fadeUp 0.5s ease 0.3s both" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Recent Searches</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700 }}>Your Queries</div>
                </div>
                <button onClick={()=>navigate("/history")} style={{ background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:12, fontFamily:"var(--font-mono)", textDecoration:"underline" }}>View all</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {recentChats.map((q,i) => (
                  <div key={i} className="chat-chip" onClick={()=>navigate("/chatbot")} style={{ padding:"10px 14px", background:"rgba(0,232,162,0.04)", border:"1px solid rgba(0,232,162,0.1)", borderRadius:8, fontSize:13, color:"var(--muted)", cursor:"pointer", transition:"all 0.25s", fontFamily:"var(--font-mono)", animation:`fadeUp 0.4s ease ${0.35+i*0.06}s both` }}>
                    💬 {q}
                  </div>
                ))}
              </div>
            </div>

            {/* Trend chart */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"24px", animation:"fadeUp 0.5s ease 0.35s both" }}>
              <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Trend Analysis</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700, marginBottom:6 }}>Safe Blocks % · 2023</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginBottom:20 }}>Monthly distribution across India</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
                {trendData.map((v,i) => (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ width:"100%", height:`${v}px`, background: v>=70?"#00e8a2":v>=65?"#f0dc3a":"#f5a623", borderRadius:"3px 3px 0 0", opacity:0.8, animation:`bar-grow 0.8s cubic-bezier(.22,1,.36,1) ${i*0.07}s both`, transition:"opacity 0.2s", cursor:"default" }}
                      onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                      onMouseLeave={e=>e.currentTarget.style.opacity="0.8"}
                    />
                    <div style={{ fontSize:8, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>{months[i]}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:16, marginTop:16 }}>
                {[["≥70% Safe","#00e8a2"],["65–70%","#f0dc3a"],["<65%","#f5a623"]].map(([l,c]) => (
                  <span key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:c, display:"inline-block" }} />{l}
                  </span>
                ))}
              </div>
            </div>
          </div>
          </>
        )}
        </main>
      </div>
    </>
  );
}
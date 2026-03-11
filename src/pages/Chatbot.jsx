import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
:root{--bg:#03100d;--bg2:#061a14;--surface:#0a2318;--border:#163d2e;--accent:#00e8a2;--accent2:#00b87a;--accent-dim:rgba(0,232,162,0.12);--accent-glow:rgba(0,232,162,0.25);--text:#ddf0e8;--muted:#5a8a77;--font-display:'Playfair Display',serif;--font-body:'DM Sans',sans-serif;--font-mono:'DM Mono',monospace;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:var(--bg);color:var(--text);font-family:var(--font-body);height:100%;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:var(--bg);}::-webkit-scrollbar-thumb{background:var(--accent2);border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse-dot{0%,100%{opacity:1;}50%{opacity:0.3;}}
@keyframes bar-grow{from{width:0;}}
@keyframes typing{0%,100%{opacity:0.3;}50%{opacity:1;}}
.chat-input:focus{border-color:rgba(0,232,162,0.4)!important;outline:none;box-shadow:0 0 0 3px rgba(0,232,162,0.07);}
.send-btn:hover{transform:scale(1.08);box-shadow:0 0 20px var(--accent-glow)!important;}
.nav-item:hover{background:var(--accent-dim)!important;color:var(--accent)!important;}
.suggest-chip:hover{border-color:rgba(0,232,162,0.4)!important;color:var(--accent)!important;background:rgba(0,232,162,0.08)!important;}
.msg-bubble:hover{transform:scale(1.005);}
`;

const SUGGESTIONS = [
  "Groundwater status in Maharashtra",
  "Over-exploited blocks in Rajasthan 2023",
  "Which districts in Gujarat are critical?",
  "Compare Punjab and UP extraction rates",
  "Summarize Tamil Nadu groundwater data",
  "Show safe zones in Karnataka",
];

const SAMPLE_RESPONSES = {
  "maharashtra": { text:"Found 23 over-exploited districts in Maharashtra. Most critical: Nashik (181%), Aurangabad (162%), Pune (164%). Overall: 34% of blocks are over-exploited, 22% critical.", data:[["Safe","#00e8a2","12"],["Semi-Crit.","#f0dc3a","8"],["Critical","#f5a623","3"],["Over-Exp.","#e84040","23"]] },
  "rajasthan": { text:"Rajasthan has 47% over-exploited blocks — the highest in India. Key districts: Jaipur (198%), Jodhpur (176%), Ajmer (165%). Arid conditions and heavy irrigation cause severe depletion.", data:[["Safe","#00e8a2","6"],["Semi-Crit.","#f0dc3a","4"],["Critical","#f5a623","5"],["Over-Exp.","#e84040","47"]] },
  "gujarat": { text:"Gujarat has a mixed groundwater picture. 12 districts are critical or over-exploited, mainly in North Gujarat. Kachchh is especially vulnerable with extraction at 189% of sustainable limits.", data:[["Safe","#00e8a2","18"],["Semi-Crit.","#f0dc3a","10"],["Critical","#f5a623","7"],["Over-Exp.","#e84040","5"]] },
  "default": { text:"I found relevant groundwater data for your query. The analysis shows varied extraction levels across the assessed blocks. Key indicators include recharge rates, extraction volumes, and stage of extraction percentages.", data:[["Safe","#00e8a2","15"],["Semi-Crit.","#f0dc3a","9"],["Critical","#f5a623","6"],["Over-Exp.","#e84040","12"]] },
};

function getResponse(query) {
  const q = query.toLowerCase();
  if (q.includes("maharashtra") || q.includes("pune") || q.includes("nashik")) return SAMPLE_RESPONSES.maharashtra;
  if (q.includes("rajasthan") || q.includes("jaipur")) return SAMPLE_RESPONSES.rajasthan;
  if (q.includes("gujarat")) return SAMPLE_RESPONSES.gujarat;
  return SAMPLE_RESPONSES.default;
}

export default function Chatbot() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([
    { role:"ai", text:"Hello! I'm INGRES AI, your groundwater intelligence assistant. I can help you query data on 7,000+ assessment blocks across India. What would you like to know?", ts: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { const u = onAuthStateChanged(auth, u => { if (!u) navigate("/login"); else setUser(u); }); return u; }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput("");
    setMessages(m => [...m, { role:"user", text:q, ts:new Date() }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    setTyping(false);
    const res = getResponse(q);
    setMessages(m => [...m, { role:"ai", text:res.text, data:res.data, ts:new Date() }]);
  };

  const fmt = (d) => d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

  return (
    <>
      <style>{css}</style>
      <div style={{ display:"flex", height:"100vh", background:"var(--bg)", overflow:"hidden" }}>

        {/* Sidebar */}
        <aside style={{ width:260, background:"var(--bg2)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>navigate("/dashboard")} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:18, lineHeight:1 }}>←</button>
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:13, boxShadow:"0 0 14px rgba(0,232,162,0.2)" }}>IN</div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, fontFamily:"var(--font-display)" }}>INGRES AI</div>
              <div style={{ fontSize:10, color:"var(--accent)", fontFamily:"var(--font-mono)", display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent)", display:"inline-block", animation:"pulse-dot 1.5s infinite" }} />Online
              </div>
            </div>
          </div>

          <div style={{ padding:"16px", borderBottom:"1px solid var(--border)" }}>
            <button onClick={()=>setMessages([{role:"ai",text:"Hello! I'm INGRES AI. Ask me anything about India's groundwater data.",ts:new Date()}])} style={{ width:"100%", padding:"10px", background:"var(--accent-dim)", border:"1px solid rgba(0,232,162,0.2)", borderRadius:8, color:"var(--accent)", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"var(--font-body)" }}>
              + New Chat
            </button>
          </div>

          <div style={{ flex:1, padding:"16px", overflowY:"auto" }}>
            <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Try asking</div>
            {SUGGESTIONS.map((s,i) => (
              <div key={i} className="suggest-chip" onClick={()=>send(s)} style={{ padding:"9px 12px", marginBottom:6, background:"rgba(0,232,162,0.03)", border:"1px solid rgba(0,232,162,0.1)", borderRadius:7, fontSize:12, color:"var(--muted)", cursor:"pointer", transition:"all 0.2s", fontFamily:"var(--font-mono)", lineHeight:1.4 }}>
                {s}
              </div>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          {/* Header */}
          <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--border)", background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:18 }}>Groundwater Intelligence</div>
              <div style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>CGWB Data · 7,089 assessment blocks · India</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {["Safe","Semi-Critical","Critical","Over-Exploited"].map((s,i)=>{
                const c=["#00e8a2","#f0dc3a","#f5a623","#e84040"][i];
                return <span key={s} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:c, fontFamily:"var(--font-mono)", letterSpacing:"0.04em" }}><span style={{ width:6, height:6, borderRadius:"50%", background:c, display:"inline-block" }} />{s}</span>;
              })}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"24px", display:"flex", flexDirection:"column", gap:16 }}>
            {messages.map((m,i) => (
              <div key={i} className="msg-bubble" style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:`fadeUp 0.3s ease both`, transition:"transform 0.2s" }}>
                {m.role==="ai" && (
                  <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:12, marginRight:10, flexShrink:0, boxShadow:"0 0 12px rgba(0,232,162,0.2)" }}>IN</div>
                )}
                <div style={{ maxWidth:"72%" }}>
                  <div style={{ padding:"12px 16px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"var(--accent)":"var(--surface)", border:m.role==="ai"?"1px solid var(--border)":"none", color:m.role==="user"?"#03100d":"var(--text)", fontSize:14, lineHeight:1.6, fontWeight:m.role==="user"?500:400 }}>
                    {m.text}
                    {m.data && (
                      <div style={{ marginTop:12, display:"flex", gap:8 }}>
                        {m.data.map(([l,c,n])=>(
                          <div key={l} style={{ flex:1, background:`${c}18`, border:`1px solid ${c}33`, borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
                            <div style={{ fontSize:18, fontWeight:700, color:c, fontFamily:"var(--font-display)" }}>{n}</div>
                            <div style={{ fontSize:9, color:c, opacity:0.8, fontFamily:"var(--font-mono)", marginTop:2 }}>{l}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", marginTop:4, textAlign:m.role==="user"?"right":"left" }}>{fmt(m.ts)}</div>
                </div>
                {m.role==="user" && (
                  <div style={{ width:32, height:32, borderRadius:9, background:"rgba(0,232,162,0.15)", border:"1px solid rgba(0,232,162,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)", fontSize:14, marginLeft:10, flexShrink:0 }}>
                    {(user?.displayName||user?.email||"U")[0].toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div style={{ display:"flex", alignItems:"center", gap:10, animation:"fadeUp 0.3s ease both" }}>
                <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:12 }}>IN</div>
                <div style={{ padding:"12px 16px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"16px 16px 16px 4px", display:"flex", gap:5, alignItems:"center" }}>
                  {[0,0.2,0.4].map((d,i)=><span key={i} style={{ width:7, height:7, borderRadius:"50%", background:"var(--accent)", display:"inline-block", animation:`pulse-dot 1.2s ${d}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border)", background:"var(--bg2)" }}>
            <div style={{ display:"flex", gap:12, alignItems:"flex-end", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"8px 8px 8px 16px", transition:"border-color 0.2s" }}
              onFocus={()=>{}} onBlur={()=>{}}>
              <textarea
                className="chat-input"
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder="Ask about groundwater in any state, district, or block…"
                rows={1}
                style={{ flex:1, background:"transparent", border:"none", color:"var(--text)", fontSize:14, fontFamily:"var(--font-body)", resize:"none", outline:"none", lineHeight:1.5, padding:"6px 0", maxHeight:120, overflowY:"auto" }}
              />
              <button className="send-btn" onClick={()=>send()} disabled={!input.trim()||typing} style={{ width:40, height:40, borderRadius:10, background: input.trim()&&!typing?"var(--accent)":"rgba(255,255,255,0.06)", border:"none", cursor:input.trim()&&!typing?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", boxShadow: input.trim()?"0 0 16px rgba(0,232,162,0.2)":"none", flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke={input.trim()&&!typing?"#03100d":"#5a8a77"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", textAlign:"center", marginTop:8 }}>
              Powered by CGWB data · Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
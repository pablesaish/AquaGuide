import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import OpenAI from "openai";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
.msg-bubble:hover{transform:scale(1.005);}
.ai-markdown p { margin-bottom: 12px; line-height: 1.6; }
.ai-markdown ul, .ai-markdown ol { padding-left: 20px; margin-bottom: 12px; }
.ai-markdown li { margin-bottom: 6px; }
.ai-markdown strong { color: var(--accent); }
.ai-markdown h1, .ai-markdown h2, .ai-markdown h3 { margin-top: 16px; margin-bottom: 10px; color: var(--accent); font-family: var(--font-display); }
.ai-markdown table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; font-family: var(--font-body); overflow: hidden; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.ai-markdown th, .ai-markdown td { padding: 10px 14px; border-bottom: 1px solid var(--border); text-align: left; }
.ai-markdown th { background: rgba(0,232,162,0.08); color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-family: var(--font-mono); }
.ai-markdown tr:last-child td { border-bottom: none; }
.ai-markdown tr:hover td { background: rgba(0,232,162,0.04); transition: background 0.2s; }
`;

const SUGGESTIONS = [
  "Groundwater status in Maharashtra",
  "Over-exploited blocks in Rajasthan 2023",
  "Which districts in Gujarat are critical?",
  "Compare Punjab and UP extraction rates",
  "Summarize Tamil Nadu groundwater data",
  "Show safe zones in Karnataka",
];

async function getOpenAIResponse(query, data, apiKey) {
  if (!apiKey) return { text: "Please enter your OpenAI API Key down below to enable AI responses.", data: null };
  if (!data) return { text: "Data is loading...", data: null };
  
  const q = query.toLowerCase();
  
  // To avoid sending 6MB on every request, we smartly filter the data sent to the LLM based on the query.
  let contextData = {};
  const states = Object.keys(data.stateStats);
  
  // Find which state(s) the user explicitly mentioned
  const matchedStates = states.filter(s => q.includes(s.toLowerCase()));
  
  // Also find which district(s) the user explicitly mentioned, and include their state automatically
  const matchedDistricts = [];
  states.forEach(s => {
    Object.keys(data.stateStats[s].districts).forEach(dist => {
      if (q.includes(dist.toLowerCase())) {
        matchedDistricts.push(dist);
        if (!matchedStates.includes(s)) matchedStates.push(s);
      }
    });
  });

  if (matchedStates.length > 0) {
    // If a state or district was matched, pass the full state object (which includes districts) to Gemini
    matchedStates.forEach(s => contextData[s] = data.stateStats[s]);
  } else {
    // Basic overview if no specific state or district is mentioned
    contextData = {
      nationalSummary: data.national,
      stateOverview: Object.fromEntries(
        Object.entries(data.stateStats).map(([s, stat]) => [s, { safe: stat.safe, overExploited: stat.over, total: stat.total }])
      )
    };
  }

  const prompt = `
You are AquaGuide AI, an expert, human-friendly groundwater intelligence assistant for India.
You strictly answer based on the provided FY 2024-25 India groundwater data below. 
Analyze the data and give your answers in a conversational, friendly paragraph format instead of just raw lists. 
Highlight key insights, be interactive, and explain the significance of the numbers. 
If the user asks about multiple categories of things (like Safe vs Critical numbers), or if a chart would make the data clearer, YOU MUST include a JSON block in this exact format at the very end of your response:
\`\`\`chart
{
  "type": "pie", 
  "title": "Clear Title Here",
  "labels": ["Label 1", "Label 2"],
  "data": [10, 20]
}
\`\`\`
Use "pie" or "bar" for the chart type. 

DATA CONTEXT:
${JSON.stringify(contextData)}

User Query: "${query}"
`;

  try {
    const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // fallback to gpt-3.5-turbo if needed, but 4o-mini is standard
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: query }
      ]
    });
    return { text: response.choices[0].message.content, data: null };
  } catch (err) {
    console.error(err);
    return { text: "Oops, there was an error communicating with OpenAI: " + err.message, data: null };
  }
}

export default function Chatbot() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);

  const defaultWelcome = { role:"ai", text:"Hello! I'm AquaGuide AI, your groundwater intelligence assistant. I can help you query our detailed FY 2024-25 assessment data across India. What would you like to know?", ts: new Date() };
  
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([defaultWelcome]);
  
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem("OPENAI_KEY") || "");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // Tracks active session ID synchronously — prevents duplicate sessions
  // when messages state updates twice (user msg + AI reply) before setState settles.
  const activeSessionRef = useRef(null);

  useEffect(() => { 
    const u = onAuthStateChanged(auth, async u => { 
      if (!u) {
        navigate("/login"); 
      } else {
        setUser(u);
        const q = query(collection(db, "chat_sessions"), where("userId", "==", u.uid));
        try {
          const snapshot = await getDocs(q);
          const loadedSessions = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          setSessions(loadedSessions);
        } catch (err) {
          console.error("Error loading chat history:", err);
        }
      }
    }); 
    fetch('/summaryData.json').then(r => r.json()).then(d => setData(d)).catch(console.error);
    return u; 
  }, [navigate]);
  
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  // Persist messages to active session
  useEffect(() => {
    if (messages.length <= 1 || !user) return;

    const serializedMessages = messages.map(m => ({
      role: m.role,
      text: m.text,
      data: m.data || null,
      ts: m.ts instanceof Date ? m.ts.toISOString() : m.ts
    }));

    const firstUserMsg = messages.find(m => m.role === "user")?.text || "New Chat";
    const snippet = firstUserMsg.length > 28 ? firstUserMsg.slice(0, 28) + "..." : firstUserMsg;

    const sessionData = {
      userId: user.uid,
      title: snippet,
      messages: serializedMessages,
      updatedAt: new Date().toISOString()
    };

    // Use the ref (not state) so we always read the latest ID synchronously.
    // This prevents the AI reply from creating a second session before
    // setActiveSessionId has re-rendered.
    const currentId = activeSessionRef.current;

    if (currentId) {
      // Update existing session
      setSessions(prev =>
        prev.map(s => s.id === currentId ? { ...s, ...sessionData } : s)
      );
      setDoc(doc(db, "chat_sessions", currentId), sessionData, { merge: true }).catch(console.error);
    } else {
      // Create new session — generate ID immediately and store in ref
      const newId = Date.now().toString();
      activeSessionRef.current = newId;   // set ref synchronously
      setActiveSessionId(newId);          // also update state for UI
      setSessions(prev => [{ id: newId, ...sessionData }, ...prev]);
      setDoc(doc(db, "chat_sessions", newId), sessionData).catch(console.error);
    }
  }, [messages]);

  const startNewChat = () => {
    activeSessionRef.current = null;   // clear ref synchronously
    setActiveSessionId(null);
    setMessages([{...defaultWelcome, ts: new Date()}]);
  };
  
  const loadSession = (id) => {
    const s = sessions.find(s => s.id === id);
    if (s) {
      activeSessionRef.current = id;   // keep ref in sync
      setActiveSessionId(id);
      setMessages(s.messages.map(m => ({ ...m, ts: new Date(m.ts) })));
    }
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) startNewChat();
    
    try {
      await deleteDoc(doc(db, "chat_sessions", id));
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const send = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput("");
    setMessages(m => [...m, { role:"user", text:q, ts:new Date() }]);
    setTyping(true);
    
    // Quick delay for UI feel
    await new Promise(r => setTimeout(r, 600));
    
    const res = await getOpenAIResponse(q, data, apiKey);
    
    setTyping(false);
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
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:13, boxShadow:"0 0 14px rgba(0,232,162,0.2)", cursor:"pointer" }} onClick={() => navigate('/')}>
                <img src="/ingres.svg" alt="" />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, fontFamily:"var(--font-display)" }}>AquaGuide AI</div>
              <div style={{ fontSize:10, color:"var(--accent)", fontFamily:"var(--font-mono)", display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent)", display:"inline-block", animation:"pulse-dot 1.5s infinite" }} />Online
              </div>
            </div>
          </div>

          <div style={{ padding:"16px", borderBottom:"1px solid var(--border)" }}>
            <button onClick={startNewChat} style={{ width:"100%", padding:"10px", background:"var(--accent-dim)", border:"1px solid rgba(0,232,162,0.2)", borderRadius:8, color:"var(--accent)", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"var(--font-body)", transition:"box-shadow 0.2s" }} onMouseOver={e=>e.currentTarget.style.boxShadow="0 0 12px var(--accent-glow)"} onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
              + New Chat
            </button>
          </div>

          <div style={{ flex:1, padding:"16px", overflowY:"auto", display:"flex", flexDirection:"column" }}>
            
            {sessions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Chat History</div>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)} style={{ padding:"10px 12px", marginBottom:6, background: activeSessionId === s.id ? "rgba(0,232,162,0.1)" : "transparent", border: activeSessionId === s.id ? "1px solid rgba(0,232,162,0.3)" : "1px solid transparent", borderRadius:7, fontSize:13, color: activeSessionId === s.id ? "var(--text)" : "var(--muted)", cursor:"pointer", transition:"all 0.2s", display:"flex", justifyContent:"space-between", alignItems:"center" }} className="nav-item">
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.title}</span>
                    <button onClick={(e) => deleteSession(e, s.id)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:11, padding:4 }}>×</button>
                  </div>
                ))}
              </div>
            )}

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
              <div style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-mono)", display:"flex", gap:15, alignItems:"center", marginTop:4 }}>
                <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                  CGWB FY 2024-25 · ~713 assessment districts
                </span>
                {!import.meta.env.VITE_OPENAI_API_KEY && (
                  <input 
                    type="password" 
                    placeholder="Paste OpenAI API Key to enable AI"
                    value={apiKey}
                    onChange={e => {
                      setApiKey(e.target.value);
                      localStorage.setItem("OPENAI_KEY", e.target.value);
                    }}
                    style={{ background:"rgba(0,0,0,0.3)", border:"1px solid var(--border)", color:"var(--accent)", padding:"4px 8px", borderRadius:4, fontSize:11, outline:"none", fontFamily:"var(--font-mono)", width:230 }}
                  />
                )}
              </div>
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
                  <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:12, marginRight:10, flexShrink:0, boxShadow:"0 0 12px rgba(0,232,162,0.2)" }}>
                    <img src="/ingres.svg" alt="" />
                  </div>
                )}
                <div style={{ maxWidth:"72%" }}>
                  <div style={{ padding:"12px 16px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"var(--accent)":"var(--surface)", border:m.role==="ai"?"1px solid var(--border)":"none", color:m.role==="user"?"#03100d":"var(--text)", fontSize:14, lineHeight:1.6, fontWeight:m.role==="user"?500:400 }}>
                    {m.role === "user" ? m.text : (
                      <div className="ai-markdown">
                        <ReactMarkdown 
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            code({node, inline, className, children, ...props}) {
                              const match = /language-(\w+)/.exec(className || '')
                              if (!inline && match && match[1] === 'chart') {
                                try {
                                  const chartConfig = JSON.parse(String(children).replace(/\n/g, ''));
                                  
                                  const chartData = {
                                    labels: chartConfig.labels,
                                    datasets: [{
                                      label: chartConfig.title || 'Data',
                                      data: chartConfig.data,
                                      backgroundColor: [
                                        'rgba(0, 232, 162, 0.85)', 
                                        'rgba(240, 220, 58, 0.85)', 
                                        'rgba(245, 166, 35, 0.85)', 
                                        'rgba(232, 64, 64, 0.85)', 
                                        'rgba(0, 184, 122, 0.85)', 
                                        'rgba(90, 138, 119, 0.85)'
                                      ],
                                      hoverBackgroundColor: [
                                        '#00e8a2', '#f0dc3a', '#f5a623', '#e84040', '#00b87a', '#78a892'
                                      ],
                                      borderColor: '#0a2318',
                                      borderWidth: 2,
                                      hoverOffset: chartConfig.type === 'pie' ? 12 : 0,
                                      borderRadius: chartConfig.type === 'bar' ? 6 : 0,
                                    }]
                                  };
                                  
                                  const options = {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    animation: { animateScale: true, animateRotate: true, duration: 800 },
                                    plugins: { 
                                      legend: { 
                                        position: 'bottom',
                                        labels: { color: '#ddf0e8', padding: 16, font: { family: "'DM Sans', sans-serif", size: 12 }, usePointStyle: true, pointStyle: 'circle' } 
                                      }, 
                                      title: { display: !!chartConfig.title, text: chartConfig.title, color: '#00e8a2', font: { family: "'Playfair Display', serif", size: 16, weight: 'bold' }, padding: { bottom: 20 } },
                                      tooltip: {
                                        backgroundColor: 'rgba(6, 26, 20, 0.95)',
                                        titleColor: '#00e8a2',
                                        bodyColor: '#ddf0e8',
                                        borderColor: '#163d2e',
                                        borderWidth: 1,
                                        padding: 12,
                                        cornerRadius: 8,
                                        displayColors: true,
                                        boxPadding: 6,
                                        callbacks: {
                                          label: function(context) {
                                            const label = context.label || '';
                                            const value = context.raw || 0;
                                            return ` ${label}: ${value}`;
                                          }
                                        }
                                      }
                                    },
                                    scales: chartConfig.type === 'bar' ? {
                                      y: { ticks: { color: '#5a8a77', font:{family:"'DM Mono', monospace"} }, grid: { color: 'rgba(0, 232, 162, 0.05)', tickLength: 0 }, border: { dash: [4,4], display: false } },
                                      x: { ticks: { color: '#ddf0e8', font:{family:"'DM Sans', sans-serif"} }, grid: { display: false } }
                                    } : {}
                                  };

                                  return (
                                    <div style={{ background: "var(--bg2)", borderRadius: 16, padding: "20px", marginTop: 24, marginBottom: 24, border: "1px solid var(--border)", position: "relative", zIndex: 1, width: "100%", height: chartConfig.type === 'pie' ? "380px" : "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", transition: "transform 0.3s" }} 
                                         onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                                         onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                                      {chartConfig.type === 'pie' ? <Pie data={chartData} options={options} /> : <Bar data={chartData} options={options} />}
                                    </div>
                                  );
                                } catch (e) {
                                  return <code>{children}</code>;
                                }
                              }
                              return <code className={className} {...props}>{children}</code>
                            }
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    {m.data && !m.text.includes("```chart") && (
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
              Powered by CGWB FY 2024-25 data · Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
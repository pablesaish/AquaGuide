import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
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
.ai-markdown p { margin-bottom: 12px; }
.ai-markdown ul, .ai-markdown ol { padding-left: 20px; margin-bottom: 12px; }
.ai-markdown li { margin-bottom: 4px; }
.ai-markdown strong { color: var(--accent); }
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
  const [messages, setMessages] = useState([
    { role:"ai", text:"Hello! I'm AquaGuide AI, your groundwater intelligence assistant. I can help you query our detailed FY 2024-25 assessment data across India. What would you like to know?", ts: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem("OPENAI_KEY") || "");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { 
    const u = onAuthStateChanged(auth, u => { if (!u) navigate("/login"); else setUser(u); }); 
    fetch('/summaryData.json').then(r => r.json()).then(d => setData(d)).catch(console.error);
    return u; 
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

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
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:13, boxShadow:"0 0 14px rgba(0,232,162,0.2)" }}>AQ</div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, fontFamily:"var(--font-display)" }}>AquaGuide AI</div>
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
                  <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #00b87a, #00e8a2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"#03100d", fontSize:12, marginRight:10, flexShrink:0, boxShadow:"0 0 12px rgba(0,232,162,0.2)" }}>AQ</div>
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
                                        '#00e8a2', '#f0dc3a', '#f5a623', '#e84040', '#00b87a', '#163d2e'
                                      ],
                                      borderColor: 'rgba(255,255,255,0.1)',
                                      borderWidth: 1,
                                    }]
                                  };
                                  
                                  const options = {
                                    responsive: true,
                                    plugins: { legend: { labels: { color: '#ddf0e8' } }, title: { display: !!chartConfig.title, text: chartConfig.title, color: '#ddf0e8' } },
                                    scales: chartConfig.type === 'bar' ? {
                                      y: { ticks: { color: '#5a8a77' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                      x: { ticks: { color: '#5a8a77' }, grid: { display: false } }
                                    } : {}
                                  };

                                  return (
                                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 16, border: "1px solid var(--border)", position: "relative", zIndex: 1, maxWidth: chartConfig.type === 'pie' ? "300px" : "100%", margin: "16px auto" }}>
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
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import OpenAI from "openai";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import { parseSummaryData } from '../utils/dataParser';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const css = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes avatarPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,168,232,0.4);}70%{box-shadow:0 0 0 8px rgba(0,168,232,0);}}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
.chat-avatar-ai{animation:avatarPulse 2.5s infinite;}
.suggestion-card{transition:all 0.3s cubic-bezier(.22,1,.36,1);}
.suggestion-card:hover{border-color:rgba(0,168,232,0.5)!important;transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,168,232,0.15)!important;background:var(--surface-hover)!important;}
.input-glass{transition:border-color 0.3s,box-shadow 0.3s;}
.input-glass:focus-within{border-color:rgba(0,168,232,0.5)!important;box-shadow:0 0 0 3px rgba(0,168,232,0.08),0 8px 32px rgba(0,0,0,0.2)!important;}
.streaming-cursor::after{content:'▊';color:var(--accent);animation:blink 0.8s step-end infinite;margin-left:2px;font-size:0.9em;}
`;

const SUGGESTION_POOL = [
  "Groundwater status in Maharashtra",
  "Over-exploited blocks in Rajasthan",
  "Which districts in Gujarat are critical?",
  "Compare Punjab and UP extraction rates",
  "Summarize Tamil Nadu groundwater data",
  "Show safe zones in Karnataka",
  "Water quality issues in Bihar",
  "Recharge potential of Madhya Pradesh",
  "Which states have the highest extraction?",
  "Net groundwater availability in Haryana",
  "How is Delhi's groundwater situation?",
  "Critical districts in Uttar Pradesh",
  "Groundwater recharge vs extraction in Telangana",
  "Top 5 over-exploited states in India",
  "Show me Andhra Pradesh district-wise data",
  "Is Jharkhand's groundwater safe?",
  "Environmental flow data for Kerala",
  "Domestic water allocation in Odisha",
  "Compare Gujarat and Rajasthan extraction",
  "Which UTs have safe groundwater?",
  "Irrigation extraction in West Bengal",
  "Stage of extraction in Chhattisgarh",
  "Industrial groundwater use in Maharashtra",
  "Future water availability in Punjab",
];

const SUGGESTION_ICONS = ["💧","📊","⚠️","🔍","🌊","📈","🗺️","💡","🏞️","📉"];

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function getOpenAIResponse(query, data, apiKey, chatHistory = []) {
  if (!apiKey) return { text: "Please enter your OpenAI API Key down below to enable AI responses.", data: null };
  if (!data) return { text: "Data is loading...", data: null };
  
  // ────── ABBREVIATION & ALIAS MAP ──────
  const STATE_ALIASES = {
    // Common abbreviations
    "up": "UTTAR PRADESH", "mp": "MADHYA PRADESH", "ap": "ANDHRA PRADESH",
    "ts": "TELANGANA", "tn": "TAMILNADU", "wb": "WEST BENGAL",
    "hp": "HIMACHAL PRADESH", "uk": "UTTARAKHAND", "jk": "JAMMU AND KASHMIR",
    "j&k": "JAMMU AND KASHMIR", "j and k": "JAMMU AND KASHMIR",
    "cg": "CHHATTISGARH", "rj": "RAJASTHAN", "raj": "RAJASTHAN",
    "mh": "MAHARASHTRA", "gj": "GUJARAT", "guj": "GUJARAT",
    "ka": "KARNATAKA", "kr": "KERALA", "pb": "PUNJAB",
    "hr": "HARYANA", "br": "BIHAR", "jh": "JHARKHAND",
    "or": "ODISHA", "ga": "GOA", "sk": "SIKKIM",
    "mn": "MANIPUR", "ml": "MEGHALAYA", "mz": "MIZORAM",
    "nl": "NAGALAND", "tr": "TRIPURA", "ar": "ARUNACHAL PRADESH",
    "as": "ASSAM", "dl": "DELHI", "ch": "CHANDIGARH",
    "ld": "LAKSHADWEEP", "py": "PUDUCHERRY", "an": "ANDAMAN AND NICOBAR ISLANDS",
    "dd": "DAMAN AND DIU", "dn": "DADRA AND NAGAR HAVELI",
    // Common short names / misspellings
    "uttar pradesh": "UTTAR PRADESH", "madhya pradesh": "MADHYA PRADESH",
    "andhra pradesh": "ANDHRA PRADESH", "andhra": "ANDHRA PRADESH",
    "arunachal pradesh": "ARUNACHAL PRADESH", "arunachal": "ARUNACHAL PRADESH",
    "himachal pradesh": "HIMACHAL PRADESH", "himachal": "HIMACHAL PRADESH",
    "tamil nadu": "TAMILNADU", "tamilnadu": "TAMILNADU",
    "west bengal": "WEST BENGAL", "bengal": "WEST BENGAL",
    "uttarakhand": "UTTARAKHAND", "uttrakhand": "UTTARAKHAND",
    "chhattisgarh": "CHHATTISGARH", "chattisgarh": "CHHATTISGARH", "chhatisgarh": "CHHATTISGARH",
    "jharkhand": "JHARKHAND", "jarkhand": "JHARKHAND",
    "maharashtra": "MAHARASHTRA", "maha": "MAHARASHTRA",
    "rajasthan": "RAJASTHAN", "gujarat": "GUJARAT",
    "karnataka": "KARNATAKA", "kerala": "KERALA",
    "punjab": "PUNJAB", "haryana": "HARYANA", "bihar": "BIHAR",
    "odisha": "ODISHA", "orissa": "ODISHA",
    "telangana": "TELANGANA", "telengana": "TELANGANA",
    "goa": "GOA", "sikkim": "SIKKIM", "manipur": "MANIPUR",
    "meghalaya": "MEGHALAYA", "mizoram": "MIZORAM", "nagaland": "NAGALAND",
    "tripura": "TRIPURA", "assam": "ASSAM",
    "delhi": "DELHI", "new delhi": "DELHI",
    "chandigarh": "CHANDIGARH", "puducherry": "PUDUCHERRY", "pondicherry": "PUDUCHERRY",
    "ladakh": "LADAKH", "lakshadweep": "LAKSHADWEEP",
    "andaman": "ANDAMAN AND NICOBAR ISLANDS", "nicobar": "ANDAMAN AND NICOBAR ISLANDS",
    "daman": "DAMAN AND DIU", "diu": "DAMAN AND DIU",
    "dadra": "DADRA AND NAGAR HAVELI", "nagar haveli": "DADRA AND NAGAR HAVELI",
    "jammu": "JAMMU AND KASHMIR", "kashmir": "JAMMU AND KASHMIR",
  };

  // ────── SMART QUERY PREPROCESSING ──────
  let q = query.toLowerCase().trim();
  
  // Expand abbreviations in the query for matching
  const resolveAliases = (input) => {
    const words = input.split(/\s+/);
    const resolved = [];
    // First try multi-word matches (longest first)
    let i = 0;
    while (i < words.length) {
      let matched = false;
      // Try 4-word, 3-word, 2-word combos first
      for (let len = Math.min(4, words.length - i); len >= 1; len--) {
        const phrase = words.slice(i, i + len).join(" ");
        if (STATE_ALIASES[phrase]) {
          resolved.push(STATE_ALIASES[phrase]);
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        resolved.push(words[i]);
        i++;
      }
    }
    return resolved;
  };
  
  const resolvedTokens = resolveAliases(q);
  
  // ────── CONTEXT BUILDING ──────
  let contextData = {};
  
  // Create lists from our parsed data
  const stateNames = data.states.map(s => s.state);
  
  // Match states
  const matchedStates = [];
  stateNames.forEach(s => {
    if (q.includes(s.toLowerCase())) {
      if (!matchedStates.includes(s)) matchedStates.push(s);
      return;
    }
    if (resolvedTokens.includes(s)) {
      if (!matchedStates.includes(s)) matchedStates.push(s);
    }
  });
  
  // Match districts
  const matchedDistricts = [];
  data.districts.forEach(d => {
    const dl = d.district.toLowerCase();
    if (q.includes(dl) || resolvedTokens.some(t => t.toLowerCase() === dl)) {
      if (!matchedDistricts.includes(d.district)) matchedDistricts.push(d.district);
      if (!matchedStates.includes(d.state)) matchedStates.push(d.state);
    }
  });

  if (matchedDistricts.length > 0) {
    // Exact district rows + State summary fallback
    contextData.districtDetails = data.districts.filter(d => matchedDistricts.includes(d.district));
    contextData.stateSummaries = data.states.filter(s => matchedStates.includes(s.state));
  } else if (matchedStates.length > 0) {
    // State level rows only
    contextData.stateDetails = data.states.filter(s => matchedStates.includes(s.state));
  } else {
    // ────── CONVERSATION HISTORY CONTEXT ──────
    const recentMsgs = chatHistory.slice(-4).map(m => m.text.toLowerCase()).join(" ");
    const historyResolvedTokens = resolveAliases(recentMsgs);
    
    const historyMatchedStates = [];
    stateNames.forEach(s => {
      if (recentMsgs.includes(s.toLowerCase()) || historyResolvedTokens.includes(s)) {
        if (!historyMatchedStates.includes(s)) historyMatchedStates.push(s);
      }
    });

    const historyMatchedDistricts = [];
    data.districts.forEach(d => {
      const dl = d.district.toLowerCase();
      if (recentMsgs.includes(dl) || historyResolvedTokens.some(t => t.toLowerCase() === dl)) {
        if (!historyMatchedDistricts.includes(d.district)) historyMatchedDistricts.push(d.district);
        if (!historyMatchedStates.includes(d.state)) historyMatchedStates.push(d.state);
      }
    });
    
    if (historyMatchedDistricts.length > 0) {
      contextData.districtDetails = data.districts.filter(d => historyMatchedDistricts.includes(d.district));
      contextData.stateSummaries = data.states.filter(s => historyMatchedStates.includes(s.state));
    } else if (historyMatchedStates.length > 0) {
      contextData.stateDetails = data.states.filter(s => historyMatchedStates.includes(s.state));
    } else {
      // Truly no match — pass national summary counts
      contextData.nationalOverview = {
        totalDistricts: data.districts.length,
        safe: data.districts.filter(d => d.category === "Safe").length,
        semiCritical: data.districts.filter(d => d.category === "Semi-Critical").length,
        critical: data.districts.filter(d => d.category === "Critical").length,
        overExploited: data.districts.filter(d => d.category === "Over-Exploited").length,
      };
    }
  }
  
  // (Context construction handled above)

  const prompt = `
You are AquaGuide AI, a friendly and intelligent groundwater assistant for India.

CONVERSATION RULES:
- If the user says a greeting (hi, hello, hey, namaste, etc.), respond warmly and briefly. Introduce yourself and ask how you can help with groundwater queries. Do NOT dump data.
- If the user says thanks, goodbye, okay, cool, etc., respond naturally and briefly like a human would.
- If the user asks something unrelated to groundwater or water (like weather, sports, coding, etc.), politely say you specialize in groundwater intelligence and redirect them. 
- If the user asks "what can you do" or "help", list your capabilities briefly.
- ONLY use the DATA CONTEXT below when the user asks an actual groundwater/water-related question.

CONTEXT AWARENESS (VERY IMPORTANT):
- You receive the last few messages of the conversation. USE THEM to understand what the user is referring to.
- If the user says "it", "this state", "that", "there", "which districts in it", etc., look at the previous messages to figure out which state/district they mean.
- ALWAYS continue the conversation in the context of the topic being discussed. Do NOT switch to national data unless explicitly asked.
- Understand common typos, grammatical errors, abbreviations, and informal language. Examples: "gimme", "wats", "hw is", "tel me", "show me abt", "kritical" = critical, "xploited" = exploited, "grndwater" = groundwater.

DATA ACCURACY RULES (CRITICAL — FOLLOW STRICTLY):
- You are part of the INGRES (India's National Ground Water Resource Estimation System).
- You ONLY have CGWB (Central Ground Water Board) assessment data for FY 2024-25. NO other year exists.
- If the user asks about 2023, 2022, 2020, or ANY other year: say "I only have FY 2024-25 data from CGWB. Would you like me to show that instead?"
- NEVER fabricate, guess, estimate, or hallucinate ANY number. Every number you cite MUST come from the DATA CONTEXT below.
- If a state, district, or block is NOT in the DATA CONTEXT, say "I don't have data for [name] in my database."
- Do NOT use your general training knowledge for any data answers. ONLY use what is in DATA CONTEXT.

AVAILABLE DATA FIELDS (per district/block):
- Rainfall (mm), Geographical area (ha), Recharge worthy area
- Ground Water Recharge (from rainfall, canals, irrigation, tanks, conservation structures)
- Annual Ground Water Recharge, Environmental Flows
- Annual Extractable Ground Water Resource
- Ground Water Extraction for all uses
- Stage of Ground Water Extraction (%) — this determines category: Safe (<70%), Semi-Critical (70-90%), Critical (90-100%), Over-Exploited (>100%)
- Allocation for Domestic Use (projected 2025)
- Net Annual Ground Water Availability for Future Use
- Quality Tagging (what contaminants are present)
- Additional Potential Resources (waterlogged, flood prone, spring discharge)
- In-Storage resources (confined/unconfined, fresh/saline)


WHEN ANSWERING DATA QUESTIONS, format systematically:

1. **Start with a 1-2 sentence summary** of the big picture.

2. **Use markdown headers** (##) to organize into sections like:
   ## 📊 Overview
   ## 🔍 Key Findings  
   ## ⚠️ Critical Areas
   ## 💡 Recommendations

3. **Use bullet points** for multiple data points — never dump raw numbers in paragraphs.

4. **Bold key numbers** like **86%** or **31 out of 36 units**.

5. **NEVER use markdown tables** (no | pipes). Instead, use bullet points with bold labels for comparisons.

6. **End with a Takeaway or Recommendation**.

CHART RULES: When the query involves categories, comparisons, or distributions — include a chart at the VERY END:
\`\`\`chart
{
  "type": "pie", 
  "title": "Clear Title Here",
  "labels": ["Label 1", "Label 2"],
  "data": [10, 20]
}
\`\`\`
Use "pie", "bar", "line", or "area". Use "line"/"area" for time trends.

DATA CONTEXT:
Source: CGWB INGRES (India's National Ground Water Resource Estimation System) — summaryData for FY 2024-25.
The data is organized into logical groups for each district/block:
- 🗺️ Geographical: Total area, recharge worthy area, hilly area.
- 🌧️ Recharge: Annual groundwater recharge from Various sources.
- 🌊 Environmental: Environmental flows (water reserved for nature).
- ⛏️ Extractable: Annual extractable groundwater resource.
- 🚰 Extraction: Groundwater extraction for domestic, industrial, and irrigation uses.
- 📈 Stage: Stage of groundwater extraction (%) and Category (Safe, Semi-Critical, Critical, Over-Exploited).
- 🏠 Allocation: Allocation for domestic use (projected 2025).
- 🔓 Net Availability: Net groundwater availability for future use.
- 🧪 Quality: Contaminants present (if any).

${matchedStates.length > 0 ? `User query resolved to: ${matchedStates.join(", ")}${matchedDistricts.length > 0 ? ` (Districts: ${matchedDistricts.join(", ")})` : ""}` : "No specific state/district matched — showing national overview."}
${JSON.stringify(contextData)}

User Query: "${query}"
`;

  try {
    const openai = new OpenAI({ 
      apiKey: apiKey, 
      dangerouslyAllowBrowser: true 
    });
    
    // Build conversation history for context awareness
    const historyMessages = chatHistory.slice(-6).map(m => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text
    }));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        ...historyMessages,
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
  const [data, setData] = useState({ districts: [], states: [] });
  const parsedData = useMemo(() => data, [data]);

  const [suggestions, setSuggestions] = useState(() => pickRandom(SUGGESTION_POOL, 4));
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loadingText, setLoadingText] = useState("Consulting CGWB...");
  const [streamingIdx, setStreamingIdx] = useState(-1); // index of currently streaming message
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

    fetch('/api/data')
      .then(res => res.json())
      .then(d => {
        setData(parseSummaryData(d));
      })
      .catch(console.error);

    return u; 
  }, [navigate]);
  
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  // Persist messages to active session
  useEffect(() => {
    if (messages.length === 0 || !user) return;

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
    setMessages([]);
    setSuggestions(pickRandom(SUGGESTION_POOL, 4));
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
    
    // Rotating creative loader
    const loaders = [
      "Consulting CGWB...",
      "Analyzing aquifer data...",
      "Mapping water blocks...",
      "Extracting basin telemetry...",
      "Checking ground reality...",
      "Diving into the data...",
      "Locating recharge zones..."
    ];
    setLoadingText(loaders[Math.floor(Math.random() * loaders.length)]);
    
    setTyping(true);
    
    // Quick delay for UI feel
    await new Promise(r => setTimeout(r, 600));
    
    const res = await getOpenAIResponse(q, parsedData, apiKey, messages);
    setTyping(false);

    // Add AI message with empty text, then stream it word by word
    const fullText = res.text;
    const aiMsg = { role:"ai", text:"", data:res.data, ts:new Date() };
    setMessages(m => [...m, aiMsg]);
    setStreamingIdx(prev => {
      // will be set to messages.length (the index of the new msg)
      return -2; // trigger below
    });

    // Stream line-by-line (tables need complete blocks to render)
    const lines = fullText.split("\n");
    let accumulated = "";
    let i = 0;
    while (i < lines.length) {
      // Detect table blocks (lines starting with |) and buffer them
      if (lines[i].trimStart().startsWith("|")) {
        let tableBlock = "";
        while (i < lines.length && lines[i].trimStart().startsWith("|")) {
          tableBlock += (tableBlock ? "\n" : "") + lines[i];
          i++;
        }
        accumulated += (accumulated ? "\n" : "") + tableBlock;
        const snapshot = accumulated;
        setMessages(m => {
          const updated = [...m];
          updated[updated.length - 1] = { ...updated[updated.length - 1], text: snapshot };
          return updated;
        });
        await new Promise(r => setTimeout(r, 60));
      } else {
        // Stream normal lines word-by-word
        const lineWords = lines[i].split(/( )/);
        const linePrefix = accumulated ? accumulated + "\n" : "";
        let lineAccum = "";
        for (let w = 0; w < lineWords.length; w++) {
          lineAccum += lineWords[w];
          const snapshot = linePrefix + lineAccum;
          setMessages(m => {
            const updated = [...m];
            updated[updated.length - 1] = { ...updated[updated.length - 1], text: snapshot };
            return updated;
          });
          const word = lineWords[w];
          const delay = /[.!?\n]/.test(word) ? 40 : word === " " ? 10 : 18;
          await new Promise(r => setTimeout(r, delay));
        }
        accumulated = linePrefix + lineAccum;
        i++;
      }
    }
    setStreamingIdx(-1);
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
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg, #0078d4, #00a8e8)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"var(--btn-text)", fontSize:13, boxShadow:"0 0 14px rgba(0,168,232,0.2)", cursor:"pointer" }} onClick={() => navigate('/')}>
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
            <button onClick={startNewChat} style={{ width:"100%", padding:"10px", background:"var(--accent-dim)", border:"1px solid rgba(0,168,232,0.2)", borderRadius:8, color:"var(--accent)", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"var(--font-body)", transition:"box-shadow 0.2s" }} onMouseOver={e=>e.currentTarget.style.boxShadow="0 0 12px var(--accent-glow)"} onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
              + New Chat
            </button>
          </div>

          <div style={{ flex:1, padding:"16px", overflowY:"auto", display:"flex", flexDirection:"column" }}>
            
            {sessions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Chat History</div>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)} style={{ padding:"10px 12px", marginBottom:6, background: activeSessionId === s.id ? "rgba(0,168,232,0.1)" : "transparent", border: activeSessionId === s.id ? "1px solid rgba(0,168,232,0.3)" : "1px solid transparent", borderRadius:7, fontSize:13, color: activeSessionId === s.id ? "var(--text)" : "var(--muted)", cursor:"pointer", transition:"all 0.2s", display:"flex", justifyContent:"space-between", alignItems:"center" }} className="nav-item">
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.title}</span>
                    <button onClick={(e) => deleteSession(e, s.id)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:11, padding:4 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {sessions.length === 0 && (
              <div style={{ textAlign:"center", marginTop:40, color:"var(--muted)", fontSize:13, fontFamily:"var(--font-mono)" }}>No previous chats</div>
            )}
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
                const c=["var(--accent)","#f0dc3a","#f5a623","#e84040"][i];
                return <span key={s} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:c, fontFamily:"var(--font-mono)", letterSpacing:"0.04em" }}><span style={{ width:6, height:6, borderRadius:"50%", background:c, display:"inline-block" }} />{s}</span>;
              })}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:0, display:"flex", flexDirection:"column" }}>
            {messages.length === 0 ? (
              /* ═══ Welcome Empty State ═══ */
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", animation:"fadeUp 0.6s ease both" }}>
                {/* Logo */}
                <div style={{ position:"relative", marginBottom:28 }}>
                  <div style={{ position:"absolute", inset:-12, background:"var(--accent)", filter:"blur(28px)", opacity:0.08, borderRadius:"50%" }} />
                  <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(0,168,232,0.1)", border:"1px solid rgba(0,168,232,0.2)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:1 }}>
                    <img src="/ingres.svg" alt="" style={{ width:32 }} />
                  </div>
                </div>

                <h2 style={{ fontFamily:"var(--font-display)", fontSize:28, marginBottom:12, color:"var(--text)", fontWeight:700, textAlign:"center" }}>How can I help you today?</h2>
                <p style={{ color:"var(--muted)", maxWidth:520, textAlign:"center", lineHeight:1.7, marginBottom:40, fontSize:14 }}>Ask about groundwater status, extraction rates, critical zones, or water quality across <strong style={{color:'var(--text)'}}>713+ districts</strong> and <strong style={{color:'var(--text)'}}>36 states/UTs</strong> — powered by CGWB FY 2024-25 data.</p>

                {/* Suggestion cards 2×2 */}
                <div style={{ width:"100%", maxWidth:720, display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:12 }}>
                  {suggestions.map((s, i) => (
                    <div key={s} className="suggestion-card" onClick={() => send(s)} style={{ padding:"16px 18px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, cursor:"pointer", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
                      <span style={{ width:32, height:32, borderRadius:8, background:"var(--accent-dim)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:16 }}>
                        {SUGGESTION_ICONS[i % SUGGESTION_ICONS.length]}
                      </span>
                      <span style={{ fontSize:13, color:"var(--text)", lineHeight:1.4, fontFamily:"var(--font-body)" }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ═══ Conversation View ═══ */
              <div style={{ padding:"24px 24px 24px", display:"flex", flexDirection:"column", gap:8, maxWidth:900, margin:"0 auto", width:"100%" }}>
                {messages.map((m, i) => {
                  const isFirstAiAfterUser = m.role === "ai" && i > 0 && messages[i-1]?.role === "user";
                  const isUser = m.role === "user";
                  return (
                  <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: isUser ? "flex-end" : "flex-start", animation:"fadeUp 0.3s ease both", marginTop: isUser ? 16 : (isFirstAiAfterUser ? 4 : (i > 0 && messages[i-1]?.role === "user" ? 16 : 0)) }}>
                    {isUser ? (
                      /* ─ User message ─ */
                      <div style={{ display:"flex", alignItems:"flex-end", gap:10, flexDirection:"row-reverse", maxWidth:"75%" }}>
                        <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(0,168,232,0.12)", border:"1px solid rgba(0,168,232,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)", fontSize:12, fontWeight:600, fontFamily:"var(--font-ui)", flexShrink:0 }}>
                          {(user?.displayName||user?.email||"U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ padding:"12px 16px", borderRadius:"18px 18px 4px 18px", background:"linear-gradient(135deg, var(--accent2), var(--accent))", color:"var(--btn-text)", fontSize:14, lineHeight:1.6, fontWeight:500 }}>
                            {m.text}
                          </div>
                          <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", marginTop:4, textAlign:"right", opacity:0.7 }}>{fmt(m.ts)}</div>
                        </div>
                      </div>
                    ) : (
                      /* ─ AI message ─ */
                      <div style={{ width:"100%", display:"flex", gap:12, alignItems:"flex-start" }}>
                        <div className="chat-avatar-ai" style={{ width:30, height:30, borderRadius:"50%", background:"rgba(0,168,232,0.1)", border:"1px solid rgba(0,168,232,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                          <img src="/ingres.svg" alt="" style={{ width:18 }} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* AI label + copy */}
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)", fontFamily:"var(--font-mono)", letterSpacing:"0.03em" }}>AquaGuide AI</span>
                            {i > 0 && m.text && (
                              <button 
                                onClick={() => { navigator.clipboard.writeText(m.text); }}
                                style={{ background:"none", border:"1px solid var(--border)", borderRadius:6, padding:"3px 8px", cursor:"pointer", color:"var(--muted)", fontSize:10, fontFamily:"var(--font-mono)", transition:"all 0.2s", display:"flex", alignItems:"center", gap:4 }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                                Copy
                              </button>
                            )}
                          </div>
                          <div className={`ai-markdown${i === messages.length - 1 && streamingIdx !== -1 ? ' streaming-cursor' : ''}`} style={{ color:"var(--text)", fontSize:14, lineHeight:1.75, fontWeight:400 }}>
                            <ReactMarkdown 
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                a({ href, children, ...props }) {
                                  return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color:"var(--accent)", textDecoration:"none", borderBottom:"1px solid rgba(0,168,232,0.3)" }} {...props}>{children}</a>;
                                },
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
                                            'rgba(0, 168, 232, 0.85)', 
                                            'rgba(240, 220, 58, 0.85)', 
                                            'rgba(245, 166, 35, 0.85)', 
                                            'rgba(232, 64, 64, 0.85)', 
                                            'rgba(0, 120, 212, 0.85)', 
                                            'rgba(90, 119, 138, 0.85)'
                                          ],
                                          hoverBackgroundColor: [
                                            'var(--accent)', '#f0dc3a', '#f5a623', '#e84040', 'var(--accent2)', '#7888a8'
                                          ],
                                          borderColor: '#0a1830',
                                          borderWidth: 2,
                                          hoverOffset: chartConfig.type === 'pie' ? 12 : 0,
                                          borderRadius: chartConfig.type === 'bar' ? 6 : 0,
                                          maxBarThickness: 95,
                                        }]
                                      };
                                      
                                      const options = {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        animation: { animateScale: true, animateRotate: true, duration: 800 },
                                        plugins: { 
                                          legend: { 
                                            position: 'bottom',
                                            labels: { color: '#dde8f0', padding: 16, font: { family: "'DM Sans', sans-serif", size: 12 }, usePointStyle: true, pointStyle: 'circle' } 
                                          }, 
                                          title: { display: !!chartConfig.title, text: chartConfig.title, color: '#00a8e8', font: { family: "'Playfair Display', serif", size: 16, weight: 'bold' }, padding: { bottom: 20 } },
                                          tooltip: {
                                            backgroundColor: 'rgba(10, 24, 48, 0.9)',
                                            titleColor: '#00a8e8',
                                            bodyColor: '#dde8f0',
                                            borderColor: '#163054',
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
                                          y: { ticks: { color: '#5a7a9e', font:{family:"'DM Mono', monospace"} }, grid: { color: 'rgba(0, 168, 232, 0.05)', tickLength: 0 }, border: { dash: [4,4], display: false } },
                                          x: { ticks: { color: '#dde8f0', font:{family:"'DM Sans', sans-serif"} }, grid: { display: false } }
                                        } : {}
                                      };

                                      const isRecharts = chartConfig.type === 'line' || chartConfig.type === 'area';
                                      
                                      if (isRecharts) {
                                        const rechartsData = chartConfig.labels.map((label, idx) => ({
                                          name: label,
                                          value: chartConfig.data[idx]
                                        }));
                                        
                                        const CustomTooltip = ({ active, payload, label }) => {
                                          if (active && payload && payload.length) {
                                            return (
                                              <div style={{ background: 'var(--surface-glass)', border: '1px solid var(--border)', padding: 12, borderRadius: 8, backdropFilter:"blur(8px)" }}>
                                                <p style={{ color: 'var(--accent)', margin: 0, paddingBottom: 6, borderBottom: '1px solid var(--border)', fontFamily: "var(--font-display)" }}>{label}</p>
                                                <p style={{ color: 'var(--text)', margin: 0, paddingTop: 6, fontFamily: "var(--font-mono)", fontSize: 13 }}>Value: {payload[0].value}</p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        };

                                        return (
                                          <div style={{ background: "var(--bg2)", borderRadius: 16, padding: "20px", marginTop: 16, marginBottom: 8, border: "1px solid var(--border)", position: "relative", zIndex: 1, width: "100%", height: "380px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", transition: "transform 0.3s" }} 
                                               onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"}
                                               onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                                            {chartConfig.title && <h3 style={{ textAlign: 'center', color: 'var(--accent)', fontFamily: "var(--font-display)", marginBottom: 16, marginTop: 0 }}>{chartConfig.title}</h3>}
                                            <ResponsiveContainer width="100%" height="85%">
                                              {chartConfig.type === 'line' ? (
                                                <LineChart data={rechartsData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(0, 168, 232, 0.05)" vertical={false} />
                                                  <XAxis dataKey="name" stroke="var(--text)" tick={{ fill: 'var(--text)', fontSize: 12, fontFamily: "var(--font-body)" }} axisLine={false} tickLine={false} />
                                                  <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                                                  <RechartsTooltip content={<CustomTooltip />} />
                                                  <RechartsLegend wrapperStyle={{ paddingTop: 10, fontFamily: "var(--font-body)", fontSize: 12, color: 'var(--text)' }} />
                                                  <Line type="monotone" dataKey="value" name={chartConfig.title || "Value"} stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--bg)' }} />
                                                </LineChart>
                                              ) : (
                                                <AreaChart data={rechartsData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                                  <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                                                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                                                    </linearGradient>
                                                  </defs>
                                                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(0, 168, 232, 0.05)" vertical={false} />
                                                  <XAxis dataKey="name" stroke="var(--text)" tick={{ fill: 'var(--text)', fontSize: 12, fontFamily: "var(--font-body)" }} axisLine={false} tickLine={false} />
                                                  <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                                                  <RechartsTooltip content={<CustomTooltip />} />
                                                  <RechartsLegend wrapperStyle={{ paddingTop: 10, fontFamily: "var(--font-body)", fontSize: 12, color: 'var(--text)' }} />
                                                  <Area type="monotone" dataKey="value" name={chartConfig.title || "Value"} stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                                </AreaChart>
                                              )}
                                            </ResponsiveContainer>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div style={{ background: "var(--bg2)", borderRadius: 16, padding: "20px", marginTop: 16, marginBottom: 8, border: "1px solid var(--border)", position: "relative", zIndex: 1, width: "100%", height: chartConfig.type === 'pie' ? "420px" : "380px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", transition: "transform 0.3s", paddingBottom: "30px" }} 
                                             onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"}
                                             onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                                          {chartConfig.type === 'pie' ? <Pie data={chartData} options={options} /> : <Bar data={chartData} options={options} />}
                                        </div>
                                      );
                                    } catch (e) {
                                      return (
                                        <div style={{ background:"var(--surface)", borderRadius:12, padding:16, marginTop:12, border:"1px solid var(--border)", textAlign:"center" }}>
                                          <div style={{ fontSize:24, marginBottom:6 }}>⚠️</div>
                                          <div style={{ color:"var(--muted)", fontSize:12, fontFamily:"var(--font-mono)" }}>Could not render chart</div>
                                        </div>
                                      );
                                    }
                                  }
                                  return <code className={className} {...props}>{children}</code>;
                                }
                              }}
                            >
                              {m.text}
                            </ReactMarkdown>
                          </div>
                          {m.data && !m.text.includes("```chart") && (
                            <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:8 }}>
                              {m.data.map(([l,c,n])=>(
                                <div key={l} style={{ flex:"1 1 100px", background:`${c}18`, border:`1px solid ${c}33`, borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
                                  <div style={{ fontSize:18, fontWeight:700, color:c, fontFamily:"var(--font-display)" }}>{n}</div>
                                  <div style={{ fontSize:9, color:c, opacity:0.8, fontFamily:"var(--font-mono)", marginTop:2 }}>{l}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", marginTop:6, opacity:0.7 }}>{fmt(m.ts)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* Typing indicator */}
                {typing && (
                  <div style={{ display:"flex", gap:14, alignItems:"flex-start", animation:"fadeUp 0.3s ease both" }}>
                    <div className="chat-avatar-ai" style={{ width:30, height:30, borderRadius:"50%", background:"rgba(0,168,232,0.1)", border:"1px solid rgba(0,168,232,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                      <img src="/ingres.svg" alt="" style={{ width:18 }} />
                    </div>
                    <div style={{ display:"flex", alignItems:"center", paddingTop:4 }}>
                      <div style={{ padding:"12px 20px", borderRadius:16, background:"rgba(10,24,48,0.4)", border:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12, backdropFilter:"blur(8px)" }}>
                        <span style={{ color:"var(--accent)", display:"flex" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin-slow 3s linear infinite"}}/></svg>
                        </span>
                        <span style={{ fontSize:12, fontWeight:600, fontFamily:"var(--font-mono)", letterSpacing:"0.05em", textTransform:"uppercase", backgroundImage:"linear-gradient(90deg, var(--text) 0%, var(--muted) 50%, var(--text) 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"shimmer 2.5s linear infinite" }}>{loadingText}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} style={{ height:1 }} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{ padding:"0 24px 20px", background:"var(--bg)" }}>
            <div className="input-glass" style={{ display:"flex", gap:12, alignItems:"flex-end", background:"rgba(10,24,48,0.5)", border:"1px solid rgba(0,168,232,0.15)", borderRadius:18, padding:"10px 10px 10px 20px", backdropFilter:"blur(16px)", boxShadow:"0 8px 32px rgba(0,0,0,0.15)" }}>
              <textarea
                className="chat-input"
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about groundwater in any state, district, or block…"
                rows={1}
                style={{ flex:1, background:"transparent", border:"none", color:"var(--text)", fontSize:15, fontFamily:"var(--font-body)", resize:"none", outline:"none", lineHeight:1.5, padding:"8px 0", maxHeight:140, overflowY:"auto" }}
              />
              <button 
                className="send-btn" 
                onClick={() => send()} 
                disabled={!input.trim() || typing} 
                style={{ 
                  width:44, height:44, borderRadius:12, 
                  background: input.trim() && !typing ? "linear-gradient(135deg, var(--accent2), var(--accent))" : "rgba(255,255,255,0.05)", 
                  border:"none", cursor: input.trim() && !typing ? "pointer" : "default", 
                  display:"flex", alignItems:"center", justifyContent:"center", 
                  transition:"all 0.25s cubic-bezier(.22,1,.36,1)", 
                  boxShadow: input.trim() && !typing ? "0 4px 16px rgba(0,168,232,0.25)" : "none",
                  color: input.trim() && !typing ? "var(--btn-text)" : "var(--muted)",
                  flexShrink:0 
                }}
                onMouseEnter={e => { if(input.trim() && !typing) e.currentTarget.style.transform = "scale(1.06)"; }}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", textAlign:"center", marginTop:10, opacity:0.7 }}>
              Powered by CGWB FY 2024-25 data · Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
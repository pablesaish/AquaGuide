import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import { exportToCSV, exportToExcel, exportToPDF } from "../utils/exportUtils";
import rawReport from "../data/reportData.json";

/* ══════════════════════════════════════════════════════════
   AquaGuide AI – Data Explorer
   Dynamic Ground Water Assessment Table (FY 2024-25)
   ══════════════════════════════════════════════════════════ */

/* ─── Scoped CSS ──────────────────────────────────────── */
const css = `
.de-wrap{display:flex;height:100vh;overflow:hidden;background:var(--bg);transition:background .35s}
.de-main{flex:1;display:flex;flex-direction:column;overflow:hidden}

/* Header Bar */
.de-header{padding:20px 28px;border-bottom:1px solid var(--border);flex-shrink:0;animation:fadeUp .4s ease both;transition:border-color .35s}
.de-header-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.de-title{font-family:var(--font-display);font-size:clamp(16px,2.2vw,22px);font-weight:900;line-height:1.2}
.de-subtitle{font-size:12px;color:var(--muted);font-family:var(--font-mono);letter-spacing:.06em;margin-top:2px}

/* Summary Chips */
.de-chips{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;animation:fadeUp .4s ease .05s both}
.de-chip{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface);font-size:12px;font-family:var(--font-mono);color:var(--muted);transition:all .25s;cursor:default}
.de-chip b{font-weight:700;font-size:16px;font-family:var(--font-display)}

/* Filter Bar */
.de-filters{display:flex;gap:10px;align-items:center;padding:14px 28px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap;animation:fadeUp .4s ease .1s both;transition:border-color .35s}
.de-select,.de-search{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 14px;color:var(--text);font-size:12px;font-family:var(--font-body);outline:none;transition:all .25s;min-width:0}
.de-select:focus,.de-search:focus{border-color:rgba(0,168,232,.4);box-shadow:0 0 0 3px var(--accent-dim)}
.de-search{flex:1;max-width:300px;min-width:140px}
.de-filter-label{font-size:10px;color:var(--muted);font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}

/* Column Group Nav */
.de-col-groups{display:flex;gap:4px;padding:10px 28px;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto;animation:fadeUp .4s ease .15s both;transition:border-color .35s}
.de-col-btn{padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:11px;font-family:var(--font-mono);cursor:pointer;transition:all .2s;white-space:nowrap;letter-spacing:.03em}
.de-col-btn:hover{border-color:rgba(0,168,232,.3);color:var(--accent);background:var(--accent-dim)}
.de-col-btn.active{border-color:var(--accent);color:var(--accent);background:var(--accent-dim);font-weight:600}

/* Table Container */
.de-table-wrap{flex:1;overflow:auto;padding:0;position:relative}
.de-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;font-family:var(--font-body)}
.de-table thead{position:sticky;top:0;z-index:10}
.de-table thead th{background:var(--bg2);color:var(--accent);font-weight:600;font-size:10px;font-family:var(--font-mono);letter-spacing:.06em;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:2px solid var(--accent);white-space:nowrap;position:relative;transition:background .35s,color .35s}
.de-table thead th.group-header{background:var(--surface);color:var(--text);font-size:11px;font-weight:700;font-family:var(--font-display);text-transform:none;letter-spacing:0;border-bottom:1px solid var(--border);text-align:center;padding:8px 14px}
.de-table tbody tr{transition:background .15s}
.de-table tbody tr:hover{background:rgba(0,168,232,.04)!important}
.de-table tbody tr:nth-child(even){background:rgba(255,255,255,.01)}
.de-table tbody td{padding:9px 14px;border-bottom:1px solid var(--border);color:var(--text);white-space:nowrap;transition:background .15s,border-color .35s}
.de-table tbody td.state-cell{font-weight:600;color:var(--accent);position:sticky;left:0;z-index:5;background:var(--bg)}
.de-table tbody tr:nth-child(even) td.state-cell{background:var(--bg)}
.de-table tbody tr:hover td.state-cell{background:rgba(0,168,232,.04)!important}
.de-table tbody td.num-cell{text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--text)}
.de-table tbody td.cat-cell{font-weight:600;font-size:11px;font-family:var(--font-mono)}

/* Category Colors */
.cat-safe{color:#00e8a2!important}
.cat-semi{color:#f0dc3a!important}
.cat-critical{color:#f5a623!important}
.cat-over{color:#e84040!important}

/* Status Bar */
.de-status{display:flex;justify-content:space-between;align-items:center;padding:10px 28px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);font-family:var(--font-mono);flex-shrink:0;transition:border-color .35s}

/* Buttons */
.de-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:11px;font-weight:600;font-family:var(--font-body);cursor:pointer;transition:all .25s;white-space:nowrap}
.de-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-dim)}
.de-btn-primary{background:var(--accent);border-color:var(--accent);color:var(--btn-text)}
.de-btn-primary:hover{background:var(--accent2);box-shadow:0 0 20px var(--accent-glow);transform:translateY(-1px)}

/* Export Menu */
.de-export-menu{position:absolute;right:0;top:100%;margin-top:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:150px;z-index:30;box-shadow:0 8px 32px rgba(0,0,0,.3);animation:fadeUp .15s ease both}
.de-export-item{padding:8px 12px;border-radius:6px;font-size:12px;color:var(--text);cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .15s;font-family:var(--font-body)}
.de-export-item:hover{background:var(--accent-dim);color:var(--accent)}

/* Pagination */
.de-pagination{display:flex;align-items:center;gap:4px}
.de-page-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:11px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono)}
.de-page-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-dim)}
.de-page-btn.active{border-color:var(--accent);color:var(--accent);background:var(--accent-dim);font-weight:700}
.de-page-btn:disabled{opacity:.3;cursor:not-allowed;pointer-events:none}

/* Scroll indicator */
.de-table-wrap::-webkit-scrollbar{height:6px;width:6px}

/* Loading */
.de-loading{display:flex;align-items:center;justify-content:center;flex:1;color:var(--accent);font-family:var(--font-mono);font-size:14px;gap:10px}
.de-loading .dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:pulse-dot 1s infinite}
.de-loading .dot:nth-child(2){animation-delay:.15s}
.de-loading .dot:nth-child(3){animation-delay:.3s}

@media(max-width:768px){
  .de-filters{flex-direction:column;align-items:stretch}
  .de-search{max-width:100%}
  .de-chips{flex-wrap:wrap}
  .de-header-top{flex-direction:column;align-items:flex-start}
}
`;

/* ─── Parse raw data & build state-level and district-level views ────── */
function parseReportData() {
  const gec = rawReport.GEC;
  const dataRows = gec.slice(8); // skip header rows

  const districts = [];
  const stateAgg = {};

  for (const row of dataRows) {
    if (!row.__EMPTY_1 || row.__EMPTY_1 === "STATE") continue;

    const state = String(row.__EMPTY_1).trim();
    const district = String(row.__EMPTY_2 || "").trim();

    // Key columns matching the reference screenshot
    const geoC = parseFloat(row.__EMPTY_8) || 0;
    const geoNC = parseFloat(row.__EMPTY_9) || 0;
    const geoTotal = parseFloat(row.__EMPTY_11) || 0;
    const hillyArea = parseFloat(row.__EMPTY_12) || 0;
    const geoGrandTotal = parseFloat(row.__EMPTY_13) || 0;

    const extractC = parseFloat(row.__EMPTY_90) || 0;
    const extractNC = parseFloat(row.__EMPTY_91) || 0;
    const extractTotal = parseFloat(row.__EMPTY_93) || 0;

    const gwExtractC = parseFloat(row.__EMPTY_106) || 0;
    const gwExtractNC = parseFloat(row.__EMPTY_107) || 0;
    const gwExtractTotal = parseFloat(row.__EMPTY_109) || 0;

    const stageC = parseFloat(row.__EMPTY_110) || 0;
    const stageNC = parseFloat(row.__EMPTY_111) || 0;
    const stageTotal = parseFloat(row.__EMPTY_113) || 0;

    // Annual GW Recharge
    const rechargeC = parseFloat(row.__EMPTY_82) || 0;
    const rechargeNC = parseFloat(row.__EMPTY_83) || 0;
    const rechargeTotal = parseFloat(row.__EMPTY_85) || 0;

    // Environmental Flows
    const envC = parseFloat(row.__EMPTY_86) || 0;
    const envNC = parseFloat(row.__EMPTY_87) || 0;
    const envTotal = parseFloat(row.__EMPTY_89) || 0;

    // GW Extraction breakdown
    const domC = parseFloat(row.__EMPTY_94) || 0;
    const domNC = parseFloat(row.__EMPTY_95) || 0;
    const domTotal = parseFloat(row.__EMPTY_97) || 0;

    const indC = parseFloat(row.__EMPTY_98) || 0;
    const indNC = parseFloat(row.__EMPTY_99) || 0;
    const indTotal = parseFloat(row.__EMPTY_101) || 0;

    const irrC = parseFloat(row.__EMPTY_102) || 0;
    const irrNC = parseFloat(row.__EMPTY_103) || 0;
    const irrTotal = parseFloat(row.__EMPTY_105) || 0;

    // Allocation for domestic projected 2025
    const allocC = parseFloat(row.__EMPTY_114) || 0;
    const allocNC = parseFloat(row.__EMPTY_115) || 0;
    const allocTotal = parseFloat(row.__EMPTY_117) || 0;

    // Net availability for future
    const netC = parseFloat(row.__EMPTY_118) || 0;
    const netNC = parseFloat(row.__EMPTY_119) || 0;
    const netTotal = parseFloat(row.__EMPTY_121) || 0;

    // Quality
    const qualMajC = row.__EMPTY_122 || "";
    const qualMajNC = row.__EMPTY_123 || "";

    if (isNaN(stageTotal)) continue;

    let category = "Safe";
    if (stageTotal > 100) category = "Over-Exploited";
    else if (stageTotal > 90) category = "Critical";
    else if (stageTotal > 70) category = "Semi-Critical";

    const districtRow = {
      state, district, category,
      geoC, geoNC, geoTotal, hillyArea, geoGrandTotal,
      rechargeC, rechargeNC, rechargeTotal,
      envC, envNC, envTotal,
      extractC, extractNC, extractTotal,
      domC, domNC, domTotal,
      indC, indNC, indTotal,
      irrC, irrNC, irrTotal,
      gwExtractC, gwExtractNC, gwExtractTotal,
      stageC, stageNC, stageTotal,
      allocC, allocNC, allocTotal,
      netC, netNC, netTotal,
      qualMajC, qualMajNC,
    };

    districts.push(districtRow);

    // Aggregate to state level
    if (!stateAgg[state]) {
      stateAgg[state] = {
        state, district: "",
        geoC: 0, geoNC: 0, geoTotal: 0, hillyArea: 0, geoGrandTotal: 0,
        rechargeC: 0, rechargeNC: 0, rechargeTotal: 0,
        envC: 0, envNC: 0, envTotal: 0,
        extractC: 0, extractNC: 0, extractTotal: 0,
        domC: 0, domNC: 0, domTotal: 0,
        indC: 0, indNC: 0, indTotal: 0,
        irrC: 0, irrNC: 0, irrTotal: 0,
        gwExtractC: 0, gwExtractNC: 0, gwExtractTotal: 0,
        stageC: 0, stageNC: 0, stageTotal: 0,
        allocC: 0, allocNC: 0, allocTotal: 0,
        netC: 0, netNC: 0, netTotal: 0,
        qualMajC: "", qualMajNC: "",
        _distCount: 0,
      };
    }
    const s = stateAgg[state];
    s._distCount++;
    const sumKeys = [
      "geoC","geoNC","geoTotal","hillyArea","geoGrandTotal",
      "rechargeC","rechargeNC","rechargeTotal",
      "envC","envNC","envTotal",
      "extractC","extractNC","extractTotal",
      "domC","domNC","domTotal","indC","indNC","indTotal","irrC","irrNC","irrTotal",
      "gwExtractC","gwExtractNC","gwExtractTotal",
      "allocC","allocNC","allocTotal",
      "netC","netNC","netTotal",
    ];
    for (const k of sumKeys) s[k] += districtRow[k];
  }

  // Calculate weighted-average stage % for states
  for (const s of Object.values(stateAgg)) {
    if (s.extractTotal > 0) {
      s.stageC = s.extractC > 0 ? (s.gwExtractC / s.extractC * 100) : 0;
      s.stageNC = s.extractNC > 0 ? (s.gwExtractNC / s.extractNC * 100) : 0;
      s.stageTotal = s.gwExtractTotal / s.extractTotal * 100;
    }
    let category = "Safe";
    if (s.stageTotal > 100) category = "Over-Exploited";
    else if (s.stageTotal > 90) category = "Critical";
    else if (s.stageTotal > 70) category = "Semi-Critical";
    s.category = category;
  }

  return { districts, states: Object.values(stateAgg) };
}

/* ─── Column Definitions ─────────────────────────────── */
const COLUMN_GROUPS = [
  {
    id: "geo",
    label: "Geographical Area",
    columns: [
      { key: "geoC", label: "C", sub: "Recharge Worthy" },
      { key: "geoNC", label: "NC", sub: "Recharge Worthy" },
      { key: "geoTotal", label: "Total", sub: "Recharge Worthy" },
      { key: "hillyArea", label: "Hilly Area", sub: "" },
      { key: "geoGrandTotal", label: "Total", sub: "Grand Total" },
    ],
    groupLabel: "Total Geographical Area (ha)",
  },
  {
    id: "recharge",
    label: "GW Recharge",
    columns: [
      { key: "rechargeC", label: "C", sub: "" },
      { key: "rechargeNC", label: "NC", sub: "" },
      { key: "rechargeTotal", label: "Total", sub: "" },
    ],
    groupLabel: "Annual Ground Water Recharge (ham)",
  },
  {
    id: "env",
    label: "Env. Flows",
    columns: [
      { key: "envC", label: "C", sub: "" },
      { key: "envNC", label: "NC", sub: "" },
      { key: "envTotal", label: "Total", sub: "" },
    ],
    groupLabel: "Environmental Flows (ham)",
  },
  {
    id: "extract",
    label: "Extractable Resource",
    columns: [
      { key: "extractC", label: "C", sub: "" },
      { key: "extractNC", label: "NC", sub: "" },
      { key: "extractTotal", label: "Total", sub: "" },
    ],
    groupLabel: "Annual Extractable GW Resource (ham)",
  },
  {
    id: "usage",
    label: "GW Extraction",
    columns: [
      { key: "domC", label: "C", sub: "Domestic" },
      { key: "domNC", label: "NC", sub: "Domestic" },
      { key: "domTotal", label: "Total", sub: "Domestic" },
      { key: "indC", label: "C", sub: "Industrial" },
      { key: "indNC", label: "NC", sub: "Industrial" },
      { key: "indTotal", label: "Total", sub: "Industrial" },
      { key: "irrC", label: "C", sub: "Irrigation" },
      { key: "irrNC", label: "NC", sub: "Irrigation" },
      { key: "irrTotal", label: "Total", sub: "Irrigation" },
      { key: "gwExtractC", label: "C", sub: "Total Extract" },
      { key: "gwExtractNC", label: "NC", sub: "Total Extract" },
      { key: "gwExtractTotal", label: "Total", sub: "Total Extract" },
    ],
    groupLabel: "Ground Water Extraction (ham)",
  },
  {
    id: "stage",
    label: "Extraction Stage",
    columns: [
      { key: "stageC", label: "C", sub: "" },
      { key: "stageNC", label: "NC", sub: "" },
      { key: "stageTotal", label: "Total", sub: "" },
    ],
    groupLabel: "Stage of GW Extraction (%)",
  },
  {
    id: "alloc",
    label: "Domestic Alloc.",
    columns: [
      { key: "allocC", label: "C", sub: "" },
      { key: "allocNC", label: "NC", sub: "" },
      { key: "allocTotal", label: "Total", sub: "" },
    ],
    groupLabel: "Allocation for Domestic Use 2025 (ham)",
  },
  {
    id: "net",
    label: "Net Availability",
    columns: [
      { key: "netC", label: "C", sub: "" },
      { key: "netNC", label: "NC", sub: "" },
      { key: "netTotal", label: "Total", sub: "" },
    ],
    groupLabel: "Net GW Availability for Future (ham)",
  },
  {
    id: "quality",
    label: "Quality",
    columns: [
      { key: "qualMajC", label: "Major C", sub: "" },
      { key: "qualMajNC", label: "Major NC", sub: "" },
    ],
    groupLabel: "Quality Tagging",
  },
];

const ROWS_PER_PAGE = 50;

/* ─── Format number ──────────────────────────────────── */
function fmt(val) {
  if (val === "" || val === undefined || val === null) return "-";
  if (typeof val === "string") return val || "-";
  if (isNaN(val)) return "-";
  if (val === 0) return "0.00";
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + "M";
  if (Math.abs(val) >= 1e4) return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return val.toFixed(2);
}

function getCatClass(cat) {
  if (cat === "Safe") return "cat-safe";
  if (cat === "Semi-Critical") return "cat-semi";
  if (cat === "Critical") return "cat-critical";
  if (cat === "Over-Exploited") return "cat-over";
  return "";
}

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */
export default function DataExplorer() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("state"); // "state" | "district"
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [activeGroup, setActiveGroup] = useState("all");
  const [page, setPage] = useState(1);
  const [showExport, setShowExport] = useState(false);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const tableRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      if (!u) navigate("/login");
      else setUser(u);
    });
  }, []);

  /* ─── Parse data once ──────────────────────────────── */
  const { districts, states } = useMemo(() => parseReportData(), []);

  /* ─── Unique state list ────────────────────────────── */
  const stateList = useMemo(() => {
    const set = new Set(districts.map(d => d.state));
    return Array.from(set).sort();
  }, [districts]);

  /* ─── Active columns ──────────────────────────────── */
  const activeColumns = useMemo(() => {
    if (activeGroup === "all") return COLUMN_GROUPS.flatMap(g => g.columns);
    const group = COLUMN_GROUPS.find(g => g.id === activeGroup);
    return group ? group.columns : [];
  }, [activeGroup]);

  /* ─── Active group headers (for multi-row header) ─── */
  const activeGroupHeaders = useMemo(() => {
    if (activeGroup === "all") return COLUMN_GROUPS;
    const group = COLUMN_GROUPS.find(g => g.id === activeGroup);
    return group ? [group] : [];
  }, [activeGroup]);

  /* ─── Filtered & sorted rows ──────────────────────── */
  const filteredRows = useMemo(() => {
    let rows = viewMode === "state" ? states : districts;

    if (stateFilter !== "ALL") {
      rows = rows.filter(r => r.state === stateFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.state.toLowerCase().includes(q) ||
        (r.district && r.district.toLowerCase().includes(q))
      );
    }

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [viewMode, states, districts, stateFilter, search, sortKey, sortDir]);

  /* ─── Summary stats ───────────────────────────────── */
  const summaryStats = useMemo(() => {
    const total = filteredRows.length;
    const safe = filteredRows.filter(r => r.category === "Safe").length;
    const semi = filteredRows.filter(r => r.category === "Semi-Critical").length;
    const crit = filteredRows.filter(r => r.category === "Critical").length;
    const over = filteredRows.filter(r => r.category === "Over-Exploited").length;
    return { total, safe, semi, crit, over };
  }, [filteredRows]);

  /* ─── Pagination ───────────────────────────────────── */
  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const paginatedRows = filteredRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => { setPage(1); }, [viewMode, stateFilter, search, activeGroup]);

  /* ─── Sort handler ─────────────────────────────────── */
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  /* ─── Export ───────────────────────────────────────── */
  const handleExport = (format) => {
    setShowExport(false);
    const rows = filteredRows.map((r, i) => {
      const obj = { "#": i + 1, State: r.state };
      if (viewMode === "district") obj.District = r.district;
      obj.Category = r.category;
      for (const col of activeColumns) {
        obj[col.sub ? `${col.sub} - ${col.label}` : col.label] = r[col.key];
      }
      return obj;
    });
    const fn = `aquaguide_data_explorer_${viewMode}_${Date.now()}`;
    if (format === "csv") exportToCSV(rows, fn + ".csv");
    else if (format === "excel") exportToExcel(rows, fn + ".xlsx", "Data Explorer");
    else if (format === "pdf") exportToPDF(rows, `Groundwater Assessment — ${viewMode === "state" ? "State" : "District"} View`, fn + ".pdf");
  };

  return (
    <>
      <style>{css}</style>
      <div className="de-wrap">
        <Sidebar />

        <div className="de-main">
          {/* ── Header ─────────────────────────────────── */}
          <div className="de-header">
            <div className="de-header-top">
              <div>
                <div className="de-subtitle">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", marginRight: 6, animation: "pulse-dot 1.5s infinite" }} />
                  CGWB · FY 2024-25 · DYNAMIC GROUND WATER ASSESSMENT
                </div>
                <div className="de-title">
                  Data Explorer{" "}
                  <span style={{ color: "var(--accent)", fontStyle: "italic" }}>— A.Y 2024-2025</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Export */}
                <div style={{ position: "relative" }}>
                  <button className="de-btn" onClick={() => setShowExport(!showExport)}>
                    ⬇ Export
                  </button>
                  {showExport && (
                    <div className="de-export-menu">
                      {[["📄","CSV","csv"],["📊","Excel","excel"],["📕","PDF","pdf"]].map(([icon,label,fmt]) => (
                        <div key={fmt} className="de-export-item" onClick={() => handleExport(fmt)}>
                          {icon} {label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="de-btn de-btn-primary" onClick={() => navigate("/chatbot")}>
                  💬 Ask AI
                </button>
              </div>
            </div>

            {/* Summary Chips */}
            <div className="de-chips">
              <div className="de-chip">
                <span>📊</span>
                <span>Total <b style={{ color: "var(--accent)" }}>{summaryStats.total.toLocaleString()}</b></span>
              </div>
              <div className="de-chip">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00e8a2" }} />
                <span>Safe <b style={{ color: "#00e8a2" }}>{summaryStats.safe.toLocaleString()}</b></span>
              </div>
              <div className="de-chip">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f0dc3a" }} />
                <span>Semi-Critical <b style={{ color: "#f0dc3a" }}>{summaryStats.semi.toLocaleString()}</b></span>
              </div>
              <div className="de-chip">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f5a623" }} />
                <span>Critical <b style={{ color: "#f5a623" }}>{summaryStats.crit.toLocaleString()}</b></span>
              </div>
              <div className="de-chip">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e84040" }} />
                <span>Over-Exploited <b style={{ color: "#e84040" }}>{summaryStats.over.toLocaleString()}</b></span>
              </div>
            </div>
          </div>

          {/* ── Filter Bar ─────────────────────────────── */}
          <div className="de-filters">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="de-filter-label">View</span>
              <select className="de-select" value={viewMode} onChange={e => setViewMode(e.target.value)}>
                <option value="state">State</option>
                <option value="district">District</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="de-filter-label">State</span>
              <select className="de-select" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                <option value="ALL">All States</option>
                {stateList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="de-filter-label">Period</span>
              <select className="de-select" value="ANNUAL" disabled>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="de-filter-label">Year</span>
              <select className="de-select" value="2024-2025" disabled>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            <input
              className="de-search"
              type="text"
              placeholder={`Search ${viewMode === "state" ? "states" : "states & districts"}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <button
              className="de-btn"
              style={{ marginLeft: "auto" }}
              onClick={() => { setSearch(""); setStateFilter("ALL"); setSortKey(null); }}
            >
              ↺ Reset
            </button>
          </div>

          {/* ── Column Group Navigation ────────────────── */}
          <div className="de-col-groups">
            <button
              className={`de-col-btn ${activeGroup === "all" ? "active" : ""}`}
              onClick={() => setActiveGroup("all")}
            >
              All Columns
            </button>
            {COLUMN_GROUPS.map(g => (
              <button
                key={g.id}
                className={`de-col-btn ${activeGroup === g.id ? "active" : ""}`}
                onClick={() => setActiveGroup(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* ── Data Table ─────────────────────────────── */}
          <div className="de-table-wrap" ref={tableRef}>
            <table className="de-table">
              <thead>
                {/* Group header row */}
                <tr>
                  <th rowSpan={2} style={{ minWidth: 45, textAlign: "center", position: "sticky", left: 0, zIndex: 11, background: "var(--bg2)" }}>S.No</th>
                  <th rowSpan={2} style={{ minWidth: 160, position: "sticky", left: 0, zIndex: 11, background: "var(--bg2)" }}>
                    {viewMode === "state" ? "STATE" : "STATE"}
                  </th>
                  {viewMode === "district" && (
                    <th rowSpan={2} style={{ minWidth: 150 }}>DISTRICT</th>
                  )}
                  <th rowSpan={2} style={{ minWidth: 100 }}>CATEGORY</th>
                  {activeGroupHeaders.map(g => (
                    <th key={g.id} className="group-header" colSpan={g.columns.length}>
                      {g.groupLabel}
                    </th>
                  ))}
                </tr>
                {/* Sub-column header row */}
                <tr>
                  {activeColumns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ cursor: "pointer", minWidth: 85, userSelect: "none" }}
                      title={col.sub ? `${col.sub} — ${col.label}` : col.label}
                    >
                      {col.sub ? <>{col.sub}<br />{col.label}</> : col.label}
                      {sortKey === col.key && (
                        <span style={{ marginLeft: 4, fontSize: 9 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + (viewMode === "district" ? 1 : 0) + activeColumns.length}
                      style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                    >
                      No data found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                        {(page - 1) * ROWS_PER_PAGE + idx + 1}
                      </td>
                      <td className="state-cell">{row.state}</td>
                      {viewMode === "district" && (
                        <td style={{ fontWeight: 500 }}>{row.district || "-"}</td>
                      )}
                      <td className={`cat-cell ${getCatClass(row.category)}`}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: row.category === "Safe" ? "rgba(0,232,162,.08)"
                            : row.category === "Semi-Critical" ? "rgba(240,220,58,.08)"
                            : row.category === "Critical" ? "rgba(245,166,35,.08)"
                            : "rgba(232,64,64,.08)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: ".03em",
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: row.category === "Safe" ? "#00e8a2"
                              : row.category === "Semi-Critical" ? "#f0dc3a"
                              : row.category === "Critical" ? "#f5a623"
                              : "#e84040",
                          }} />
                          {row.category}
                        </span>
                      </td>
                      {activeColumns.map(col => (
                        <td key={col.key} className="num-cell">
                          {col.key.startsWith("qual") ? (row[col.key] || "-") : fmt(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Status Bar / Pagination ────────────────── */}
          <div className="de-status">
            <span>
              Showing {((page - 1) * ROWS_PER_PAGE) + 1}–{Math.min(page * ROWS_PER_PAGE, filteredRows.length)} of{" "}
              <b style={{ color: "var(--accent)" }}>{filteredRows.length.toLocaleString()}</b> {viewMode === "state" ? "states" : "districts"}
              {stateFilter !== "ALL" && <> · Filtered: <b style={{ color: "var(--text)" }}>{stateFilter}</b></>}
            </span>

            <div className="de-pagination">
              <button className="de-page-btn" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
              <button className="de-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p;
                if (totalPages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
                return (
                  <button
                    key={p}
                    className={`de-page-btn ${p === page ? "active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button className="de-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="de-page-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

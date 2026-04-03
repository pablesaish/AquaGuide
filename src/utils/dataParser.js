export function parseReportData(rawReport) {
  if (!rawReport || !rawReport.GEC) return { districts: [], states: [] };
  const gec = rawReport.GEC;
  const dataRows = gec.slice(8); // skip header rows

  const districts = [];
  const stateAgg = {};

  for (const row of dataRows) {
    if (!row.__EMPTY_1 || row.__EMPTY_1 === "STATE") continue;

    const state = String(row.__EMPTY_1).trim().toUpperCase();
    const district = String(row.__EMPTY_2 || "").trim().toUpperCase();

    // Key columns
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

    const rechargeC = parseFloat(row.__EMPTY_82) || 0;
    const rechargeNC = parseFloat(row.__EMPTY_83) || 0;
    const rechargeTotal = parseFloat(row.__EMPTY_85) || 0;

    const envC = parseFloat(row.__EMPTY_86) || 0;
    const envNC = parseFloat(row.__EMPTY_87) || 0;
    const envTotal = parseFloat(row.__EMPTY_89) || 0;

    const domC = parseFloat(row.__EMPTY_94) || 0;
    const domNC = parseFloat(row.__EMPTY_95) || 0;
    const domTotal = parseFloat(row.__EMPTY_97) || 0;

    const indC = parseFloat(row.__EMPTY_98) || 0;
    const indNC = parseFloat(row.__EMPTY_99) || 0;
    const indTotal = parseFloat(row.__EMPTY_101) || 0;

    const irrC = parseFloat(row.__EMPTY_102) || 0;
    const irrNC = parseFloat(row.__EMPTY_103) || 0;
    const irrTotal = parseFloat(row.__EMPTY_105) || 0;

    const allocC = parseFloat(row.__EMPTY_114) || 0;
    const allocNC = parseFloat(row.__EMPTY_115) || 0;
    const allocTotal = parseFloat(row.__EMPTY_117) || 0;

    const netC = parseFloat(row.__EMPTY_118) || 0;
    const netNC = parseFloat(row.__EMPTY_119) || 0;
    const netTotal = parseFloat(row.__EMPTY_121) || 0;

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

/**
 * Parses summaryData.json structure into the internal format used by DataExplorer and Chatbot.
 */
export function parseSummaryData(data) {
  if (!data || !data.districts) return { districts: [], states: [] };

  const KEY_MAP = {
    // Geo
    "Total Geographical Area (ha) - Recharge Worthy Area (ha) - C": "geoC",
    "Total Geographical Area (ha) - NC": "geoNC",
    "Total Geographical Area (ha) - Total": "geoTotal",
    "Total Geographical Area (ha) - Hilly Area": "hillyArea",
    "Total Geographical Area (ha) - Grand Total": "geoGrandTotal",
    // Recharge
    "Annual Ground water Recharge (ham) - C": "rechargeC",
    "Annual Ground water Recharge (ham) - NC": "rechargeNC",
    "Annual Ground water Recharge (ham) - Total": "rechargeTotal",
    // Env
    "Environmental Flows (ham) - C": "envC",
    "Environmental Flows (ham) - NC": "envNC",
    "Environmental Flows (ham) - Total": "envTotal",
    // Extractable
    "Annual Extractable Ground water Resource (ham) - C": "extractC",
    "Annual Extractable Ground water Resource (ham) - NC": "extractNC",
    "Annual Extractable Ground water Resource (ham) - Total": "extractTotal",
    // Usage
    "Ground Water Extraction for all uses (ha.m) - Domestic - C": "domC",
    "Ground Water Extraction for all uses (ha.m) - Domestic - NC": "domNC",
    "Ground Water Extraction for all uses (ha.m) - Domestic - Total": "domTotal",
    "Ground Water Extraction for all uses (ha.m) - Industrial - C": "indC",
    "Ground Water Extraction for all uses (ha.m) - Industrial - NC": "indNC",
    "Ground Water Extraction for all uses (ha.m) - Industrial - Total": "indTotal",
    "Ground Water Extraction for all uses (ha.m) - Irrigation - C": "irrC",
    "Ground Water Extraction for all uses (ha.m) - Irrigation - NC": "irrNC",
    "Ground Water Extraction for all uses (ha.m) - Irrigation - Total": "irrTotal",
    "Ground Water Extraction for all uses (ha.m) - C": "gwExtractC",
    "Ground Water Extraction for all uses (ha.m) - NC": "gwExtractNC",
    "Ground Water Extraction for all uses (ha.m) - Total": "gwExtractTotal",
    // Stage
    "Stage of Ground Water Extraction (%) - C": "stageC",
    "Stage of Ground Water Extraction (%) - NC": "stageNC",
    "Stage of Ground Water Extraction (%) - Total": "stageTotal",
    // Alloc
    "Allocation of Ground Water Resource for Domestic Utilisation for projected year 2025 (ham) - C": "allocC",
    "Allocation of Ground Water Resource for Domestic Utilisation for projected year 2025 (ham) - NC": "allocNC",
    "Allocation of Ground Water Resource for Domestic Utilisation for projected year 2025 (ham) - Total": "allocTotal",
    // Net
    "Net Annual Ground Water Availability for Future Use (ham) - C": "netC",
    "Net Annual Ground Water Availability for Future Use (ham) - NC": "netNC",
    "Net Annual Ground Water Availability for Future Use (ham) - Total": "netTotal",
    // Quality
    "Quality Tagging - Major Parameter Present - C": "qualMajC",
    "Quality Tagging - NC": "qualMajNC",
  };

  const districts = data.districts.map(d => {
    const row = d.rawData || {};
    const districtRow = {
      state: d.state.toUpperCase(),
      district: d.district.toUpperCase(),
      category: d.category,
      block: d.block,
      extractionPct: d.extractionPct,
      rawData: d.rawData, // keep original rawData for chatbot
    };

    // Map keys to internal format
    for (const [descKey, internalKey] of Object.entries(KEY_MAP)) {
      districtRow[internalKey] = row[descKey] || 0;
    }

    return districtRow;
  });

  const stateAgg = {};
  for (const d of districts) {
    const state = d.state;
    if (!stateAgg[state]) {
      stateAgg[state] = {
        state, district: "", category: "Safe",
        geoC: 0, geoNC: 0, geoTotal: 0, hillyArea: 0, geoGrandTotal: 0,
        rechargeC: 0, rechargeNC: 0, rechargeTotal: 0,
        envC: 0, envNC: 0, envTotal: 0,
        extractC: 0, extractNC: 0, extractTotal: 0,
        domC: 0, domNC: 0, domTotal: 0, indC: 0, indNC: 0, indTotal: 0, irrC: 0, irrNC: 0, irrTotal: 0,
        gwExtractC: 0, gwExtractNC: 0, gwExtractTotal: 0,
        stageC: 0, stageNC: 0, stageTotal: 0,
        allocC: 0, allocNC: 0, allocTotal: 0,
        netC: 0, netNC: 0, netTotal: 0,
        qualMajC: "", qualMajNC: "",
      };
    }
    const s = stateAgg[state];
    const keys = Object.values(KEY_MAP).filter(k => typeof s[k] === 'number');
    for (const k of keys) s[k] += d[k];
  }

  // Recalculate weights for states
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

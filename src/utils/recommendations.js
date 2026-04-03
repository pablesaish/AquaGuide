/* ══════════════════════════════════════════════════════════
   AquaGuide AI – Recommendation Engine
   Generates typed recommendations based on extraction % and category
   ══════════════════════════════════════════════════════════ */

const RECOMMENDATIONS = {
  Safe: {
    level: "safe",
    icon: "✅",
    title: "Sustainable Usage",
    color: "#00a8e8",
    message: "Groundwater extraction is within sustainable limits. Current practices are maintaining healthy aquifer levels.",
    actions: [
      "Continue current extraction practices",
      "Maintain monitoring infrastructure",
      "Promote awareness of sustainable usage"
    ]
  },
  "Semi-Critical": {
    level: "warning",
    icon: "⚠️",
    title: "Monitor Usage",
    color: "#f0dc3a",
    message: "Extraction levels are approaching stress thresholds. Monitoring and preemptive measures are recommended.",
    actions: [
      "Increase monitoring frequency",
      "Reduce non-essential groundwater extraction",
      "Implement rainwater harvesting in key areas",
      "Promote micro-irrigation over flood irrigation"
    ]
  },
  Critical: {
    level: "danger",
    icon: "🔴",
    title: "Reduce Extraction",
    color: "#f5a623",
    message: "Groundwater is under significant stress. Immediate reduction in extraction and active recharge interventions are needed.",
    actions: [
      "Mandate reduction in industrial groundwater usage",
      "Construct recharge wells and check dams",
      "Enforce crop diversification away from water-intensive crops",
      "Implement strict water budgeting at block level"
    ]
  },
  "Over-Exploited": {
    level: "critical",
    icon: "🚨",
    title: "Immediate Conservation Required",
    color: "#e84040",
    message: "Extraction has exceeded natural recharge capacity. Without urgent action, aquifer depletion will accelerate.",
    actions: [
      "URGENT: Ban new borewell permits in affected blocks",
      "Implement managed aquifer recharge (MAR) programs",
      "Shift to alternative water sources (surface water, recycled water)",
      "Deploy community-based water budgeting",
      "Enforce penalties for over-extraction"
    ]
  }
};

/**
 * Get a recommendation based on groundwater category and extraction percentage.
 * @param {string} category - One of: "Safe", "Semi-Critical", "Critical", "Over-Exploited"
 * @param {number} [extractionPct] - Optional extraction percentage for more detailed advice
 * @returns {{ level, icon, title, color, message, actions: string[], extractionNote?: string }}
 */
export function getRecommendation(category, extractionPct) {
  const rec = RECOMMENDATIONS[category] || RECOMMENDATIONS["Safe"];
  const result = { ...rec };

  // Add extraction-specific note if provided
  if (typeof extractionPct === "number") {
    if (extractionPct > 200) {
      result.extractionNote = `Extraction is at ${extractionPct}% — more than double the recharge rate. This zone faces severe long-term depletion risk.`;
    } else if (extractionPct > 150) {
      result.extractionNote = `Extraction is at ${extractionPct}% — significantly exceeding recharge. Aquifer levels are declining rapidly.`;
    } else if (extractionPct > 100) {
      result.extractionNote = `Extraction is at ${extractionPct}% of recharge. The deficit must be addressed through active recharge programs.`;
    } else if (extractionPct > 90) {
      result.extractionNote = `Extraction is at ${extractionPct}% — approaching the tipping point beyond which recovery becomes increasingly difficult.`;
    } else if (extractionPct > 70) {
      result.extractionNote = `Extraction is at ${extractionPct}% of recharge capacity. Proactive measures now can prevent escalation.`;
    } else {
      result.extractionNote = `Extraction is at ${extractionPct}% of recharge — well within safe limits.`;
    }
  }

  return result;
}

/**
 * Get recommendations for the top N most critical states.
 * @param {object} stateStats - The stateStats object from summaryData.json
 * @param {number} [topN=5] - Number of states to return
 * @returns {Array<{ state, category, overCount, totalCount, rec }>}
 */
export function getTopCriticalStates(stateStats, topN = 5) {
  const entries = Object.entries(stateStats).map(([state, stats]) => {
    const overPct = stats.total > 0 ? (stats.over / stats.total) * 100 : 0;
    const critPct = stats.total > 0 ? (stats.critical / stats.total) * 100 : 0;
    const severity = overPct * 2 + critPct; // weighted score

    let primaryCategory = "Safe";
    if (overPct > 30) primaryCategory = "Over-Exploited";
    else if (critPct > 20 || overPct > 15) primaryCategory = "Critical";
    else if (stats.semi > stats.safe) primaryCategory = "Semi-Critical";

    return {
      state,
      category: primaryCategory,
      overCount: stats.over,
      criticalCount: stats.critical,
      totalCount: stats.total,
      severity,
      rec: getRecommendation(primaryCategory, Math.round(overPct + critPct))
    };
  });

  return entries
    .sort((a, b) => b.severity - a.severity)
    .slice(0, topN);
}

export default RECOMMENDATIONS;

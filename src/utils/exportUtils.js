/* ══════════════════════════════════════════════════════════
   AquaGuide AI – Export Utilities (CSV / Excel / PDF)
   ══════════════════════════════════════════════════════════ */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

/* ─── CSV Export ─────────────────────────────────────── */

/**
 * Export an array of objects to CSV and trigger download.
 * @param {Array<object>} data - Array of flat objects
 * @param {string} [filename="aquaguide_export.csv"]
 */
export function exportToCSV(data, filename = "aquaguide_export.csv") {
  if (!data || data.length === 0) return alert("No data to export.");

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => {
        let val = row[h] ?? "";
        // Escape commas and quotes
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(",")
    )
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}


/* ─── Excel Export ───────────────────────────────────── */

/**
 * Export an array of objects to XLSX and trigger download.
 * @param {Array<object>} data - Array of flat objects
 * @param {string} [filename="aquaguide_export.xlsx"]
 * @param {string} [sheetName="AquaGuide Data"]
 */
export function exportToExcel(data, filename = "aquaguide_export.xlsx", sheetName = "AquaGuide Data") {
  if (!data || data.length === 0) return alert("No data to export.");

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Auto-fit column widths
  const maxWidths = {};
  const headers = Object.keys(data[0]);
  headers.forEach(h => {
    maxWidths[h] = Math.max(h.length, ...data.map(row => String(row[h] ?? "").length));
  });
  ws["!cols"] = headers.map(h => ({ wch: Math.min(maxWidths[h] + 2, 40) }));

  XLSX.writeFile(wb, filename);
}


/* ─── PDF Export ─────────────────────────────────────── */

/**
 * Export an array of objects to a formatted PDF and trigger download.
 * @param {Array<object>} data - Array of flat objects
 * @param {string} [title="AquaGuide AI Report"]
 * @param {string} [filename="aquaguide_report.pdf"]
 */
export function exportToPDF(data, title = "AquaGuide AI Report", filename = "aquaguide_report.pdf") {
  if (!data || data.length === 0) return alert("No data to export.");

  const doc = new jsPDF({ orientation: "landscape" });

  // Header
  doc.setFillColor(3, 13, 20); // --bg
  doc.rect(0, 0, doc.internal.pageSize.width, 28, "F");
  doc.setTextColor(0, 168, 232); // --accent
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("AquaGuide AI", 14, 12);
  doc.setFontSize(9);
  doc.setTextColor(90, 122, 158); // --muted
  doc.text("India Groundwater Intelligence · CGWB FY 2024-25", 14, 19);
  doc.setTextColor(221, 232, 240);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, doc.internal.pageSize.width - 14, 12, { align: "right" });

  // Title
  doc.setTextColor(0, 168, 232);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 38);

  // Table
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => String(row[h] ?? "")));

  doc.autoTable({
    startY: 44,
    head: [headers],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [200, 210, 220],
      fillColor: [6, 20, 40],
      lineColor: [22, 48, 84],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [0, 120, 212],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [10, 24, 48],
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(90, 122, 158);
    doc.text(
      `Page ${i} of ${pageCount} · AquaGuide AI · Source: CGWB FY 2024-25`,
      doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8,
      { align: "center" }
    );
  }

  doc.save(filename);
}


/* ─── Chat Export ────────────────────────────────────── */

/**
 * Export chat messages to a structured format.
 * Extracts text content and chart data from AI messages.
 * @param {Array<{role: string, text: string}>} messages
 * @returns {Array<object>} Flat data suitable for CSV/Excel/PDF
 */
export function chatToExportData(messages) {
  return messages
    .filter(m => m.text)
    .map((m, i) => {
      // Strip chart JSON blocks from text
      const cleanText = m.text
        .replace(/```chart[\s\S]*?```/g, "[Chart Data]")
        .trim();

      return {
        "#": i + 1,
        Role: m.role === "ai" ? "AquaGuide AI" : "User",
        Message: cleanText.slice(0, 2000), // cap for Excel cell limits
        Timestamp: m.ts ? new Date(m.ts).toLocaleString("en-IN") : "",
      };
    });
}


/**
 * Extract chart data from a message's text and return as exportable rows.
 * @param {string} text - The AI message text
 * @returns {Array<object>|null} Chart data as rows, or null if no chart found
 */
export function extractChartData(text) {
  const chartMatch = text.match(/```chart\s*([\s\S]*?)```/);
  if (!chartMatch) return null;

  try {
    const config = JSON.parse(chartMatch[1]);
    return config.labels.map((label, i) => ({
      Label: label,
      Value: config.data[i],
      ChartType: config.type,
      ChartTitle: config.title || "",
    }));
  } catch {
    return null;
  }
}


/* ─── Helper ─────────────────────────────────────────── */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

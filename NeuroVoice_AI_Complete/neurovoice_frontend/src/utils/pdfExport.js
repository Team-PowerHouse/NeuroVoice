// ============================================================
// pdfExport.js
// Generates a printable, hospital-ready PDF of a child's
// Communication Passport using jsPDF (no external HTML render needed).
// ============================================================

import jsPDF from "jspdf";

const BLUE = [46, 111, 242];
const BLUE_DARK = [30, 84, 201];
const SLATE = [27, 39, 66];
const SLATE_MUTED = [100, 116, 139];
const AMBER = [245, 158, 11];
const CORAL = [244, 101, 74];
const TEAL = [15, 174, 156];
const LINE = [226, 232, 240];

function addHeader(doc, child) {
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("NeuroVoice AI — Communication Passport", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Confidential clinical reference document", 14, 21);

  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 27);

  return 40;
}

function sectionTitle(doc, text, y) {
  doc.setTextColor(...SLATE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text(text, 14, y);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2, 196, y + 2);
  return y + 9;
}

function checkPageBreak(doc, y, needed = 20) {
  if (y + needed > 285) {
    doc.addPage();
    return 18;
  }
  return y;
}

export function exportPassportToPDF(passport) {
  const { child, dictionary, recommendedResponses, whatToAvoid, triggersByNeed, emergencyNotes, medicalAlerts, comfortItems, customTriggers, accuracy } = passport;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = addHeader(doc, child);

  // Child info block
  doc.setFillColor(246, 249, 255);
  doc.roundedRect(14, y, 182, 26, 2, 2, "F");
  doc.setTextColor(...SLATE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(child.name, 19, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_MUTED);
  doc.text(`${child.age} years old  ·  ${child.gender}  ·  Caregiver: ${child.caregiver}`, 19, y + 15.5);
  doc.text(`${child.supportLevel}`, 19, y + 21);
  if (accuracy !== null && accuracy !== undefined) {
    doc.setTextColor(...TEAL);
    doc.setFont("helvetica", "bold");
    doc.text(`AI Prediction Accuracy: ${accuracy}%`, 140, y + 9);
  }
  y += 34;

  // Emergency Notes
  if (emergencyNotes) {
    y = checkPageBreak(doc, y, 30);
    doc.setFillColor(255, 247, 237);
    const lines = doc.splitTextToSize(emergencyNotes, 172);
    const boxH = 12 + lines.length * 5;
    doc.roundedRect(14, y, 182, boxH, 2, 2, "F");
    doc.setTextColor(...AMBER);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("⚠ EMERGENCY NOTES", 19, y + 7);
    doc.setTextColor(80, 60, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(lines, 19, y + 13);
    y += boxH + 8;
  }

  // Medical Alerts
  if (medicalAlerts) {
    y = checkPageBreak(doc, y, 24);
    doc.setFillColor(253, 233, 228);
    const lines = doc.splitTextToSize(medicalAlerts, 172);
    const boxH = 11 + lines.length * 5;
    doc.roundedRect(14, y, 182, boxH, 2, 2, "F");
    doc.setTextColor(...CORAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("MEDICAL ALERTS", 19, y + 7);
    doc.setTextColor(90, 30, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(lines, 19, y + 13);
    y += boxH + 8;
  }

  // Comfort items
  if (comfortItems) {
    y = checkPageBreak(doc, y, 20);
    doc.setTextColor(...SLATE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Comfort Items & Preferences", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_MUTED);
    const lines = doc.splitTextToSize(comfortItems, 182);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 6;
  }

  // Behavioral Dictionary
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, "Behavioral Dictionary", y);
  if (dictionary.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text("No behavior patterns recorded yet.", 14, y);
    y += 8;
  } else {
    dictionary.slice(0, 12).forEach((entry) => {
      y = checkPageBreak(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...SLATE);
      doc.text(`${entry.behaviorLabel}`, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_MUTED);
      doc.text(`→ ${entry.need}`, 78, y);
      doc.setTextColor(...BLUE_DARK);
      doc.setFont("helvetica", "bold");
      doc.text(`${entry.avgConfidenceScore}% confidence`, 155, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_MUTED);
      doc.setFontSize(8.5);
      doc.text(`${entry.sampleCount} sample(s) observed`, 14, y + 4.2);
      doc.setFontSize(9.5);
      y += 10;
    });
  }

  // Recommended Responses
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, "Recommended Responses", y);
  recommendedResponses.forEach(({ need, response }) => {
    y = checkPageBreak(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEAL);
    doc.text(`✓ ${need}`, 14, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_MUTED);
    const lines = doc.splitTextToSize(response, 178);
    doc.text(lines, 14, y);
    y += lines.length * 4.4 + 4;
  });

  // What To Avoid
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, "What To Avoid", y);
  whatToAvoid.forEach(({ need, avoid }) => {
    y = checkPageBreak(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...CORAL);
    doc.text(`✕ ${need}`, 14, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_MUTED);
    const lines = doc.splitTextToSize(avoid, 178);
    doc.text(lines, 14, y);
    y += lines.length * 4.4 + 4;
  });

  // Known Triggers
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, "Known Triggers", y);
  const allTriggers = [
    ...(customTriggers || []),
    ...triggersByNeed.flatMap((t) => t.triggers)
  ];
  if (allTriggers.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text("No known triggers recorded yet.", 14, y);
    y += 8;
  } else {
    [...new Set(allTriggers)].forEach((trigger) => {
      y = checkPageBreak(doc, y, 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...SLATE);
      doc.text(`•  ${trigger}`, 14, y);
      y += 5.5;
    });
  }

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Generated by NeuroVoice AI — Personalized Behavioral Communication Translator",
      14,
      292
    );
    doc.text(`Page ${i} of ${pageCount}`, 186, 292);
  }

  doc.save(`NeuroVoice_Passport_${child.name.replace(/\s+/g, "_")}.pdf`);
}

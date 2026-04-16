"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { registerGeistFont } from "./fonts/geist-pdf";

// Context types for strategic report generation
export type REPORT_CONTEXT = 'SURVEILLANCE_DISEASE' | 'SURVEILLANCE_ILLNESS' | 'PATTERNS_CLUSTERING' | 'ALERT_ANOMALIES';

export interface PdfColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PdfImage {
  dataUrl: string;
  width: number;
  height: number;
  title?: string;
}

export interface StrategicReportOptions {
  context?: REPORT_CONTEXT;
  data: Record<string, unknown>[];
  columns?: PdfColumn[];
  title: string;
  subtitle?: string;
  filename?: string;
  generatedBy?: { name: string; email?: string };
  images?: PdfImage[];
  reportingPeriod?: string;
}

// Color constants (Matching globals.css)
const PRIMARY_COLOR: [number, number, number] = [34, 197, 94]; // #22c55e - Primary Green
const SECONDARY_COLOR: [number, number, number] = [126, 200, 200]; // #7ec8c8 - Secondary Teal
const SUCCESS_COLOR: [number, number, number] = [34, 197, 94]; // #22c55e - Success Green
const BG_COLOR: [number, number, number] = [248, 248, 245]; // #f8f8f5 - Base-100
const TEXT_COLOR: [number, number, number] = [74, 74, 70]; // #4a4a46 - Base-Content
const MUTED_COLOR: [number, number, number] = [138, 138, 132]; // #8a8a84 - Muted
const WHITE: [number, number, number] = [255, 255, 255];

// Protocol lookup dictionaries
const DISEASE_PROTOCOLS: Record<string, { action: string; details: string[] }> = {
  'Dengue': {
    action: 'Vector Control (Search & Destroy)',
    details: ['Fogging operations in affected areas', 'Breeding site elimination campaigns', 'Larvicide distribution', 'Community health worker surveillance']
  },
  'Typhoid': {
    action: 'Water Safety Initiative',
    details: ['Water testing in affected districts', 'Chlorine tablet distribution', 'Sanitation improvements', 'Hygiene education campaigns']
  },
  'Diarrhea': {
    action: 'Hygiene Kit Distribution',
    details: ['Oral rehydration solution distribution', 'Water purification tablets', 'Soap and sanitizer kits', 'Sanitation inspections']
  },
  'Measles': {
    action: 'Vaccination Drive',
    details: ['Mass vaccination campaigns', 'Contact tracing', 'Quarantine measures', 'Vitamin A supplementation']
  },
  'Influenza': {
    action: 'Respiratory Hygiene Campaign',
    details: ['Mask distribution', 'Hand washing stations', 'Sick leave policies', 'Antiviral medication access']
  },
  'Pneumonia': {
    action: 'Respiratory Health Initiative',
    details: ['Antibiotic stewardship', 'Vaccination programs', 'Oxygen therapy access', 'Healthcare worker training']
  }
};

// Unified report header function
function drawReportHeader(doc: jsPDF, context: REPORT_CONTEXT, generatedBy?: { name: string; email?: string }, reportingPeriod: string = "September 2025 – April 2026") {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Background Accent Bar (Top)
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 25, "F");

  // System Name in Header
  doc.setFontSize(10);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...WHITE);
  doc.text("CDSRS | Clinical Disease Surveillance & Reporting System", 14, 15);

  // Status Badge
  const badgeText = "OFFICIAL REPORT";
  const badgeWidth = doc.getTextWidth(badgeText) + 10;
  doc.setFillColor(...SUCCESS_COLOR);
  doc.roundedRect(pageWidth - 14 - badgeWidth, 10, badgeWidth, 8, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(badgeText, pageWidth - 14 - (badgeWidth / 2), 15.5, { align: "center" });

  // Main Title
  doc.setFontSize(22);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...TEXT_COLOR);
  doc.text("Strategic Action Plan", 14, 45);

  // Subtitle/Context
  doc.setFontSize(12);
  doc.setFont("GeistSans", "normal");
  doc.setTextColor(...MUTED_COLOR);
  const contextLabel = context.replace(/_/g, " ").toLowerCase();
  doc.text(`Analysis Context: ${contextLabel.charAt(0).toUpperCase() + contextLabel.slice(1)}`, 14, 55);

  // Horizontal Rule
  doc.setDrawColor(...SECONDARY_COLOR);
  doc.setLineWidth(0.5);
  doc.line(14, 62, pageWidth - 14, 62);

  // Audit Trail & Metadata (Two columns)
  let currentY = 72;
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_COLOR);

  // Left Column: Generation Info
  const generatedDate = format(new Date(), "MMMM dd, yyyy 'at' h:mm a");
  doc.setFont("GeistSans", "bold");
  doc.text("Generation Audit:", 14, currentY);
  doc.setFont("GeistSans", "normal");
  currentY += 5;
  if (generatedBy) {
    doc.text(`Issuer: ${generatedBy.name}`, 14, currentY);
    currentY += 5;
    doc.text(`Contact: ${generatedBy.email || 'N/A'}`, 14, currentY);
    currentY += 5;
  }
  doc.text(`Timestamp: ${generatedDate}`, 14, currentY);

  // Right Column: Facility Info
  const rightColumnX = pageWidth / 2 + 10;
  let rightY = 72;
  doc.setFont("GeistSans", "bold");
  doc.text("Facility & Period:", rightColumnX, rightY);
  doc.setFont("GeistSans", "normal");
  rightY += 5;
  doc.text("Barangay Bagong Silangan Health Center", rightColumnX, rightY);
  rightY += 5;
  doc.text(`Period: ${reportingPeriod}`, rightColumnX, rightY);
  rightY += 5;
  doc.text(`Export ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, rightColumnX, rightY);

  currentY = Math.max(currentY, rightY) + 10;
  return currentY;
}

function drawSummaryMetrics(doc: jsPDF, context: REPORT_CONTEXT, data: Record<string, unknown>[], startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = (pageWidth - 28 - 10) / 3;
  const cardHeight = 25;
  const padding = 14;

  const totalCases = data.reduce((sum, item) => sum + (Number(item.count || item.cases) || 1), 0);
  let targetArea = getTargetArea(data);
  // Strip "Barangay " or "Brgy " from the start to save space
  targetArea = targetArea.replace(/^(Barangay\s+|Brgy\.?\s+)/i, '');
  const severity = context === 'ALERT_ANOMALIES' ? 'Critical' : 'Elevated';

  const metrics = [
    { label: "TOTAL CASES", value: totalCases.toString(), color: PRIMARY_COLOR },
    { label: "PRIORITY ZONE", value: targetArea.length > 15 ? targetArea.substring(0, 15) + "..." : targetArea, color: SECONDARY_COLOR },
    { label: "RISK LEVEL", value: severity, color: SUCCESS_COLOR }
  ];

  metrics.forEach((metric, i) => {
    const x = padding + (i * (cardWidth + 5));
    
    // Card Background
    doc.setFillColor(...BG_COLOR);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, "F");
    
    // Left Accent Border
    doc.setFillColor(...metric.color);
    doc.rect(x, startY, 2, cardHeight, "F");
    
    // Label
    doc.setFontSize(7);
    doc.setFont("GeistSans", "bold");
    doc.setTextColor(...MUTED_COLOR);
    doc.text(metric.label, x + 6, startY + 8);
    
    // Value
    doc.setFontSize(12);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(metric.value, x + 6, startY + 18);
  });

  return startY + cardHeight + 15;
}

const PATTERN_PROTOCOLS: Record<string, { action: string; details: string[] }> = {
  'Age Group': {
    action: 'Demographic Outreach',
    details: ['Community health assemblies targeting specific age groups', 'Age-appropriate health education materials', 'School-based health programs', 'Elderly care coordination']
  },
  'Gender': {
    action: 'Gender-Specific Interventions',
    details: ['Women-focused health campaigns', 'Men\'s health awareness programs', 'Gender-sensitive healthcare delivery', 'Family planning support']
  },
  'District': {
    action: 'Localized Action Plan',
    details: ['District-specific health assemblies', 'Local barangay coordination', 'Targeted resource allocation', 'Community leader engagement']
  }
};

const ALERT_PROTOCOLS = {
  action: 'Emergency Response Activation',
  details: ['Immediate ESU deployment for field validation', 'Rapid assessment of environmental factors', 'Enhanced surveillance implementation', 'Laboratory testing protocols', 'Contingency planning for escalation']
};

function formatPdfCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (value instanceof Date) {
    return format(value, "MMM d, yyyy");
  }

  if (typeof value === "object" && "toString" in value) {
    return value.toString();
  }

  return String(value);
}

function renderGenericPdfReport(
  doc: jsPDF,
  {
    data,
    columns,
    title,
    subtitle,
    filename,
    generatedBy,
    images,
    reportingPeriod = "September 2025 – April 2026",
  }: StrategicReportOptions,
) {
  if (!columns || columns.length === 0) {
    throw new Error("Columns are required for generic PDF export");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background Accent Bar (Top)
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 20, "F");

  doc.setFontSize(10);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...WHITE);
  doc.text("CDSRS | Clinical Disease Surveillance & Reporting System", 14, 12);

  let currentY = 35;
  doc.setFontSize(18);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, 14, currentY);
  currentY += 8;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("GeistSans", "normal");
    doc.setTextColor(...MUTED_COLOR);
    const subtitleLines = doc.splitTextToSize(subtitle, pageWidth - 28);
    doc.text(subtitleLines, 14, currentY);
    currentY += (subtitleLines.length * 5) + 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(...TEXT_COLOR);
  const generatedDate = format(new Date(), "MMMM dd, yyyy 'at' h:mm a");
  if (generatedBy) {
    doc.text(`Generated by: ${generatedBy.name} (${generatedBy.email || 'N/A'})`, 14, currentY);
    currentY += 5;
  }
  doc.text(`Generated on: ${generatedDate}`, 14, currentY);
  currentY += 5;
  doc.text("Facility: Barangay Bagong Silangan Health Center", 14, currentY);
  currentY += 5;
  doc.text(`Reporting Period: ${reportingPeriod}`, 14, currentY);
  currentY += 10;

  if (images && images.length > 0) {
    for (const image of images) {
      if (image.title) {
        doc.setFontSize(12);
        doc.setFont("GeistSans", "bold");
        doc.setTextColor(...TEXT_COLOR);
        doc.text(image.title, 14, currentY);
        currentY += 6;
      }

      const maxWidth = pageWidth - 28;
      const maxHeight = pageHeight - currentY - 30;
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const imgWidth = image.width * scale;
      const imgHeight = image.height * scale;
      const imgX = Math.max(14, (pageWidth - imgWidth) / 2);

      doc.addImage(image.dataUrl, 'PNG', imgX, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 15;
    }
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(...SECONDARY_COLOR);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 10;

  doc.setFontSize(14);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...TEXT_COLOR);
  doc.text("Report Data", 14, currentY);
  currentY += 8;

  const tableData = data.map((row) =>
    columns.map((col) => formatPdfCellValue(row[col.dataKey]))
  );

  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: tableData,
    startY: currentY,
    headStyles: {
      font: "GeistSans",
      fontStyle: "bold",
      fillColor: PRIMARY_COLOR,
      textColor: WHITE,
      fontSize: 9,
      halign: "left",
    },
    bodyStyles: {
      font: "GeistSans",
      fontSize: 8,
      textColor: TEXT_COLOR,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: BG_COLOR,
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      if (col.width) {
        acc[idx] = { cellWidth: col.width };
      }
      return acc;
    }, {} as Record<number, { cellWidth?: number }>),
    margin: { left: 14, right: 14 },
    theme: "striped",
    styles: {
      font: "GeistSans",
      lineColor: SECONDARY_COLOR,
      lineWidth: 0.1,
    },
    rowPageBreak: 'avoid',
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  const base = filename || title.toLowerCase().replace(/\s+/g, "-");
  const safeFilename = base.endsWith(".pdf") ? base : `${base}.pdf`;
  doc.save(safeFilename);
}

// District fallback logic
function getTargetArea(data: Record<string, unknown>[]): string {
  const districts = data
    .map(item => String(item.district || ''))
    .filter(d => d && d !== 'Unknown' && d !== '');

  if (districts.length > 0) {
    // Most frequent district
    const freq: Record<string, number> = {};
    districts.forEach(d => freq[d] = (freq[d] || 0) + 1);
    const mostFrequent = Object.entries(freq).sort(([,a], [,b]) => b - a)[0]?.[0];
    return mostFrequent || 'Barangay Proper (High-Priority Zone)';
  }

  // Fallback to most frequent street or default
  const streets = data
    .map(item => String(item.street || item.address || ''))
    .filter(s => s && s !== '');

  if (streets.length > 0) {
    const freq: Record<string, number> = {};
    streets.forEach(s => freq[s] = (freq[s] || 0) + 1);
    const mostFrequent = Object.entries(freq).sort(([,a], [,b]) => b - a)[0]?.[0];
    return mostFrequent || 'Barangay Proper (High-Priority Zone)';
  }

  return 'Barangay Proper (High-Priority Zone)';
}

// Generate Executive Summary
function generateExecutiveSummary(context: REPORT_CONTEXT, data: Record<string, unknown>[]): string {
  const totalCases = data.reduce((sum, item) => sum + (Number(item.count) || 1), 0);

  if (totalCases === 0) {
    return "Status Stable: All health indicators are within normal thresholds. Standard monitoring continues.";
  }

  const targetArea = getTargetArea(data);

  switch (context) {
    case 'SURVEILLANCE_DISEASE':
      const diseases = [...new Set(data.map(item => String(item.disease || 'Unknown')).filter(d => d !== 'Unknown'))];
      // Find hotspot district
      const districtCounts: Record<string, number> = {};
      data.forEach(item => {
        const district = String(item.district || 'Unknown');
        if (district !== 'Unknown') {
          districtCounts[district] = (districtCounts[district] || 0) + (Number(item.count) || 1);
        }
      });
      const hotspot = Object.entries(districtCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || targetArea;
      return `${totalCases} cases of ${diseases.join(', ')} detected with hotspot in ${hotspot}. Public health intervention required.`;

    case 'SURVEILLANCE_ILLNESS':
      return `Symptom cluster identified in ${targetArea} affecting ${totalCases} individuals. Hygiene and sanitation protocols activated.`;

    case 'PATTERNS_CLUSTERING':
      // Find largest cluster
      const clusters: Record<string, number> = {};
      data.forEach(item => {
        const cluster = String(item.cluster || '0');
        clusters[cluster] = (clusters[cluster] || 0) + 1;
      });
      const largestCluster = Object.entries(clusters).sort(([,a], [,b]) => b - a)[0];
      const clusterSize = largestCluster ? largestCluster[1] : totalCases;
      // Determine demographics
      const ageGroups = [...new Set(data.map(item => String(item.age || item.ageGroup || '').trim()).filter(a => a))];
      const dominantAge = ageGroups[0] || 'general population';
      return `An unusual concentration of ${clusterSize} cases detected in ${dominantAge} within ${targetArea}. Demographic targeting recommended.`;

    case 'ALERT_ANOMALIES':
      const totalAnomalies = data.length;
      return `${totalAnomalies} anomalies of varying severity detected in ${targetArea}. Immediate investigation recommended.`;

    default:
      return `Health indicator alert in ${targetArea}. Coordinated response required.`;
  }
}

// Generate Action Plan Table Data
function generateActionPlanTable(context: REPORT_CONTEXT, data: Record<string, unknown>[]): { head: string[]; body: string[][] } {
  switch (context) {
    case 'SURVEILLANCE_DISEASE':
      const disease = data[0]?.disease ? String(data[0].disease) : 'Unknown';
      const diseaseProtocol = DISEASE_PROTOCOLS[disease] || DISEASE_PROTOCOLS['Dengue'];
      const targetArea = getTargetArea(data);
      return {
        head: ['Priority', 'Target Area', 'Required Intervention', 'Resource Estimate', 'Timeline'],
        body: diseaseProtocol.details.map((detail, index) => [
          index < 2 ? 'High' : 'Medium',
          targetArea,
          detail,
          disease === 'Dengue' ? 'Fogging equipment, Larvicide supplies' : 'Testing kits, Treatment supplies',
          index < 2 ? 'Immediate (24-48 hours)' : 'Ongoing (1-2 weeks)'
        ])
      };

    case 'SURVEILLANCE_ILLNESS':
      const illnessTarget = getTargetArea(data);
      return {
        head: ['Priority', 'Target Area', 'Required Intervention', 'Resource Estimate', 'Timeline'],
        body: [
          ['High', illnessTarget, 'Hygiene Kit Distribution', 'Soap, sanitizer, water purification tablets', 'Immediate (24 hours)'],
          ['High', illnessTarget, 'Community Education Campaigns', 'Flyers, community meetings', 'Ongoing (1 week)'],
          ['Medium', 'Barangay Health Center', 'Symptom Monitoring Training', 'Training materials, staff time', 'Within 3 days'],
          ['Medium', 'Affected Households', 'Follow-up Home Visits', 'Community health workers', 'Ongoing (2 weeks)']
        ]
      };

    case 'PATTERNS_CLUSTERING':
      // Analyze demographics from data
      const ageGroups: Record<string, number> = {};
      const genders: Record<string, number> = {};
      const districts: Record<string, number> = {};

      data.forEach(item => {
        const age = String(item.age || item.ageGroup || '').trim();
        if (age) ageGroups[age] = (ageGroups[age] || 0) + 1;

        const gender = String(item.gender || '').trim();
        if (gender) genders[gender] = (genders[gender] || 0) + 1;

        const district = String(item.district || '').trim();
        if (district && district !== 'Unknown') districts[district] = (districts[district] || 0) + 1;
      });

      // Human-readable demographic descriptions
      const getDemographicDescription = () => {
        const dominantAgeEntry = Object.entries(ageGroups).sort(([,a], [,b]) => b - a)[0];
        const dominantGenderEntry = Object.entries(genders).sort(([,a], [,b]) => b - a)[0];

        if (dominantAgeEntry && (dominantAgeEntry[0].includes('60') || dominantAgeEntry[0].includes('elderly'))) {
          return 'Elderly residents (60+ years)';
        } else if (dominantAgeEntry && (dominantAgeEntry[0].includes('child') || dominantAgeEntry[0].includes('<5'))) {
          return 'Children under 5 years';
        } else if (dominantGenderEntry && dominantGenderEntry[0].toLowerCase() === 'female') {
          return 'Women and female residents';
        } else if (dominantGenderEntry && dominantGenderEntry[0].toLowerCase() === 'male') {
          return 'Men and male residents';
        } else {
          return 'Vulnerable sub-populations identified in cluster analysis';
        }
      };

      const demographicDesc = getDemographicDescription();
      const dominantDistrict = Object.entries(districts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Barangay-wide';

      // Find largest cluster size
      const clusters: Record<string, number> = {};
      data.forEach(item => {
        const cluster = String(item.cluster || '0');
        clusters[cluster] = (clusters[cluster] || 0) + 1;
      });
      const largestClusterSize = Math.max(...Object.values(clusters));

      return {
        head: ['Priority', 'Target Area', 'Required Intervention', 'Resource Estimate', 'Timeline'],
        body: [
          ['High', `${dominantDistrict} - ${demographicDesc}`, 'Community Health Assemblies', 'Meeting venue, community leaders, health educators', 'Within 3 days'],
          ['High', `${dominantDistrict} neighborhoods`, 'Targeted Awareness Campaigns', 'Flyers, posters, local media', 'Ongoing (1 week)'],
          ['Medium', `${demographicDesc}`, 'Demographic-Specific Education', 'Age/gender-appropriate materials, translators if needed', 'Within 1 week'],
          ['Medium', 'Barangay Health Center', 'Enhanced Screening Programs', 'Additional staff, rapid tests', 'Ongoing (2 weeks)']
        ]
      };

    case 'ALERT_ANOMALIES':
      const alertTarget = getTargetArea(data);
      const highSeverityCount = data.filter(item => String(item.severity).toLowerCase() === 'critical' || String(item.severity).toLowerCase() === 'high').length;
      return {
        head: ['Priority', 'Target Area', 'Required Intervention', 'Resource Estimate', 'Timeline'],
        body: [
          ['Critical', alertTarget, 'Immediate ESU Deployment', 'Emergency response team, field equipment', 'Within 2 hours'],
          ['High', alertTarget, 'Field Validation and Testing', 'Rapid diagnostic kits, mobile lab', 'Within 24 hours'],
          ['High', `${alertTarget} perimeter`, 'Quarantine Establishment', 'Barriers, signage, monitoring personnel', 'Within 12 hours'],
          ['Medium', 'Barangay-wide', 'Public Communication Campaign', 'Alerts, hotlines, information materials', 'Ongoing immediately']
        ]
      };

    default:
      return {
        head: ['Priority', 'Target Area', 'Required Intervention', 'Resource Estimate', 'Timeline'],
        body: [
          ['High', 'Barangay-wide', 'Health Assessment', 'Survey tools, staff time', 'Within 24 hours'],
          ['Medium', 'Affected Areas', 'Intervention Planning', 'Expert consultation, planning meetings', 'Within 3 days'],
          ['Low', 'General Population', 'Monitoring Continuation', 'Routine surveillance systems', 'Ongoing']
        ]
      };
  }
}

// Main report generation function
export function generatePDF({
  context,
  data,
  columns,
  title,
  subtitle,
  filename,
  generatedBy,
  images,
  reportingPeriod = "September 2025 – April 2026",
}: StrategicReportOptions) {
  if (!context) {
    const doc = new jsPDF();
    registerGeistFont(doc);
    doc.setFont("GeistSans", "normal");
    renderGenericPdfReport(doc, {
      context,
      data,
      columns,
      title,
      subtitle,
      filename,
      generatedBy,
      images,
      reportingPeriod,
    });
    return;
  }

  const doc = new jsPDF();
  registerGeistFont(doc);
  doc.setFont("GeistSans", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header
  let currentY = drawReportHeader(doc, context, generatedBy, reportingPeriod);

  // 2. Summary Metrics
  currentY = drawSummaryMetrics(doc, context, data, currentY);

  // 3. Executive Summary
  doc.setFontSize(14);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...TEXT_COLOR);
  doc.text("Executive Summary", 14, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("GeistSans", "normal");
  doc.setTextColor(...TEXT_COLOR);
  const summary = generateExecutiveSummary(context, data);
  const summaryLines = doc.splitTextToSize(summary, pageWidth - 28);
  
  // Summary background box
  doc.setFillColor(...BG_COLOR);
  const summaryBoxHeight = (summaryLines.length * 5) + 10;
  doc.roundedRect(14, currentY, pageWidth - 28, summaryBoxHeight, 1, 1, "F");
  
  doc.text(summaryLines, 19, currentY + 7);
  currentY += summaryBoxHeight + 15;

  // 4. Images if provided
  if (images && images.length > 0) {
    for (const image of images) {
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
      }

      if (image.title) {
        doc.setFontSize(12);
        doc.setFont("GeistSans", "bold");
        doc.setTextColor(...TEXT_COLOR);
        doc.text(image.title, 14, currentY);
        currentY += 6;
      }

      const maxWidth = pageWidth - 28;
      const maxHeight = pageHeight - currentY - 30;
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const imgWidth = image.width * scale;
      const imgHeight = image.height * scale;

      const imgX = Math.max(14, (pageWidth - imgWidth) / 2);
      doc.addImage(image.dataUrl, 'PNG', imgX, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 15;
    }
  }

  // 5. Strategic Action Plan Table
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...TEXT_COLOR);
  doc.text("Strategic Action Plan", 14, currentY);
  currentY += 8;

  const actionTable = generateActionPlanTable(context, data);

  autoTable(doc, {
    head: [actionTable.head],
    body: actionTable.body,
    startY: currentY,
    headStyles: {
      font: "GeistSans",
      fontStyle: "bold",
      fillColor: PRIMARY_COLOR,
      textColor: WHITE,
      fontSize: 9,
      halign: "left",
      cellPadding: 4,
    },
    bodyStyles: {
      font: "GeistSans",
      fontSize: 8,
      textColor: TEXT_COLOR,
      halign: "left",
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: BG_COLOR,
    },
    margin: { left: 14, right: 14 },
    theme: "striped",
    styles: {
      font: "GeistSans",
      lineColor: SECONDARY_COLOR,
      lineWidth: 0.1,
    },
    rowPageBreak: 'avoid',
  });

  currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 50;
  currentY += 25;

  // 6. Sign-off and Approval Section
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = 25;
  }

  doc.setDrawColor(...SECONDARY_COLOR);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont("GeistSans", "bold");
  doc.setTextColor(...TEXT_COLOR);
  doc.text("Verification & Sign-off", 14, currentY);
  currentY += 12;

  // Helper to draw a professional signature field
  const drawSignatureField = (x: number, y: number, width: number, label: string, title: string) => {
    // Background box - white background
    doc.setFillColor(...WHITE);
    doc.roundedRect(x, y, width, 35, 2, 2, "F");

    // 1. Draw the actual signature line (Solid vector line)
    doc.setDrawColor(...SECONDARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(x, y + 10, x + width, y + 10);
    
    // 2. Main Label (Person's Role) - Bold
    doc.setFontSize(9);
    doc.setFont("GeistSans", "bold");
    doc.setTextColor(...TEXT_COLOR);
    doc.text(label, x, y + 16);

    // 4. Secondary Label (Facility/Title) - Muted
    doc.setFontSize(7);
    doc.setFont("GeistSans", "normal");
    doc.setTextColor(...MUTED_COLOR);
    doc.text(title, x, y + 21);

    // 5. Date Line
    const dateLabel = "Date:";
    const dateLabelWidth = doc.getTextWidth(dateLabel);
    doc.setTextColor(...TEXT_COLOR);
    doc.setFontSize(8);
    doc.text(dateLabel, x, y + 28);
    doc.setDrawColor(...SECONDARY_COLOR);
    doc.line(x + dateLabelWidth + 2, y + 28.5, x + width, y + 28.5);
  };

  const fieldWidth = (pageWidth - 28 - 20) / 2;
  
  // Signature 1: Health Officer
  drawSignatureField(14, currentY + 5, fieldWidth, "Barangay Health Officer", "Bagong Silangan Health Center");

  // Signature 2: Local Leadership
  drawSignatureField(14 + fieldWidth + 20, currentY + 5, fieldWidth, "Barangay Captain / LGU Lead", "Local Government Unit (LGU)");

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(...MUTED_COLOR);
  const disclaimer = "This document is an automatically generated strategic health report based on Clinical Disease Surveillance System (CDSRS) data. It is intended for public health intervention planning and should be reviewed by qualified medical personnel.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 28);
  doc.text(disclaimerLines, 14, pageHeight - 20);

  // Page numbering
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  const base = filename || title.toLowerCase().replace(/\s+/g, "-");
  const safeFilename = base.endsWith(".pdf") ? base : `${base}.pdf`;
  doc.save(safeFilename);
}

// Backward compatibility
export const exportToPDF = generatePDF;
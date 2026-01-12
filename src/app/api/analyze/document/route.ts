/**
 * Dokumenten-Barrierefreiheitsanalyse API
 *
 * Analysiert PDF- und Word-Dokumente auf Barrierefreiheit
 */

import { NextRequest, NextResponse } from "next/server";

// Erlaubte Dateitypen
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface CheckResult {
  id: string;
  category: string;
  categoryDE: string;
  name: string;
  nameDE: string;
  status: "passed" | "failed" | "warning" | "manual";
  message: string;
  messageDE: string;
  wcagCriteria?: string;
  pdfuaClause?: string;
  severity: "error" | "warning" | "info";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Validierung
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const fileExtension = getFileExtension(file.name).toLowerCase();
    const isPdf = fileExtension === ".pdf";

    // Datei in Buffer konvertieren
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Analyse durchführen
    const checks = isPdf
      ? await analyzePdf(buffer, file.name)
      : await analyzeWord(buffer, file.name);

    // Zusammenfassung berechnen
    const summary = calculateSummary(checks);
    const conformance = determineConformance(checks, summary);

    return NextResponse.json({
      fileName: file.name,
      fileType: isPdf ? "PDF" : "Word",
      fileSize: file.size,
      pageCount: isPdf ? estimatePageCount(buffer) : undefined,
      isTagged: checks.some(
        (c) => c.id === "structure-tagged" && c.status === "passed"
      ),
      hasTitle: checks.some(
        (c) => c.id === "metadata-title" && c.status === "passed"
      ),
      language: checks.find((c) => c.id === "language-document")?.status === "passed"
        ? "Deutsch"
        : undefined,
      checks,
      summary,
      conformance,
    });
  } catch (error) {
    console.error("Dokumentenanalyse Fehler:", error);
    return NextResponse.json(
      { error: "Fehler bei der Dokumentenanalyse" },
      { status: 500 }
    );
  }
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Datei ist zu groß. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
    };
  }

  const extension = getFileExtension(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Ungültiges Format. Erlaubt: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

function estimatePageCount(buffer: Buffer): number {
  // Einfache Heuristik: Suche nach "/Page" im PDF
  const content = buffer.toString("latin1");
  const matches = content.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

async function analyzePdf(buffer: Buffer, fileName: string): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  const content = buffer.toString("latin1");

  // Struktur-Checks
  checks.push({
    id: "structure-tagged",
    category: "structure",
    categoryDE: "Dokumentstruktur",
    name: "Tagged PDF",
    nameDE: "Getaggtes PDF",
    status: content.includes("/MarkInfo") && content.includes("/Marked true")
      ? "passed"
      : "failed",
    message: content.includes("/MarkInfo")
      ? "Document is tagged"
      : "Document is not tagged",
    messageDE: content.includes("/MarkInfo")
      ? "Dokument ist getaggt"
      : "Dokument ist nicht getaggt - Tags sind für Screenreader erforderlich",
    wcagCriteria: "1.3.1",
    pdfuaClause: "7.1",
    severity: "error",
  });

  checks.push({
    id: "structure-headings",
    category: "structure",
    categoryDE: "Dokumentstruktur",
    name: "Heading structure",
    nameDE: "Überschriftenstruktur",
    status: content.includes("/H1") || content.includes("/H2")
      ? "passed"
      : content.includes("/MarkInfo")
      ? "warning"
      : "failed",
    message: "Check heading hierarchy",
    messageDE: content.includes("/H1")
      ? "Überschriften vorhanden"
      : "Keine Überschriften gefunden - Strukturieren Sie das Dokument mit Überschriften",
    wcagCriteria: "1.3.1",
    pdfuaClause: "7.4",
    severity: "warning",
  });

  checks.push({
    id: "structure-reading-order",
    category: "structure",
    categoryDE: "Dokumentstruktur",
    name: "Reading order",
    nameDE: "Lesereihenfolge",
    status: content.includes("/StructTreeRoot") ? "passed" : "manual",
    message: "Verify reading order manually",
    messageDE: content.includes("/StructTreeRoot")
      ? "Strukturbaum vorhanden - Lesereihenfolge manuell prüfen"
      : "Kein Strukturbaum - Lesereihenfolge kann nicht bestimmt werden",
    wcagCriteria: "1.3.2",
    pdfuaClause: "7.1",
    severity: "warning",
  });

  // Metadaten-Checks
  checks.push({
    id: "metadata-title",
    category: "metadata",
    categoryDE: "Metadaten",
    name: "Document title",
    nameDE: "Dokumenttitel",
    status: content.includes("/Title") ? "passed" : "failed",
    message: content.includes("/Title")
      ? "Document title is set"
      : "Document title is missing",
    messageDE: content.includes("/Title")
      ? "Dokumenttitel ist gesetzt"
      : "Dokumenttitel fehlt - Setzen Sie einen aussagekräftigen Titel",
    wcagCriteria: "2.4.2",
    pdfuaClause: "7.1",
    severity: "error",
  });

  checks.push({
    id: "metadata-display-title",
    category: "metadata",
    categoryDE: "Metadaten",
    name: "Display document title",
    nameDE: "Titel in Titelleiste anzeigen",
    status: content.includes("/DisplayDocTitle true") ? "passed" : "warning",
    message: "DisplayDocTitle setting",
    messageDE: content.includes("/DisplayDocTitle true")
      ? "Titel wird in Titelleiste angezeigt"
      : "Titel sollte in der Titelleiste angezeigt werden",
    pdfuaClause: "7.1",
    severity: "info",
  });

  // Sprache-Checks
  checks.push({
    id: "language-document",
    category: "language",
    categoryDE: "Sprache",
    name: "Document language",
    nameDE: "Dokumentsprache",
    status: content.includes("/Lang") ? "passed" : "failed",
    message: content.includes("/Lang")
      ? "Document language is set"
      : "Document language is not set",
    messageDE: content.includes("/Lang")
      ? "Dokumentsprache ist gesetzt"
      : "Dokumentsprache fehlt - Setzen Sie die Hauptsprache des Dokuments",
    wcagCriteria: "3.1.1",
    pdfuaClause: "7.2",
    severity: "error",
  });

  // Bilder-Checks
  const hasImages = content.includes("/Image") || content.includes("/XObject");
  const hasAltTexts = content.includes("/Alt") || content.includes("/ActualText");

  checks.push({
    id: "images-alt-text",
    category: "images",
    categoryDE: "Bilder",
    name: "Image alt texts",
    nameDE: "Bild-Alternativtexte",
    status: !hasImages ? "passed" : hasAltTexts ? "warning" : "failed",
    message: !hasImages
      ? "No images found"
      : hasAltTexts
      ? "Some alt texts found - verify completeness"
      : "No alt texts found for images",
    messageDE: !hasImages
      ? "Keine Bilder gefunden"
      : hasAltTexts
      ? "Alt-Texte gefunden - Vollständigkeit manuell prüfen"
      : "Keine Alt-Texte für Bilder gefunden",
    wcagCriteria: "1.1.1",
    pdfuaClause: "7.3",
    severity: hasImages && !hasAltTexts ? "error" : "warning",
  });

  checks.push({
    id: "images-decorative",
    category: "images",
    categoryDE: "Bilder",
    name: "Decorative images",
    nameDE: "Dekorative Bilder",
    status: hasImages ? "manual" : "passed",
    message: "Verify decorative images are marked as artifacts",
    messageDE: hasImages
      ? "Prüfen Sie, ob dekorative Bilder als Artefakte markiert sind"
      : "Keine Bilder vorhanden",
    pdfuaClause: "7.3",
    severity: "info",
  });

  // Tabellen-Checks
  const hasTables = content.includes("/Table");
  const hasTableHeaders = content.includes("/TH");

  checks.push({
    id: "tables-headers",
    category: "tables",
    categoryDE: "Tabellen",
    name: "Table headers",
    nameDE: "Tabellenkopfzeilen",
    status: !hasTables ? "passed" : hasTableHeaders ? "passed" : "warning",
    message: !hasTables
      ? "No tables found"
      : hasTableHeaders
      ? "Table headers defined"
      : "Table headers may be missing",
    messageDE: !hasTables
      ? "Keine Tabellen gefunden"
      : hasTableHeaders
      ? "Tabellenkopfzeilen vorhanden"
      : "Tabellenkopfzeilen prüfen - TH-Tags verwenden",
    wcagCriteria: "1.3.1",
    pdfuaClause: "7.5",
    severity: "warning",
  });

  // Links-Checks
  const hasLinks = content.includes("/Link") || content.includes("/URI");

  checks.push({
    id: "links-purpose",
    category: "links",
    categoryDE: "Links",
    name: "Link purpose",
    nameDE: "Link-Zweck",
    status: hasLinks ? "manual" : "passed",
    message: hasLinks
      ? "Verify link texts are descriptive"
      : "No links found",
    messageDE: hasLinks
      ? "Prüfen Sie, ob Linktexte den Zweck des Links beschreiben"
      : "Keine Links gefunden",
    wcagCriteria: "2.4.4",
    pdfuaClause: "7.17",
    severity: "info",
  });

  // Kontrast-Check (kann nicht automatisch geprüft werden)
  checks.push({
    id: "contrast-text",
    category: "contrast",
    categoryDE: "Kontrast",
    name: "Text contrast",
    nameDE: "Textkontrast",
    status: "manual",
    message: "Text contrast must be verified manually",
    messageDE: "Prüfen Sie den Textkontrast manuell (mindestens 4.5:1 für normalen Text)",
    wcagCriteria: "1.4.3",
    severity: "info",
  });

  // Fonts-Check
  const hasEmbeddedFonts = content.includes("/FontFile") || content.includes("/FontFile2");

  checks.push({
    id: "fonts-embedded",
    category: "structure",
    categoryDE: "Dokumentstruktur",
    name: "Embedded fonts",
    nameDE: "Eingebettete Schriften",
    status: hasEmbeddedFonts ? "passed" : "warning",
    message: hasEmbeddedFonts
      ? "Fonts appear to be embedded"
      : "Verify all fonts are embedded",
    messageDE: hasEmbeddedFonts
      ? "Schriften sind eingebettet"
      : "Prüfen Sie, ob alle Schriften eingebettet sind",
    pdfuaClause: "7.21",
    severity: "warning",
  });

  return checks;
}

async function analyzeWord(buffer: Buffer, fileName: string): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  // Word-Dokumente analysieren (vereinfacht)
  // Für eine vollständige Analyse würde man eine Bibliothek wie mammoth.js verwenden

  checks.push({
    id: "structure-headings",
    category: "structure",
    categoryDE: "Dokumentstruktur",
    name: "Heading structure",
    nameDE: "Überschriftenstruktur",
    status: "manual",
    message: "Verify heading hierarchy in Word document",
    messageDE: "Prüfen Sie die Überschriftenhierarchie im Word-Dokument",
    wcagCriteria: "1.3.1",
    severity: "warning",
  });

  checks.push({
    id: "metadata-title",
    category: "metadata",
    categoryDE: "Metadaten",
    name: "Document title",
    nameDE: "Dokumenttitel",
    status: "manual",
    message: "Check document properties for title",
    messageDE: "Prüfen Sie die Dokumenteigenschaften auf Titel",
    wcagCriteria: "2.4.2",
    severity: "warning",
  });

  checks.push({
    id: "images-alt-text",
    category: "images",
    categoryDE: "Bilder",
    name: "Image alt texts",
    nameDE: "Bild-Alternativtexte",
    status: "manual",
    message: "Verify all images have alt text",
    messageDE: "Prüfen Sie, ob alle Bilder Alt-Texte haben",
    wcagCriteria: "1.1.1",
    severity: "warning",
  });

  checks.push({
    id: "tables-headers",
    category: "tables",
    categoryDE: "Tabellen",
    name: "Table headers",
    nameDE: "Tabellenkopfzeilen",
    status: "manual",
    message: "Verify table headers are marked",
    messageDE: "Prüfen Sie, ob Tabellenkopfzeilen als solche markiert sind",
    wcagCriteria: "1.3.1",
    severity: "warning",
  });

  checks.push({
    id: "language-document",
    category: "language",
    categoryDE: "Sprache",
    name: "Document language",
    nameDE: "Dokumentsprache",
    status: "manual",
    message: "Verify document language is set",
    messageDE: "Prüfen Sie, ob die Dokumentsprache gesetzt ist",
    wcagCriteria: "3.1.1",
    severity: "warning",
  });

  checks.push({
    id: "links-purpose",
    category: "links",
    categoryDE: "Links",
    name: "Link purpose",
    nameDE: "Link-Zweck",
    status: "manual",
    message: "Verify link texts are descriptive",
    messageDE: "Prüfen Sie, ob Linktexte beschreibend sind",
    wcagCriteria: "2.4.4",
    severity: "info",
  });

  checks.push({
    id: "contrast-text",
    category: "contrast",
    categoryDE: "Kontrast",
    name: "Text contrast",
    nameDE: "Textkontrast",
    status: "manual",
    message: "Verify text contrast manually",
    messageDE: "Prüfen Sie den Textkontrast manuell",
    wcagCriteria: "1.4.3",
    severity: "info",
  });

  return checks;
}

function calculateSummary(checks: CheckResult[]) {
  const passed = checks.filter((c) => c.status === "passed").length;
  const failed = checks.filter((c) => c.status === "failed").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const manual = checks.filter((c) => c.status === "manual").length;

  const total = checks.length;
  const automatedTotal = total - manual;
  const automatedPassed = passed;

  // Score basierend auf automatisierten Checks
  const score =
    automatedTotal > 0
      ? Math.round((automatedPassed / automatedTotal) * 100)
      : 50;

  return { passed, failed, warnings, manual, score };
}

function determineConformance(
  checks: CheckResult[],
  summary: { passed: number; failed: number; warnings: number }
) {
  const criticalFailed = checks.filter(
    (c) => c.status === "failed" && c.severity === "error"
  ).length;

  const wcagLevel: "AAA" | "AA" | "A" | "none" =
    criticalFailed === 0 && summary.warnings === 0
      ? "AA"
      : criticalFailed === 0
      ? "A"
      : "none";

  const pdfua = criticalFailed === 0;
  const bitv = wcagLevel !== "none";

  return { wcagLevel, pdfua, bitv };
}

/**
 * PPTX zu PDF/UA Konvertierungs-API
 *
 * Konvertiert PowerPoint-Dateien in barrierefreie PDF/UA-1 konforme Dokumente
 * mit vollständigem Tagging, Lesereihenfolge und Accessibility-Report
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

import { PptxParser } from "@/lib/pptx/parser";
import { validatePresentation } from "@/lib/pptx/validator";
import { PdfUaGenerator } from "@/lib/pdf/generator";
import { PptxAiEnhancer } from "@/lib/pptx/ai-enhancer";
import { ConversionProfile, AccessibilityReport } from "@/lib/pptx/types";

// Next.js App Router: Route Segment Config
export const maxDuration = 240; // 240 Sekunden Timeout
export const dynamic = "force-dynamic";

// Temporäre Verzeichnisse
const UPLOAD_DIR = join(process.cwd(), "tmp", "uploads");
const OUTPUT_DIR = join(process.cwd(), "tmp", "output");
const PUBLIC_DIR = join(process.cwd(), "public", "downloads");
const REPORTS_DIR = join(process.cwd(), "public", "reports");

// Erlaubte Dateitypen
const ALLOWED_EXTENSIONS = [".pptx"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Konvertierungsprofile
const PROFILES: Record<string, ConversionProfile> = {
  standard: {
    name: "Standard",
    id: "standard",
    description: "Empfohlene Einstellungen für die meisten Präsentationen",
    tagMapping: {
      title: "H1",
      subtitle: "H2",
      body: "P",
      list: "L",
      listItem: "LI",
      table: "Table",
      image: "Figure",
      chart: "Figure",
      smartart: "Figure",
    },
    autoFixOptions: {
      generateMissingAltText: false,
      markUncaptionedAsDecorative: false,
      fixEmptyTitles: false,
      setDocumentLanguage: true,
      fixReadingOrder: true,
      convertPseudoTables: false,
    },
    exportOptions: {
      pdfVersion: "1.7",
      pdfUaConformance: "PDF/UA-1",
      embedFonts: true,
      includeBookmarks: true,
      includeLinks: true,
      taggedPdf: true,
      linearized: false,
    },
  },
  strict: {
    name: "Strikt (BITV 2.0)",
    id: "strict",
    description: "Maximale Barrierefreiheit für öffentliche Stellen",
    tagMapping: {
      title: "H1",
      subtitle: "H2",
      body: "P",
      list: "L",
      listItem: "LI",
      table: "Table",
      image: "Figure",
      chart: "Figure",
      smartart: "Figure",
    },
    autoFixOptions: {
      generateMissingAltText: false,
      markUncaptionedAsDecorative: false,
      fixEmptyTitles: true,
      setDocumentLanguage: true,
      fixReadingOrder: true,
      convertPseudoTables: false,
    },
    exportOptions: {
      pdfVersion: "1.7",
      pdfUaConformance: "PDF/UA-1",
      embedFonts: true,
      includeBookmarks: true,
      includeLinks: true,
      taggedPdf: true,
      linearized: true,
    },
  },
  quick: {
    name: "Schnell",
    id: "quick",
    description: "Schnelle Konvertierung mit Basis-Tags",
    tagMapping: {
      title: "H1",
      subtitle: "H2",
      body: "P",
    },
    autoFixOptions: {
      generateMissingAltText: false,
      markUncaptionedAsDecorative: false,
      fixEmptyTitles: false,
      setDocumentLanguage: true,
      fixReadingOrder: false,
      convertPseudoTables: false,
    },
    exportOptions: {
      pdfVersion: "1.7",
      pdfUaConformance: "PDF/UA-1",
      embedFonts: true,
      includeBookmarks: false,
      includeLinks: true,
      taggedPdf: true,
      linearized: false,
    },
  },
};

interface ConversionResponse {
  success: boolean;
  downloadUrl?: string;
  reportUrl?: string;
  fileName?: string;
  fileSize?: number;
  report?: AccessibilityReport;
  aiEnhancements?: {
    altTextsGenerated: number;
    titlesGenerated: number;
    processingTimeMs: number;
  };
  errors?: string[];
  warnings?: string[];
}

export async function POST(request: NextRequest) {
  const jobId = randomUUID();

  try {
    // Verzeichnisse sicherstellen
    await ensureDirectories();

    // FormData parsen
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const profile = (formData.get("profile") as string) || "standard";
    const customTitle = formData.get("title") as string | null;
    const language = (formData.get("language") as string) || "de";
    const validateOnly = formData.get("validateOnly") === "true";
    const includeReport = formData.get("includeReport") !== "false";
    // AI ist standardmäßig aktiviert - kann mit useAI=false deaktiviert werden
    const useAI = formData.get("useAI") !== "false";

    // Datei validieren
    if (!file) {
      return NextResponse.json(
        { success: false, errors: ["Keine Datei hochgeladen"] },
        { status: 400 }
      );
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: [validation.error!] },
        { status: 400 }
      );
    }

    // Profil holen
    const conversionProfile = PROFILES[profile] || PROFILES.standard;

    // Datei speichern
    const inputPath = join(UPLOAD_DIR, `${jobId}.pptx`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(inputPath, buffer);

    try {
      // === Phase 1: PPTX Parsen ===
      const parser = new PptxParser();
      let presentation;
      try {
        presentation = await parser.parse(buffer);
      } catch (parseError) {
        console.error("PPTX Parse-Fehler:", parseError);
        await cleanup(inputPath);
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        return NextResponse.json(
          {
            success: false,
            errors: [
              `Fehler beim Lesen der PowerPoint-Datei: ${errorMessage}. ` +
              "Stellen Sie sicher, dass es sich um eine gültige .pptx-Datei handelt (keine .ppt-Datei).",
            ],
          },
          { status: 400 }
        );
      }

      // Titel überschreiben falls angegeben
      if (customTitle) {
        presentation.metadata.title = customTitle;
      }
      if (language) {
        presentation.metadata.language = language;
      }

      // === Phase 2: AI Enhancement (optional) ===
      let aiEnhancements: ConversionResponse["aiEnhancements"];
      if (useAI) {
        try {
          const enhancer = new PptxAiEnhancer({
            generateAltTexts: true,
            generateSlideTitles: true,
            verifyReadingOrder: false, // Too slow for now
          });

          const { available } = await enhancer.isAvailable();
          if (available) {
            const result = await enhancer.enhance(presentation);
            aiEnhancements = {
              altTextsGenerated: result.stats.altTextsGenerated,
              titlesGenerated: result.stats.titlesGenerated,
              processingTimeMs: result.stats.processingTimeMs,
            };
            console.log(`AI Enhancement: ${result.enhancements.length} Verbesserungen`);
          }
        } catch (aiError) {
          console.warn("AI Enhancement fehlgeschlagen:", aiError);
          // Continue without AI - not a fatal error
        }
      }

      // === Phase 3: Validierung ===
      const report = validatePresentation(presentation, conversionProfile);

      // Nur validieren?
      if (validateOnly) {
        await cleanup(inputPath);

        // Report speichern
        let reportUrl: string | undefined;
        if (includeReport) {
          reportUrl = await saveReport(jobId, report);
        }

        return NextResponse.json({
          success: true,
          report,
          reportUrl,
          errors: report.summary.errors > 0
            ? [`${report.summary.errors} Fehler gefunden`]
            : undefined,
          warnings: report.summary.warnings > 0
            ? [`${report.summary.warnings} Warnungen gefunden`]
            : undefined,
        } as ConversionResponse);
      }

      // Bei kritischen Fehlern abbrechen (optional)
      // if (report.summary.errors > 0 && !formData.get("force")) {
      //   return NextResponse.json({
      //     success: false,
      //     report,
      //     errors: ["Kritische Barrierefreiheitsfehler gefunden. Beheben Sie diese oder verwenden Sie force=true."],
      //   }, { status: 422 });
      // }

      // === Phase 3: PDF generieren ===
      const generator = new PdfUaGenerator({
        profile: conversionProfile,
        documentTitle: presentation.metadata.title,
        language: presentation.metadata.language,
        includeBookmarks: conversionProfile.exportOptions.includeBookmarks,
        embedFonts: conversionProfile.exportOptions.embedFonts,
      });

      const pdfBytes = await generator.generate(presentation);

      // PDF speichern
      const outputFileName = `${jobId}.pdf`;
      const publicPath = join(PUBLIC_DIR, outputFileName);
      await writeFile(publicPath, pdfBytes);

      // Report speichern
      let reportUrl: string | undefined;
      if (includeReport) {
        reportUrl = await saveReport(jobId, report);
      }

      // Aufräumen
      await cleanup(inputPath);

      // Erfolgsantwort
      const originalName = file.name.replace(/\.pptx$/i, ".pdf");

      return NextResponse.json({
        success: true,
        downloadUrl: `/downloads/${outputFileName}`,
        reportUrl,
        fileName: originalName,
        fileSize: pdfBytes.length,
        report: includeReport ? report : undefined,
        aiEnhancements,
        warnings: report.summary.warnings > 0
          ? report.issues
              .filter((i) => i.severity === "warning")
              .slice(0, 5)
              .map((i) => i.messageDE || i.message)
          : undefined,
      } as ConversionResponse);

    } catch (parseError) {
      console.error("Konvertierungsfehler:", parseError);
      await cleanup(inputPath);

      return NextResponse.json(
        {
          success: false,
          errors: [
            "Fehler bei der Verarbeitung der PowerPoint-Datei. " +
            "Stellen Sie sicher, dass es sich um eine gültige .pptx-Datei handelt.",
          ],
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("API-Fehler:", error);
    return NextResponse.json(
      {
        success: false,
        errors: ["Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut."],
      },
      { status: 500 }
    );
  }
}

// GET-Endpoint für verfügbare Profile
export async function GET() {
  const profileList = Object.entries(PROFILES).map(([id, profile]) => ({
    id,
    name: profile.name,
    description: profile.description,
  }));

  return NextResponse.json({
    profiles: profileList,
    defaultProfile: "standard",
    supportedFormats: [".pptx"],
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  });
}

// === Hilfsfunktionen ===

async function ensureDirectories() {
  for (const dir of [UPLOAD_DIR, OUTPUT_DIR, PUBLIC_DIR, REPORTS_DIR]) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

function validateFile(file: File): { valid: boolean; error?: string } {
  // Größe prüfen
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Die Datei ist zu groß. Maximale Größe: ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
    };
  }

  // Dateiendung prüfen
  const extension = getFileExtension(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Ungültiges Dateiformat. Nur ${ALLOWED_EXTENSIONS.join(", ")} wird unterstützt.`,
    };
  }

  return { valid: true };
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

async function saveReport(jobId: string, report: AccessibilityReport): Promise<string> {
  // JSON-Report
  const jsonPath = join(REPORTS_DIR, `${jobId}.json`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2));

  // Text-Report (deutsch)
  const txtPath = join(REPORTS_DIR, `${jobId}.txt`);
  await writeFile(txtPath, report.reportTextDE || report.reportText || "");

  return `/reports/${jobId}.json`;
}

async function cleanup(...paths: string[]) {
  for (const path of paths) {
    try {
      if (existsSync(path)) {
        await unlink(path);
      }
    } catch (error) {
      console.warn(`Cleanup fehlgeschlagen für: ${path}`, error);
    }
  }
}

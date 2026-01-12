import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

// Temporäres Verzeichnis für Uploads
const UPLOAD_DIR = join(process.cwd(), "tmp", "uploads");
const OUTPUT_DIR = join(process.cwd(), "tmp", "output");
const PUBLIC_DIR = join(process.cwd(), "public", "downloads");

// Erlaubte Dateitypen
const ALLOWED_TYPES = [
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const ALLOWED_EXTENSIONS = [".ppt", ".pptx"];

// Maximale Dateigröße (50 MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Verzeichnisse erstellen falls nicht vorhanden
    await ensureDirectories();

    // FormData parsen
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Dateivalidierung
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Eindeutige ID für diesen Job
    const jobId = randomUUID();
    const fileExtension = getFileExtension(file.name);
    const inputFileName = `${jobId}${fileExtension}`;
    const outputFileName = `${jobId}.pdf`;
    const inputPath = join(UPLOAD_DIR, inputFileName);
    const outputPath = join(OUTPUT_DIR, outputFileName);
    const publicPath = join(PUBLIC_DIR, outputFileName);

    // Datei speichern
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(inputPath, buffer);

    // Konvertierung durchführen
    const conversionResult = await convertToPdf(inputPath, OUTPUT_DIR);

    if (!conversionResult.success) {
      // Aufräumen bei Fehler
      await cleanup(inputPath);
      return NextResponse.json(
        { error: conversionResult.error },
        { status: 500 }
      );
    }

    // PDF in public-Verzeichnis verschieben für Download
    const pdfBuffer = await readFile(outputPath);
    await writeFile(publicPath, pdfBuffer);

    // Originaldateien aufräumen (behalte public-Kopie)
    await cleanup(inputPath, outputPath);

    // Erfolgreiche Antwort
    const originalName = file.name.replace(/\.(ppt|pptx)$/i, ".pdf");

    return NextResponse.json({
      success: true,
      downloadUrl: `/downloads/${outputFileName}`,
      fileName: originalName,
      fileSize: pdfBuffer.length,
      warnings: conversionResult.warnings,
    });
  } catch (error) {
    console.error("Konvertierungsfehler:", error);
    return NextResponse.json(
      {
        error:
          "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
      },
      { status: 500 }
    );
  }
}

async function ensureDirectories() {
  for (const dir of [UPLOAD_DIR, OUTPUT_DIR, PUBLIC_DIR]) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

function validateFile(file: File): { valid: boolean; error?: string } {
  // Größenprüfung
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Die Datei ist zu groß. Maximale Größe: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
    };
  }

  // Dateiendung prüfen
  const extension = getFileExtension(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Ungültiges Dateiformat. Erlaubt sind: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // MIME-Type prüfen (falls verfügbar)
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    // Manchmal ist der MIME-Type nicht korrekt gesetzt, also nur warnen
    console.warn(`Unerwarteter MIME-Type: ${file.type}`);
  }

  return { valid: true };
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

interface ConversionResult {
  success: boolean;
  error?: string;
  warnings?: string[];
}

async function convertToPdf(
  inputPath: string,
  outputDir: string
): Promise<ConversionResult> {
  const warnings: string[] = [];

  // Prüfe ob LibreOffice installiert ist
  const libreOfficePath = await findLibreOffice();

  if (!libreOfficePath) {
    return {
      success: false,
      error:
        "LibreOffice ist nicht installiert. Für die Konvertierung wird LibreOffice benötigt. " +
        "Installieren Sie es mit: brew install --cask libreoffice",
    };
  }

  try {
    // LibreOffice Konvertierung
    const command = `"${libreOfficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000, // 2 Minuten Timeout
    });

    if (stderr && !stderr.includes("warn")) {
      console.warn("LibreOffice stderr:", stderr);
    }

    // Prüfe ob Output-Datei erstellt wurde
    const outputFileName = inputPath
      .split("/")
      .pop()
      ?.replace(/\.(ppt|pptx)$/i, ".pdf");
    const outputPath = join(outputDir, outputFileName || "output.pdf");

    if (!existsSync(outputPath)) {
      return {
        success: false,
        error: "PDF konnte nicht erstellt werden. Die Datei ist möglicherweise beschädigt.",
      };
    }

    // Warnungen hinzufügen
    warnings.push(
      "Das PDF wurde erstellt, aber die Barrierefreiheits-Tags müssen möglicherweise manuell überprüft werden."
    );
    warnings.push(
      "Prüfen Sie Alt-Texte für Bilder und die Leseordnung mit dem Dokumenten-Prüfer."
    );

    return {
      success: true,
      warnings,
    };
  } catch (error) {
    console.error("LibreOffice Fehler:", error);
    return {
      success: false,
      error:
        "Fehler bei der PDF-Konvertierung. Bitte stellen Sie sicher, dass die PowerPoint-Datei nicht beschädigt ist.",
    };
  }
}

async function findLibreOffice(): Promise<string | null> {
  // Mögliche Pfade für LibreOffice
  const possiblePaths = [
    // macOS
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    // Linux
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/usr/local/bin/soffice",
    // Homebrew auf macOS
    "/opt/homebrew/bin/soffice",
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Versuche 'which' Befehl
  try {
    const { stdout } = await execAsync("which soffice || which libreoffice");
    const path = stdout.trim();
    if (path && existsSync(path)) {
      return path;
    }
  } catch {
    // Ignorieren
  }

  return null;
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


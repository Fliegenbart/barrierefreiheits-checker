/**
 * API für das Einbrennen von Untertiteln in Videos mit FFmpeg
 *
 * Erwartet:
 * - video: Videodatei
 * - subtitles: SRT-formatierte Untertitel als Text
 * - options: Styling-Optionen (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

// Styling-Optionen für Untertitel
interface SubtitleStyle {
  fontSize?: number;
  fontName?: string;
  primaryColor?: string; // Hex-Farbe z.B. "#FFFFFF"
  outlineColor?: string;
  backgroundColor?: string;
  outlineWidth?: number;
  shadow?: boolean;
  position?: "bottom" | "top" | "center";
  marginV?: number;
}

const DEFAULT_STYLE: SubtitleStyle = {
  fontSize: 24,
  fontName: "Arial",
  primaryColor: "#FFFFFF",
  outlineColor: "#000000",
  backgroundColor: "#80000000", // Semi-transparent black
  outlineWidth: 2,
  shadow: true,
  position: "bottom",
  marginV: 30,
};

// Temporäres Verzeichnis
const TEMP_DIR = "/tmp/subtitle-burn";

export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];

  try {
    // Temp-Verzeichnis erstellen
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const video = formData.get("video") as File | null;
    const subtitlesText = formData.get("subtitles") as string | null;
    const styleJson = formData.get("style") as string | null;

    if (!video) {
      return NextResponse.json(
        { error: "Keine Videodatei hochgeladen" },
        { status: 400 }
      );
    }

    if (!subtitlesText) {
      return NextResponse.json(
        { error: "Keine Untertitel übergeben" },
        { status: 400 }
      );
    }

    // Styling parsen
    let style: SubtitleStyle = { ...DEFAULT_STYLE };
    if (styleJson) {
      try {
        style = { ...DEFAULT_STYLE, ...JSON.parse(styleJson) };
      } catch {
        // Bei Parse-Fehler Standard-Stil verwenden
      }
    }

    // Dateien temporär speichern
    const sessionId = randomUUID();
    const videoExt = video.name.split(".").pop() || "mp4";
    const inputVideoPath = join(TEMP_DIR, `${sessionId}_input.${videoExt}`);
    const subtitlePath = join(TEMP_DIR, `${sessionId}.srt`);
    const outputVideoPath = join(TEMP_DIR, `${sessionId}_output.mp4`);

    tempFiles.push(inputVideoPath, subtitlePath, outputVideoPath);

    // Video speichern
    const videoBuffer = Buffer.from(await video.arrayBuffer());
    await writeFile(inputVideoPath, videoBuffer);

    // Untertitel speichern
    await writeFile(subtitlePath, subtitlesText, "utf-8");

    // FFmpeg-Filter für Untertitel erstellen
    const subtitleFilter = buildSubtitleFilter(subtitlePath, style);

    // FFmpeg ausführen
    const ffmpegResult = await runFFmpeg(
      inputVideoPath,
      outputVideoPath,
      subtitleFilter
    );

    if (!ffmpegResult.success) {
      return NextResponse.json(
        { error: `FFmpeg-Fehler: ${ffmpegResult.error}` },
        { status: 500 }
      );
    }

    // Ausgabedatei lesen
    const { readFile } = await import("fs/promises");
    const outputBuffer = await readFile(outputVideoPath);

    // Temporäre Dateien löschen
    await cleanupFiles(tempFiles);

    // Video als Response zurückgeben
    const outputFileName = video.name.replace(/\.[^/.]+$/, "_untertitelt.mp4");

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${outputFileName}"`,
        "Content-Length": outputBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Burn subtitles error:", error);

    // Aufräumen bei Fehler
    await cleanupFiles(tempFiles);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ein unerwarteter Fehler ist aufgetreten",
      },
      { status: 500 }
    );
  }
}

/**
 * Baut den FFmpeg-Subtitles-Filter mit Styling
 */
function buildSubtitleFilter(subtitlePath: string, style: SubtitleStyle): string {
  // Farben von Hex zu ASS-Format konvertieren (BGR)
  const primaryColor = hexToAss(style.primaryColor || "#FFFFFF");
  const outlineColor = hexToAss(style.outlineColor || "#000000");
  const backColor = hexToAss(style.backgroundColor || "#80000000");

  // ASS-Alignment basierend auf Position
  let alignment = 2; // Bottom center
  if (style.position === "top") alignment = 8;
  if (style.position === "center") alignment = 5;

  // Force-Style Parameter für ASS-Untertitel
  const forceStyle = [
    `FontName=${style.fontName || "Arial"}`,
    `FontSize=${style.fontSize || 24}`,
    `PrimaryColour=${primaryColor}`,
    `OutlineColour=${outlineColor}`,
    `BackColour=${backColor}`,
    `Outline=${style.outlineWidth || 2}`,
    `Shadow=${style.shadow ? 1 : 0}`,
    `Alignment=${alignment}`,
    `MarginV=${style.marginV || 30}`,
    "Bold=0",
    "BorderStyle=1",
  ].join(",");

  // Pfad escapen für FFmpeg (Backslashes und Doppelpunkte)
  const escapedPath = subtitlePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:");

  return `subtitles='${escapedPath}':force_style='${forceStyle}'`;
}

/**
 * Konvertiert Hex-Farbe zu ASS-Format (&HAABBGGRR)
 */
function hexToAss(hex: string): string {
  // Handle Hex mit Alpha (z.B. "#80000000")
  const clean = hex.replace("#", "");

  let a = "00";
  let r: string, g: string, b: string;

  if (clean.length === 8) {
    a = clean.substring(0, 2);
    r = clean.substring(2, 4);
    g = clean.substring(4, 6);
    b = clean.substring(6, 8);
  } else if (clean.length === 6) {
    r = clean.substring(0, 2);
    g = clean.substring(2, 4);
    b = clean.substring(4, 6);
  } else {
    return "&H00FFFFFF"; // Fallback: Weiß
  }

  // ASS verwendet BGR-Reihenfolge mit Alpha
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

/**
 * Führt FFmpeg aus
 */
function runFFmpeg(
  inputPath: string,
  outputPath: string,
  subtitleFilter: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const args = [
      "-i", inputPath,
      "-vf", subtitleFilter,
      "-c:a", "copy", // Audio kopieren ohne Re-Encoding
      "-c:v", "libx264", // Video mit H.264 encodieren
      "-preset", "fast", // Schnelles Encoding
      "-crf", "23", // Gute Qualität
      "-movflags", "+faststart", // Für Web-Streaming optimieren
      "-y", // Überschreiben ohne Nachfrage
      outputPath,
    ];

    console.log("FFmpeg command:", "ffmpeg", args.join(" "));

    const ffmpeg = spawn("ffmpeg", args);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        console.error("FFmpeg stderr:", stderr);
        resolve({
          success: false,
          error: extractFFmpegError(stderr) || `Exit code: ${code}`,
        });
      }
    });

    ffmpeg.on("error", (error) => {
      if (error.message.includes("ENOENT")) {
        resolve({
          success: false,
          error: "FFmpeg ist nicht installiert. Bitte installieren Sie FFmpeg auf dem Server.",
        });
      } else {
        resolve({ success: false, error: error.message });
      }
    });
  });
}

/**
 * Extrahiert aussagekräftige Fehlermeldung aus FFmpeg-Output
 */
function extractFFmpegError(stderr: string): string | null {
  // Suche nach typischen Fehlermeldungen
  const errorPatterns = [
    /Error.*?(?:\n|$)/i,
    /Invalid.*?(?:\n|$)/i,
    /No such file or directory/i,
    /Permission denied/i,
    /Cannot find.*?(?:\n|$)/i,
  ];

  for (const pattern of errorPatterns) {
    const match = stderr.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

/**
 * Löscht temporäre Dateien
 */
async function cleanupFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      if (existsSync(file)) {
        await unlink(file);
      }
    } catch (err) {
      console.warn(`Could not delete temp file ${file}:`, err);
    }
  }
}

// GET-Endpoint für Status-Check
export async function GET() {
  // Prüfen ob FFmpeg verfügbar ist
  return new Promise<NextResponse>((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-version"]);

    let output = "";

    ffmpeg.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        const versionMatch = output.match(/ffmpeg version (\S+)/);
        resolve(
          NextResponse.json({
            available: true,
            version: versionMatch?.[1] || "unknown",
          })
        );
      } else {
        resolve(
          NextResponse.json({
            available: false,
            error: "FFmpeg ist nicht verfügbar",
          })
        );
      }
    });

    ffmpeg.on("error", () => {
      resolve(
        NextResponse.json({
          available: false,
          error: "FFmpeg ist nicht installiert",
        })
      );
    });
  });
}

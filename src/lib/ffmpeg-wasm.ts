"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export interface SubtitleStyle {
  fontSize: number;
  fontName: string;
  primaryColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  position: "bottom" | "top" | "center";
}

export interface BurnSubtitlesOptions {
  videoFile: File;
  srtContent: string;
  style: SubtitleStyle;
  onProgress?: (progress: number, message: string) => void;
}

export interface BurnSubtitlesResult {
  blob: Blob;
  filename: string;
}

/**
 * Load FFmpeg.wasm with progress reporting
 */
export async function loadFFmpeg(
  onProgress?: (progress: number, message: string) => void
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    onProgress?.(5, "FFmpeg wird initialisiert...");

    ffmpeg = new FFmpeg();

    // Set up logging
    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    // Set up progress reporting
    ffmpeg.on("progress", ({ progress }) => {
      const percent = Math.round(progress * 100);
      onProgress?.(30 + percent * 0.6, `Video wird verarbeitet... ${percent}%`);
    });

    onProgress?.(10, "FFmpeg Core wird geladen...");

    // Load FFmpeg core from CDN
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    onProgress?.(25, "FFmpeg ist bereit");

    return ffmpeg;
  })();

  return loadPromise;
}

/**
 * Check if FFmpeg.wasm is supported in the current browser
 */
export function isFFmpegWasmSupported(): boolean {
  if (typeof window === "undefined") return false;

  // Check for SharedArrayBuffer support (required for multi-threading)
  // Note: FFmpeg.wasm also works without SharedArrayBuffer but slower
  const hasWebAssembly = typeof WebAssembly !== "undefined";

  return hasWebAssembly;
}

/**
 * Convert hex color to ASS color format (BGR with alpha)
 */
function hexToAssColor(hex: string, alpha: number = 0): string {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // ASS format is &HAABBGGRR (alpha, blue, green, red)
  const alphaHex = alpha.toString(16).padStart(2, "0").toUpperCase();
  const blueHex = b.toString(16).padStart(2, "0").toUpperCase();
  const greenHex = g.toString(16).padStart(2, "0").toUpperCase();
  const redHex = r.toString(16).padStart(2, "0").toUpperCase();

  return `&H${alphaHex}${blueHex}${greenHex}${redHex}`;
}

/**
 * Build ASS subtitle style string
 */
function buildAssStyle(style: SubtitleStyle): string {
  const primaryColor = hexToAssColor(style.primaryColor);
  const outlineColor = hexToAssColor(style.outlineColor);
  const shadowColor = style.shadow ? hexToAssColor("#000000", 128) : hexToAssColor("#000000", 255);

  // Position: 2 = bottom center, 8 = top center, 5 = center
  let alignment = 2;
  if (style.position === "top") alignment = 8;
  if (style.position === "center") alignment = 5;

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontName},${style.fontSize * 2},${primaryColor},${primaryColor},${outlineColor},${shadowColor},0,0,0,0,100,100,0,0,1,${style.outlineWidth},${style.shadow ? 2 : 0},${alignment},50,50,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

/**
 * Convert SRT to ASS format
 */
function srtToAss(srtContent: string, style: SubtitleStyle): string {
  const assHeader = buildAssStyle(style);
  const events: string[] = [];

  // Parse SRT content
  const blocks = srtContent.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    // Parse timestamp line (e.g., "00:00:01,000 --> 00:00:04,000")
    const timestampMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );

    if (!timestampMatch) continue;

    // Convert to ASS timestamp format (H:MM:SS.cc)
    const startTime = `${parseInt(timestampMatch[1])}:${timestampMatch[2]}:${timestampMatch[3]}.${timestampMatch[4].substring(0, 2)}`;
    const endTime = `${parseInt(timestampMatch[5])}:${timestampMatch[6]}:${timestampMatch[7]}.${timestampMatch[8].substring(0, 2)}`;

    // Get text (join remaining lines)
    const text = lines
      .slice(2)
      .join("\\N")
      .replace(/<[^>]+>/g, ""); // Remove HTML tags

    events.push(`Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}`);
  }

  return assHeader + events.join("\n");
}

/**
 * Burn subtitles into video using FFmpeg.wasm
 */
export async function burnSubtitles(
  options: BurnSubtitlesOptions
): Promise<BurnSubtitlesResult> {
  const { videoFile, srtContent, style, onProgress } = options;

  onProgress?.(0, "Starte Verarbeitung im Browser...");

  // Load FFmpeg
  const ffmpegInstance = await loadFFmpeg(onProgress);

  onProgress?.(25, "Dateien werden vorbereitet...");

  // Determine input file extension
  const inputExt = videoFile.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputFilename = `input.${inputExt}`;
  const subtitleFilename = "subtitles.ass";
  const outputFilename = "output.mp4";

  // Convert SRT to ASS format for better styling
  const assContent = srtToAss(srtContent, style);

  // Write files to FFmpeg virtual filesystem
  const videoData = await fetchFile(videoFile);
  await ffmpegInstance.writeFile(inputFilename, videoData);
  await ffmpegInstance.writeFile(subtitleFilename, assContent);

  onProgress?.(30, "Video wird verarbeitet...");

  // Build FFmpeg command
  // Using libass for subtitle burning with ASS format
  const ffmpegArgs = [
    "-i",
    inputFilename,
    "-vf",
    `ass=${subtitleFilename}`,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputFilename,
  ];

  // Execute FFmpeg
  await ffmpegInstance.exec(ffmpegArgs);

  onProgress?.(90, "Video wird exportiert...");

  // Read output file
  const outputData = await ffmpegInstance.readFile(outputFilename);

  // Clean up
  await ffmpegInstance.deleteFile(inputFilename);
  await ffmpegInstance.deleteFile(subtitleFilename);
  await ffmpegInstance.deleteFile(outputFilename);

  // Create blob - copy data to a new ArrayBuffer to avoid SharedArrayBuffer issues
  let uint8Array: Uint8Array;
  if (outputData instanceof Uint8Array) {
    // Create a copy in a regular ArrayBuffer
    uint8Array = new Uint8Array(outputData.length);
    uint8Array.set(outputData);
  } else {
    uint8Array = new TextEncoder().encode(outputData);
  }
  const blob = new Blob([uint8Array.buffer as ArrayBuffer], { type: "video/mp4" });
  const filename = videoFile.name.replace(/\.[^/.]+$/, "_untertitelt.mp4");

  onProgress?.(100, "Fertig!");

  return { blob, filename };
}

/**
 * Download the result blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

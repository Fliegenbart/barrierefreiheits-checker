/**
 * Video/Audio Transkriptions-API
 *
 * Verwendet OpenAI Whisper API für Spracherkennung
 * Unterstützt Deutsch und andere Sprachen
 */

import { NextRequest, NextResponse } from "next/server";

// Erlaubte Dateitypen
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
  "audio/x-m4a",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
];

const ALLOWED_TYPES = [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (OpenAI Whisper API Limit)

interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResponse {
  subtitles: Subtitle[];
  language: string;
  duration: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "de";

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Validierung
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei ist zu groß. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
        { status: 400 }
      );
    }

    const isAllowedType = ALLOWED_TYPES.some(
      (type) => file.type === type || file.type.startsWith(type.split("/")[0])
    );

    if (!isAllowedType && !file.name.match(/\.(mp3|mp4|wav|ogg|webm|m4a|flac|mov|avi)$/i)) {
      return NextResponse.json(
        { error: "Ungültiges Format. Erlaubt sind Audio- und Video-Dateien." },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      // Demo-Modus ohne API-Key
      return NextResponse.json(getDemoResponse(file, language));
    }

    // OpenAI Whisper API aufrufen
    const audioFormData = new FormData();
    audioFormData.append("file", file);
    audioFormData.append("model", "whisper-1");
    audioFormData.append("language", language);
    audioFormData.append("response_format", "verbose_json");
    audioFormData.append("timestamp_granularities[]", "segment");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: audioFormData,
      }
    );

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json().catch(() => ({}));
      console.error("Whisper API Fehler:", errorData);

      if (whisperResponse.status === 401) {
        return NextResponse.json(
          { error: "Ungültiger API-Schlüssel." },
          { status: 500 }
        );
      }

      // Check for file size error from OpenAI
      if (whisperResponse.status === 413 || errorData?.error?.message?.includes("Maximum content size limit")) {
        return NextResponse.json(
          { error: "Die Datei ist zu groß für die Transkription. Bitte verwenden Sie eine Datei unter 25 MB oder komprimieren Sie das Video." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Fehler bei der Transkription. Bitte versuchen Sie es später erneut." },
        { status: 500 }
      );
    }

    const data = await whisperResponse.json();

    // Segmente in Untertitel-Format konvertieren
    const rawSubtitles: Subtitle[] = (data.segments || []).map(
      (segment: { id: number; start: number; end: number; text: string }, index: number) => ({
        id: index + 1,
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
      })
    );

    // Falls keine Segmente, aber Text vorhanden
    if (rawSubtitles.length === 0 && data.text) {
      rawSubtitles.push({
        id: 1,
        start: 0,
        end: data.duration || 60,
        text: data.text.trim(),
      });
    }

    // Split long subtitles into smaller segments (max 80 chars, ~2 lines)
    const subtitles = splitLongSubtitles(rawSubtitles, {
      maxChars: 80,
      maxWords: 12,
    });

    const response: TranscriptionResponse = {
      subtitles,
      language: data.language || language,
      duration: data.duration || estimateDuration(subtitles),
      confidence: calculateConfidence(data),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transkription Fehler:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}

function estimateDuration(subtitles: Subtitle[]): number {
  if (subtitles.length === 0) return 0;
  return Math.max(...subtitles.map((s) => s.end));
}

function calculateConfidence(data: { segments?: Array<{ avg_logprob?: number }> }): number {
  if (!data.segments || data.segments.length === 0) return 0.8;

  // Durchschnittliche Log-Wahrscheinlichkeit in Konfidenz umrechnen
  const avgLogProb =
    data.segments.reduce(
      (sum: number, seg: { avg_logprob?: number }) => sum + (seg.avg_logprob || -0.5),
      0
    ) / data.segments.length;

  // Log-Prob ist negativ, typisch zwischen -0.1 (sehr gut) und -1.0 (schlecht)
  const confidence = Math.max(0, Math.min(1, 1 + avgLogProb));
  return Math.round(confidence * 100) / 100;
}

interface SplitOptions {
  maxChars: number;
  maxWords: number;
}

/**
 * Split long subtitles into smaller segments for better readability
 * Respects sentence boundaries and natural breaks where possible
 */
function splitLongSubtitles(subtitles: Subtitle[], options: SplitOptions): Subtitle[] {
  const result: Subtitle[] = [];
  let currentId = 1;

  for (const subtitle of subtitles) {
    const text = subtitle.text.trim();
    const wordCount = text.split(/\s+/).length;

    // Check if splitting is needed
    if (text.length <= options.maxChars && wordCount <= options.maxWords) {
      result.push({ ...subtitle, id: currentId++ });
      continue;
    }

    // Split the subtitle
    const segments = splitTextIntoSegments(text, options);
    const duration = subtitle.end - subtitle.start;
    const segmentDuration = duration / segments.length;

    for (let i = 0; i < segments.length; i++) {
      result.push({
        id: currentId++,
        start: subtitle.start + i * segmentDuration,
        end: subtitle.start + (i + 1) * segmentDuration,
        text: segments[i],
      });
    }
  }

  return result;
}

/**
 * Split text into segments respecting natural boundaries
 */
function splitTextIntoSegments(text: string, options: SplitOptions): string[] {
  const segments: string[] = [];

  // First, try to split by sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentSegment = "";

  for (const sentence of sentences) {
    const potentialSegment = currentSegment
      ? `${currentSegment} ${sentence}`
      : sentence;
    const wordCount = potentialSegment.split(/\s+/).length;

    if (
      potentialSegment.length <= options.maxChars &&
      wordCount <= options.maxWords
    ) {
      currentSegment = potentialSegment;
    } else {
      // Current segment is full, save it and start new
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }

      // Check if this sentence itself needs to be split
      if (
        sentence.length > options.maxChars ||
        sentence.split(/\s+/).length > options.maxWords
      ) {
        // Split by commas or word boundaries
        const subSegments = splitBySeparators(sentence, options);
        segments.push(...subSegments);
        currentSegment = "";
      } else {
        currentSegment = sentence;
      }
    }
  }

  // Don't forget the last segment
  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments.length > 0 ? segments : [text];
}

/**
 * Split text by commas or word boundaries
 */
function splitBySeparators(text: string, options: SplitOptions): string[] {
  const segments: string[] = [];

  // Try to split by comma or natural breaks
  const parts = text.split(/,\s*|;\s*|\s+–\s+|\s+-\s+/);

  let currentSegment = "";

  for (const part of parts) {
    const potentialSegment = currentSegment
      ? `${currentSegment}, ${part}`
      : part;
    const wordCount = potentialSegment.split(/\s+/).length;

    if (
      potentialSegment.length <= options.maxChars &&
      wordCount <= options.maxWords
    ) {
      currentSegment = potentialSegment;
    } else {
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }

      // If even this part is too long, split by words
      if (
        part.length > options.maxChars ||
        part.split(/\s+/).length > options.maxWords
      ) {
        const wordSegments = splitByWords(part, options);
        segments.push(...wordSegments);
        currentSegment = "";
      } else {
        currentSegment = part;
      }
    }
  }

  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments;
}

/**
 * Split text by words as a last resort
 */
function splitByWords(text: string, options: SplitOptions): string[] {
  const segments: string[] = [];
  const words = text.split(/\s+/);
  let currentSegment = "";

  for (const word of words) {
    const potentialSegment = currentSegment
      ? `${currentSegment} ${word}`
      : word;
    const wordCount = potentialSegment.split(/\s+/).length;

    if (
      potentialSegment.length <= options.maxChars &&
      wordCount <= options.maxWords
    ) {
      currentSegment = potentialSegment;
    } else {
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }
      currentSegment = word;
    }
  }

  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments;
}

function getDemoResponse(
  file: File,
  language: string
): TranscriptionResponse & { demo: boolean; message: string } {
  // Demo-Untertitel basierend auf Dateinamen generieren
  const fileName = file.name.replace(/\.[^/.]+$/, "");

  const demoSubtitles: Subtitle[] = [
    {
      id: 1,
      start: 0,
      end: 3.5,
      text: "[Demo-Modus] Willkommen zu diesem Video.",
    },
    {
      id: 2,
      start: 3.5,
      end: 7.2,
      text: `Die Datei "${fileName}" wurde erkannt.`,
    },
    {
      id: 3,
      start: 7.2,
      end: 12.0,
      text: "Für echte Transkription setzen Sie bitte den OPENAI_API_KEY.",
    },
    {
      id: 4,
      start: 12.0,
      end: 16.5,
      text: "Die Whisper API unterstützt über 50 Sprachen.",
    },
    {
      id: 5,
      start: 16.5,
      end: 21.0,
      text: "Deutsche Spracherkennung funktioniert besonders gut.",
    },
    {
      id: 6,
      start: 21.0,
      end: 25.5,
      text: "Sie können die Untertitel nach der Erstellung bearbeiten.",
    },
    {
      id: 7,
      start: 25.5,
      end: 30.0,
      text: "Export ist in SRT, VTT und TTML möglich.",
    },
  ];

  return {
    subtitles: demoSubtitles,
    language: language,
    duration: 30,
    confidence: 0.95,
    demo: true,
    message:
      "Demo-Modus: Bitte OPENAI_API_KEY in .env.local setzen für echte Transkription",
  };
}

import { NextRequest, NextResponse } from "next/server";

// Erlaubte Bildtypen
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Maximale Dateigröße (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const context = formData.get("context") as string | null;

    if (!image) {
      return NextResponse.json(
        { error: "Kein Bild hochgeladen" },
        { status: 400 }
      );
    }

    // Validierung
    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: "Ungültiges Bildformat. Erlaubt sind: JPG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Das Bild ist zu groß. Maximale Größe: 10 MB" },
        { status: 400 }
      );
    }

    // Bild in Base64 konvertieren
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = image.type;

    // OpenAI API Key prüfen
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Fallback: Demo-Modus ohne API-Key
      return NextResponse.json({
        short: "Beispiel: Diagramm zeigt Barrierefreiheits-Anforderungen nach WCAG 2.1",
        detailed: "Beispiel: Das Diagramm illustriert die verschiedenen Anforderungsstufen der WCAG 2.1 Richtlinien (A, AA, AAA) und deren Anwendungsbereiche in der Webentwicklung. Die Grafik verwendet kontraststarke Farben und klare Beschriftungen.",
        context: context || undefined,
        demo: true,
        message: "Demo-Modus: Bitte OPENAI_API_KEY in .env.local setzen für echte KI-Analyse",
      });
    }

    // OpenAI API aufrufen (GPT-4o mit Vision)
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                },
              },
              {
                type: "text",
                text: buildPrompt(context),
              },
            ],
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("OpenAI API Fehler:", errorData);

      if (openaiResponse.status === 401) {
        return NextResponse.json(
          { error: "Ungültiger API-Schlüssel. Bitte prüfen Sie Ihre Konfiguration." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Fehler bei der Bildanalyse. Bitte versuchen Sie es später erneut." },
        { status: 500 }
      );
    }

    const data = await openaiResponse.json();
    const responseText = data.choices?.[0]?.message?.content || "";

    // Antwort parsen
    const result = parseAltTextResponse(responseText);

    return NextResponse.json({
      short: result.short,
      detailed: result.detailed,
      context: context || undefined,
    });
  } catch (error) {
    console.error("Alt-Text Generierung Fehler:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }
}

function buildPrompt(context?: string | null): string {
  let prompt = `Du bist ein Experte für barrierefreie Webinhalte. Analysiere dieses Bild und erstelle Alt-Texte auf Deutsch, die den WCAG 2.1 Richtlinien entsprechen.

WICHTIGE REGELN FÜR PERSONEN:
- Identifiziere NIEMALS spezifische Individuen, auch wenn du glaubst sie zu erkennen
- Beschreibe Personen IMMER allgemein (z.B. "eine Person", "eine Frau", "ein Mann", "eine Gruppe von Menschen")
- Verwende keine Namen von Personen
- Beschreibe nur allgemeine, sichtbare Merkmale wie Kleidung, Handlungen oder Körperhaltung
- Bei Porträts: beschreibe die Art des Fotos (z.B. "Porträtfoto einer Person im Business-Outfit")

Erstelle zwei Versionen:

1. KURZ (maximal 125 Zeichen):
- Prägnant und informativ
- Beschreibt Inhalt und Zweck
- Beginne NICHT mit "Bild von" oder "Foto von"
- Kein Punkt am Ende

2. AUSFÜHRLICH (150-300 Zeichen):
- Detailliertere Beschreibung für komplexe Bilder
- Beschreibe wichtige visuelle Elemente
- Erwähne Text im Bild vollständig
- Beschreibe Farben nur wenn sie bedeutungstragend sind

`;

  if (context) {
    prompt += `\nKONTEXT: Das Bild wird in folgendem Zusammenhang verwendet: "${context}"\nBerücksichtige diesen Kontext bei der Beschreibung.\n`;
  }

  prompt += `
Antworte EXAKT in diesem Format:
KURZ: [Dein kurzer Alt-Text hier]
AUSFÜHRLICH: [Deine ausführliche Beschreibung hier]`;

  return prompt;
}

interface ParsedAltText {
  short: string;
  detailed: string;
}

function parseAltTextResponse(text: string): ParsedAltText {
  // Versuche das erwartete Format zu parsen
  // Ersetze Zeilenumbrüche für einfacheres Matching
  const normalizedText = text.replace(/\n/g, " ");
  const shortMatch = normalizedText.match(/KURZ:\s*(.+?)(?=AUSFÜHRLICH:|$)/);
  const detailedMatch = normalizedText.match(/AUSFÜHRLICH:\s*(.+?)$/);

  let short = shortMatch?.[1]?.trim() || "";
  let detailed = detailedMatch?.[1]?.trim() || "";

  // Fallback: Wenn das Format nicht erkannt wurde
  if (!short && !detailed) {
    // Teile den Text in zwei Hälften
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length >= 2) {
      short = sentences[0].trim();
      detailed = sentences.slice(0, 3).join(". ").trim();
    } else {
      short = text.substring(0, 125).trim();
      detailed = text.trim();
    }
  }

  // Bereinigung
  short = short.replace(/^["']|["']$/g, "").trim();
  detailed = detailed.replace(/^["']|["']$/g, "").trim();

  // Kürzen wenn nötig
  if (short.length > 125) {
    short = short.substring(0, 122).trim() + "...";
  }

  // Punkt am Ende des kurzen Texts entfernen
  short = short.replace(/\.$/, "");

  return { short, detailed };
}

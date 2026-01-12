/**
 * Leichte Sprache Konvertierungs-API
 *
 * Wandelt komplexe Texte in Leichte oder Einfache Sprache um
 * unter Verwendung der OpenAI API (GPT-4o).
 */

import { NextRequest, NextResponse } from "next/server";

interface ConversionRequest {
  text: string;
  targetLevel: "leicht" | "einfach";
}

interface TextStats {
  originalWordCount: number;
  simplifiedWordCount: number;
  originalSentenceCount: number;
  simplifiedSentenceCount: number;
  avgWordsPerSentenceOriginal: number;
  avgWordsPerSentenceSimplified: number;
  readabilityScore: number;
}

interface Explanation {
  term: string;
  explanation: string;
}

// Maximale Textlänge (10.000 Zeichen)
const MAX_TEXT_LENGTH = 10000;

export async function POST(request: NextRequest) {
  try {
    const body: ConversionRequest = await request.json();
    const { text, targetLevel = "leicht" } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Kein Text angegeben" },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error: `Text ist zu lang. Maximal ${MAX_TEXT_LENGTH} Zeichen erlaubt.`,
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Demo-Modus ohne API-Key
      return NextResponse.json(getDemoResponse(text, targetLevel));
    }

    // OpenAI API aufrufen
    const prompt = buildPrompt(text, targetLevel);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("OpenAI API Fehler:", errorData);

      if (openaiResponse.status === 401) {
        return NextResponse.json(
          { error: "Ungültiger API-Schlüssel." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Fehler bei der Textumwandlung. Bitte versuchen Sie es später erneut." },
        { status: 500 }
      );
    }

    const data = await openaiResponse.json();
    const responseText = data.choices?.[0]?.message?.content || "";

    // Antwort parsen
    const result = parseResponse(responseText, text, targetLevel);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Leichte Sprache Fehler:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}

function buildPrompt(text: string, targetLevel: "leicht" | "einfach"): string {
  const levelDescription =
    targetLevel === "leicht"
      ? `Leichte Sprache nach DIN SPEC 33429:
- Maximal 8-12 Wörter pro Satz
- Ein Gedanke pro Satz
- Nur bekannte, einfache Wörter
- Keine Fremdwörter (oder erklärt)
- Keine Abkürzungen (oder erklärt)
- Keine Redewendungen
- Aktive Satzstellung (kein Passiv)
- Keine Konjunktiv-Formen
- Keine Verneinungen wenn möglich
- Jeder Satz auf einer neuen Zeile
- Trennstriche bei langen Wörtern (z.B. "Bundes-Regierung")`
      : `Einfache Sprache (B1-Niveau):
- Kurze, klare Sätze (max. 15 Wörter)
- Geläufige Wörter bevorzugen
- Fremdwörter erklären wenn nötig
- Aktive Satzstellung bevorzugen
- Klare Struktur mit Absätzen`;

  return `Du bist ein Experte für ${targetLevel === "leicht" ? "Leichte" : "Einfache"} Sprache. Wandle den folgenden Text um.

REGELN:
${levelDescription}

AUSGANGSTEXT:
"""
${text}
"""

ANTWORT im folgenden Format:

VEREINFACHTER_TEXT:
[Hier der umgewandelte Text]

ERKLAERUNGEN:
[Falls du Begriffe erklären musstest, liste sie hier auf im Format:]
Begriff: Erklärung
Begriff2: Erklärung2

HINWEISE:
[Falls es Probleme oder wichtige Hinweise gibt, liste sie hier auf]`;
}

function parseResponse(
  responseText: string,
  originalText: string,
  targetLevel: "leicht" | "einfach"
): {
  originalText: string;
  simplifiedText: string;
  explanations: Explanation[];
  stats: TextStats;
  warnings: string[];
} {
  // Text extrahieren
  const textMatch = responseText.match(
    /VEREINFACHTER_TEXT:\s*([\s\S]*?)(?=ERKLAERUNGEN:|HINWEISE:|$)/i
  );
  const simplifiedText = textMatch?.[1]?.trim() || responseText.trim();

  // Erklärungen extrahieren
  const explanations: Explanation[] = [];
  const explMatch = responseText.match(
    /ERKLAERUNGEN:\s*([\s\S]*?)(?=HINWEISE:|$)/i
  );
  if (explMatch) {
    const explLines = explMatch[1].split("\n").filter((l) => l.trim());
    for (const line of explLines) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        explanations.push({
          term: parts[0].trim(),
          explanation: parts.slice(1).join(":").trim(),
        });
      }
    }
  }

  // Hinweise extrahieren
  const warnings: string[] = [];
  const hinweisMatch = responseText.match(/HINWEISE:\s*([\s\S]*?)$/i);
  if (hinweisMatch) {
    const hinweisLines = hinweisMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("-") || l.length > 3);
    warnings.push(...hinweisLines.filter((l) => l.length > 5));
  }

  // Statistiken berechnen
  const stats = calculateStats(originalText, simplifiedText);

  return {
    originalText,
    simplifiedText,
    explanations,
    stats,
    warnings: warnings.slice(0, 5), // Max 5 Hinweise
  };
}

function calculateStats(original: string, simplified: string): TextStats {
  const countWords = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  const countSentences = (text: string) =>
    text.split(/[.!?]+/).filter((s) => s.trim()).length;

  const originalWords = countWords(original);
  const simplifiedWords = countWords(simplified);
  const originalSentences = countSentences(original);
  const simplifiedSentences = countSentences(simplified);

  const avgOriginal =
    originalSentences > 0 ? originalWords / originalSentences : 0;
  const avgSimplified =
    simplifiedSentences > 0 ? simplifiedWords / simplifiedSentences : 0;

  // Einfacher Lesbarkeits-Score
  // Basiert auf durchschnittlicher Satzlänge (ideal: <= 10 Wörter)
  let readabilityScore = 100;

  // Abzug für lange Sätze
  if (avgSimplified > 10) {
    readabilityScore -= (avgSimplified - 10) * 5;
  }

  // Bonus für kurze Sätze
  if (avgSimplified <= 8) {
    readabilityScore = Math.min(100, readabilityScore + 10);
  }

  // Prüfe auf lange Wörter (über 3 Silben)
  const longWords = simplified
    .split(/\s+/)
    .filter((w) => countSyllables(w) > 3).length;
  const longWordRatio = longWords / Math.max(1, simplifiedWords);
  readabilityScore -= longWordRatio * 50;

  return {
    originalWordCount: originalWords,
    simplifiedWordCount: simplifiedWords,
    originalSentenceCount: originalSentences,
    simplifiedSentenceCount: simplifiedSentences,
    avgWordsPerSentenceOriginal: Math.round(avgOriginal * 10) / 10,
    avgWordsPerSentenceSimplified: Math.round(avgSimplified * 10) / 10,
    readabilityScore: Math.max(0, Math.min(100, Math.round(readabilityScore))),
  };
}

function countSyllables(word: string): number {
  // Vereinfachte Silbenzählung für deutsche Wörter
  const cleaned = word.toLowerCase().replace(/[^a-zäöüß]/g, "");
  if (!cleaned) return 0;

  // Zähle Vokale als Annäherung
  const vowels = cleaned.match(/[aeiouäöü]/gi);
  let count = vowels ? vowels.length : 1;

  // Diphthonge reduzieren
  const diphthongs = cleaned.match(/[aeiouäöü]{2}/gi);
  if (diphthongs) count -= diphthongs.length * 0.5;

  return Math.max(1, Math.round(count));
}

function getDemoResponse(
  text: string,
  targetLevel: "leicht" | "einfach"
): {
  originalText: string;
  simplifiedText: string;
  explanations: Explanation[];
  stats: TextStats;
  warnings: string[];
  demo: boolean;
  message: string;
} {
  // Einfache Demo-Transformation
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  const simplified = sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(".\n") + ".";

  return {
    originalText: text,
    simplifiedText:
      targetLevel === "leicht"
        ? `[Demo-Modus]\n\nDer Text wurde vereinfacht.\nJeder Satz steht auf einer eigenen Zeile.\n\n${simplified}`
        : `[Demo-Modus]\n\n${simplified}`,
    explanations: [
      {
        term: "Demo-Modus",
        explanation:
          "Die echte KI-Umwandlung ist nicht verfügbar. Bitte OPENAI_API_KEY setzen.",
      },
    ],
    stats: calculateStats(text, simplified),
    warnings: [
      "Demo-Modus aktiv: Keine echte KI-Umwandlung",
      "Bitte OPENAI_API_KEY in .env.local setzen",
    ],
    demo: true,
    message:
      "Demo-Modus: Bitte OPENAI_API_KEY in .env.local setzen für echte KI-Umwandlung",
  };
}

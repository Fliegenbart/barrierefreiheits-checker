/**
 * AI Status API
 *
 * Prüft die Verfügbarkeit der AI-Services (Ollama, OpenAI, Anthropic)
 */

import { NextResponse } from "next/server";
import { checkOllamaCapabilities } from "@/lib/ai/ollama-service";

interface AIStatus {
  ollama: {
    available: boolean;
    textModel: boolean;
    visionModel: boolean;
    models: string[];
    endpoint: string;
  };
  openai: {
    available: boolean;
    whisper: boolean;
  };
  anthropic: {
    available: boolean;
  };
  recommendations: string[];
}

export async function GET() {
  const status: AIStatus = {
    ollama: {
      available: false,
      textModel: false,
      visionModel: false,
      models: [],
      endpoint: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    },
    openai: {
      available: !!process.env.OPENAI_API_KEY,
      whisper: !!process.env.OPENAI_API_KEY,
    },
    anthropic: {
      available: !!process.env.ANTHROPIC_API_KEY,
    },
    recommendations: [],
  };

  // Ollama-Status prüfen
  try {
    const ollamaStatus = await checkOllamaCapabilities();
    status.ollama = {
      ...status.ollama,
      ...ollamaStatus,
    };
  } catch (error) {
    console.error("Ollama Status-Prüfung fehlgeschlagen:", error);
  }

  // Empfehlungen generieren
  if (!status.ollama.available) {
    status.recommendations.push(
      "Ollama ist nicht erreichbar. Starten Sie Ollama mit 'ollama serve' für lokale AI-Features."
    );
  } else {
    if (!status.ollama.textModel) {
      status.recommendations.push(
        "Kein Text-Modell gefunden. Installieren Sie eines mit: ollama pull llama3.2"
      );
    }
    if (!status.ollama.visionModel) {
      status.recommendations.push(
        "Kein Vision-Modell gefunden. Für Bild-Alt-Texte: ollama pull llava"
      );
    }
  }

  if (!status.openai.available) {
    status.recommendations.push(
      "OpenAI API-Key fehlt. Für Video-Transkription setzen Sie OPENAI_API_KEY in .env.local"
    );
  }

  if (!status.anthropic.available) {
    status.recommendations.push(
      "Anthropic API-Key fehlt. Für Leichte Sprache ohne Ollama setzen Sie ANTHROPIC_API_KEY"
    );
  }

  return NextResponse.json(status);
}

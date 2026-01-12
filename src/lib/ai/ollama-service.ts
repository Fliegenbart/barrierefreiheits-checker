/**
 * Ollama AI Service für lokale LLM-Integration
 *
 * Unterstützt:
 * - Text-Generierung (Titel, Zusammenfassungen)
 * - Vision-Modelle für Bildbeschreibungen (LLaVA, Bakllava)
 * - Streaming-Responses
 */

export interface OllamaConfig {
  baseUrl: string;
  apiKey?: string;
  textModel: string;
  visionModel: string;
  timeout: number;
}

export interface GenerateOptions {
  prompt: string;
  system?: string;
  images?: string[]; // Base64-encoded images
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface GenerateResponse {
  text: string;
  model: string;
  totalDuration?: number;
  promptTokens?: number;
  responseTokens?: number;
}

// Default configuration
const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  apiKey: process.env.OLLAMA_API_KEY,
  textModel: process.env.OLLAMA_TEXT_MODEL || "llama3.2",
  visionModel: process.env.OLLAMA_VISION_MODEL || "llava",
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || "120000"),
};

export class OllamaService {
  private config: OllamaConfig;
  private available: boolean | null = null;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Erstellt Header mit optionaler API-Key-Authentifizierung
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  /**
   * Prüft ob Ollama erreichbar ist
   */
  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      this.available = response.ok;
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  /**
   * Listet verfügbare Modelle auf
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];

      const data = await response.json();
      return (data.models || []).map((m: { name: string }) => m.name);
    } catch {
      return [];
    }
  }

  /**
   * Prüft ob ein bestimmtes Modell verfügbar ist
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some((m) => m.includes(modelName));
  }

  /**
   * Generiert Text mit dem Text-Modell
   */
  async generateText(options: GenerateOptions): Promise<GenerateResponse> {
    return this.generate(this.config.textModel, options);
  }

  /**
   * Generiert Bildbeschreibung mit dem Vision-Modell
   * Optimiert für Barrierefreiheit und Screenreader-Nutzung
   */
  async describeImage(
    imageBase64: string,
    prompt?: string
  ): Promise<GenerateResponse> {
    const defaultPrompt = `Du bist ein Experte für barrierefreie Inhalte und erstellst Alt-Texte für blinde und sehbehinderte Menschen.

Beschreibe dieses Bild so, dass jemand der es nicht sehen kann, den vollständigen Inhalt und Kontext versteht.

WICHTIGE REGELN:
1. Beginne mit dem Hauptinhalt - was ist die zentrale Aussage oder das Thema?
2. Beschreibe alle Texte im Bild VOLLSTÄNDIG und wörtlich
3. Bei Diagrammen/Grafiken: Erkläre die Daten und Trends, nicht nur die Form
4. Bei Fotos: Beschreibe Personen, Handlungen und wichtige Objekte
5. Erwähne räumliche Beziehungen (oben, unten, links, rechts)
6. Nenne Zahlen, Prozentwerte und Statistiken exakt
7. Beschreibe Pfeile, Verbindungen und Abläufe in Prozessdiagrammen

FORMAT:
- Auf Deutsch
- 2-4 Sätze für einfache Bilder
- Bis zu 6 Sätze für komplexe Diagramme oder Infografiken
- Keine Einleitung wie "Das Bild zeigt..."

Antworte nur mit der Beschreibung.`;

    return this.generate(this.config.visionModel, {
      prompt: prompt || defaultPrompt,
      images: [imageBase64],
      temperature: 0.3,
    });
  }

  /**
   * Generiert einen Folientitel basierend auf dem Inhalt
   */
  async generateSlideTitle(slideContent: string): Promise<GenerateResponse> {
    const prompt = `Du bist ein Experte für barrierefreie Dokumente.
Erstelle einen kurzen, prägnanten Folientitel (maximal 8 Wörter) basierend auf diesem Folieninhalt:

---
${slideContent}
---

Der Titel soll:
- Den Hauptinhalt der Folie zusammenfassen
- Klar und verständlich sein
- Für die Navigation mit Screenreadern geeignet sein

Antworte NUR mit dem Titel, ohne Anführungszeichen oder zusätzliche Erklärungen.`;

    return this.generateText({
      prompt,
      system: "Du bist ein präziser Assistent für barrierefreie Dokumente.",
      temperature: 0.3,
      maxTokens: 50,
    });
  }

  /**
   * Generiert Alt-Text für ein Diagramm basierend auf Daten
   * Optimiert für blinde und sehbehinderte Nutzer
   */
  async generateChartAltText(
    chartType: string,
    dataDescription: string
  ): Promise<GenerateResponse> {
    const prompt = `Du bist ein Experte für barrierefreie Dokumente und hilfst blinden und sehbehinderten Menschen, Diagramme zu verstehen.

Erstelle einen umfassenden Alternativtext für ein ${chartType}-Diagramm.

Daten und Kontext:
${dataDescription}

WICHTIGE REGELN für den Alt-Text:
1. Beginne mit dem Diagrammtyp und dem Hauptthema
2. Nenne ALLE konkreten Zahlen, Werte und Prozentzahlen
3. Beschreibe Trends klar (steigt, fällt, bleibt konstant)
4. Bei Vergleichen: Nenne den Unterschied in Zahlen
5. Erwähne die Achsenbeschriftungen und Einheiten
6. Bei Legenden: Liste alle Kategorien auf
7. Fasse die Hauptaussage am Ende zusammen

FORMAT:
- Auf Deutsch
- Strukturiert und logisch aufgebaut
- 3-6 Sätze, bei komplexen Diagrammen mehr
- Keine Einleitung wie "Dieses Diagramm zeigt..."

Antworte NUR mit dem Alt-Text.`;

    return this.generateText({
      prompt,
      system: "Du bist ein Experte für barrierefreie Dokumente und beschreibst visuelle Inhalte präzise für Screenreader-Nutzer.",
      temperature: 0.3,
      maxTokens: 300,
    });
  }

  /**
   * Prüft und korrigiert die Lesereihenfolge
   */
  async verifyReadingOrder(
    elements: Array<{ type: string; text: string; position: { x: number; y: number } }>
  ): Promise<{ correct: boolean; suggestedOrder?: number[]; explanation?: string }> {
    const elementsDescription = elements
      .map((e, i) => `${i + 1}. [${e.type}] "${e.text?.substring(0, 50) || "(leer)"}" (Position: x=${Math.round(e.position.x)}, y=${Math.round(e.position.y)})`)
      .join("\n");

    const prompt = `Du bist ein Experte für barrierefreie Dokumente und Lesereihenfolge.

Prüfe die folgende Elementliste einer Folie. Die aktuelle Reihenfolge ist die Lesereihenfolge.

Elemente:
${elementsDescription}

Ist diese Lesereihenfolge logisch und für Screenreader sinnvoll?
Falls nicht, welche Reihenfolge wäre besser?

Antworte im folgenden JSON-Format:
{
  "correct": true/false,
  "suggestedOrder": [1, 2, 3, ...] // nur wenn nicht korrekt
  "explanation": "Kurze Erklärung auf Deutsch"
}`;

    const response = await this.generateText({
      prompt,
      temperature: 0.1,
    });

    try {
      // JSON aus der Antwort extrahieren
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback
    }

    return { correct: true, explanation: "Konnte nicht analysiert werden" };
  }

  /**
   * Basis-Generierungsfunktion
   */
  private async generate(
    model: string,
    options: GenerateOptions
  ): Promise<GenerateResponse> {
    const body: Record<string, unknown> = {
      model,
      prompt: options.prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 1000,
      },
    };

    if (options.system) {
      body.system = options.system;
    }

    if (options.images && options.images.length > 0) {
      body.images = options.images;
    }

    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API Fehler: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      text: data.response?.trim() || "",
      model: data.model || model,
      totalDuration: data.total_duration,
      promptTokens: data.prompt_eval_count,
      responseTokens: data.eval_count,
    };
  }

  /**
   * Streaming-Generierung
   */
  async *generateStream(
    options: GenerateOptions
  ): AsyncGenerator<string, void, unknown> {
    const body = {
      model: this.config.textModel,
      prompt: options.prompt,
      stream: true,
      system: options.system,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 1000,
      },
    };

    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama API Fehler: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              yield json.response;
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Singleton-Instanz
let ollamaInstance: OllamaService | null = null;

export function getOllamaService(config?: Partial<OllamaConfig>): OllamaService {
  if (!ollamaInstance || config) {
    ollamaInstance = new OllamaService(config);
  }
  return ollamaInstance;
}

/**
 * Hilfsfunktion: Prüft ob Ollama-Features aktiviert werden können
 */
export async function checkOllamaCapabilities(): Promise<{
  available: boolean;
  textModel: boolean;
  visionModel: boolean;
  models: string[];
}> {
  const service = getOllamaService();

  const available = await service.isAvailable();
  if (!available) {
    return { available: false, textModel: false, visionModel: false, models: [] };
  }

  const models = await service.listModels();
  const textModel = models.some(
    (m) =>
      m.includes("llama") ||
      m.includes("mistral") ||
      m.includes("mixtral") ||
      m.includes("gemma") ||
      m.includes("phi")
  );
  const visionModel = models.some(
    (m) =>
      m.includes("llava") ||
      m.includes("bakllava") ||
      m.includes("moondream") ||
      m.includes("cogvlm")
  );

  return { available, textModel, visionModel, models };
}

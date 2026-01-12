/**
 * AI Enhancer für PPTX-Konvertierung
 *
 * Nutzt Ollama für:
 * - Automatische Alt-Text-Generierung für Bilder
 * - Folientitel-Generierung
 * - Lesereihenfolge-Optimierung
 */

import { OllamaService, getOllamaService } from "../ai/ollama-service";
import { Presentation, Slide, SlideElement, AccessibilityIssue } from "./types";

export interface EnhancementOptions {
  generateAltTexts: boolean;
  generateSlideTitles: boolean;
  verifyReadingOrder: boolean;
  analyzeContentStructure: boolean; // NEU: Inhaltliche Zusammenhänge analysieren
  maxImagesPerSlide?: number;
}

export interface EnhancementResult {
  presentation: Presentation;
  enhancements: Enhancement[];
  errors: string[];
  stats: {
    altTextsGenerated: number;
    titlesGenerated: number;
    readingOrderFixed: number;
    processingTimeMs: number;
  };
}

export interface Enhancement {
  type: "alt_text" | "title" | "reading_order";
  slideNumber: number;
  elementId?: string;
  originalValue?: string;
  newValue: string;
  confidence?: number;
}

export class PptxAiEnhancer {
  private ollama: OllamaService;
  private options: EnhancementOptions;

  constructor(options: Partial<EnhancementOptions> = {}) {
    this.ollama = getOllamaService();
    this.options = {
      generateAltTexts: options.generateAltTexts ?? true,
      generateSlideTitles: options.generateSlideTitles ?? true,
      verifyReadingOrder: options.verifyReadingOrder ?? false,
      analyzeContentStructure: options.analyzeContentStructure ?? true, // Standardmäßig aktiv
      maxImagesPerSlide: options.maxImagesPerSlide ?? 5,
    };
  }

  /**
   * Prüft ob AI-Enhancement verfügbar ist
   */
  async isAvailable(): Promise<{ available: boolean; features: string[] }> {
    const available = await this.ollama.isAvailable();
    if (!available) {
      return { available: false, features: [] };
    }

    const features: string[] = [];
    const models = await this.ollama.listModels();

    // Text-Features
    const hasTextModel = models.some(
      (m) =>
        m.includes("llama") ||
        m.includes("mistral") ||
        m.includes("mixtral") ||
        m.includes("gemma")
    );
    if (hasTextModel) {
      features.push("title_generation", "reading_order_verification");
    }

    // Vision-Features
    const hasVisionModel = models.some(
      (m) => m.includes("llava") || m.includes("bakllava") || m.includes("moondream")
    );
    if (hasVisionModel) {
      features.push("image_alt_text");
    }

    return { available: true, features };
  }

  /**
   * Verbessert eine Präsentation mit AI
   */
  async enhance(presentation: Presentation): Promise<EnhancementResult> {
    const startTime = Date.now();
    const enhancements: Enhancement[] = [];
    const errors: string[] = [];
    const stats = {
      altTextsGenerated: 0,
      titlesGenerated: 0,
      readingOrderFixed: 0,
      processingTimeMs: 0,
    };

    // Prüfen ob Ollama verfügbar
    const { available, features } = await this.isAvailable();
    if (!available) {
      return {
        presentation,
        enhancements: [],
        errors: ["Ollama ist nicht verfügbar. Starten Sie Ollama für AI-Features."],
        stats: { ...stats, processingTimeMs: Date.now() - startTime },
      };
    }

    // Folien verarbeiten
    for (const slide of presentation.slides) {
      try {
        // 1. Fehlende Alt-Texte generieren
        if (this.options.generateAltTexts && features.includes("image_alt_text")) {
          const altTextResults = await this.generateAltTexts(slide);
          enhancements.push(...altTextResults.enhancements);
          errors.push(...altTextResults.errors);
          stats.altTextsGenerated += altTextResults.enhancements.length;
        }

        // 2. Fehlende Titel generieren
        if (this.options.generateSlideTitles && features.includes("title_generation")) {
          const titleResult = await this.generateSlideTitle(slide);
          if (titleResult) {
            enhancements.push(titleResult);
            stats.titlesGenerated++;
          }
        }

        // 3. Lesereihenfolge prüfen (optional, kann langsam sein)
        if (this.options.verifyReadingOrder && features.includes("reading_order_verification")) {
          const orderResult = await this.verifyReadingOrder(slide);
          if (orderResult) {
            enhancements.push(orderResult);
            stats.readingOrderFixed++;
          }
        }

        // 4. Inhaltliche Struktur analysieren (NEU)
        if (this.options.analyzeContentStructure && features.includes("title_generation")) {
          const structureResult = await this.analyzeContentStructure(slide);
          if (structureResult) {
            enhancements.push(...structureResult);
          }
        }
      } catch (error) {
        console.error(`Fehler bei Folie ${slide.number}:`, error);
        errors.push(`Folie ${slide.number}: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`);
      }
    }

    stats.processingTimeMs = Date.now() - startTime;

    return {
      presentation,
      enhancements,
      errors,
      stats,
    };
  }

  /**
   * Generiert Alt-Texte für Bilder ohne Beschreibung
   */
  private async generateAltTexts(
    slide: Slide
  ): Promise<{ enhancements: Enhancement[]; errors: string[] }> {
    const enhancements: Enhancement[] = [];
    const errors: string[] = [];

    // Bilder ohne Alt-Text finden
    const imagesWithoutAlt = slide.elements.filter(
      (e) =>
        (e.type === "image" || e.type === "chart" || e.type === "smartart") &&
        !e.isDecorative &&
        (!e.content.altText || e.content.altText.trim() === "")
    );

    // Maximal N Bilder pro Folie verarbeiten
    const toProcess = imagesWithoutAlt.slice(0, this.options.maxImagesPerSlide);

    for (const element of toProcess) {
      try {
        // Prüfen ob Bilddaten verfügbar sind
        const imageData = (element as SlideElement & { imageData?: string }).imageData;

        if (!imageData) {
          // Kein Bild-Data, generiere generischen Alt-Text
          const altText = await this.generateGenericAltText(element);
          if (altText) {
            element.content.altText = altText;
            element.content.altTextStatus = "present";

            enhancements.push({
              type: "alt_text",
              slideNumber: slide.number,
              elementId: element.id,
              newValue: altText,
              confidence: 0.6,
            });

            // Issue als behoben markieren
            this.removeIssue(element, "missing_alt_text");
          }
        } else {
          // Bild mit Vision-Modell beschreiben
          const response = await this.ollama.describeImage(imageData);

          if (response.text) {
            element.content.altText = response.text;
            element.content.altTextStatus = "present";

            enhancements.push({
              type: "alt_text",
              slideNumber: slide.number,
              elementId: element.id,
              newValue: response.text,
              confidence: 0.9,
            });

            this.removeIssue(element, "missing_alt_text");
          }
        }
      } catch (error) {
        errors.push(
          `Bild ${element.id}: ${error instanceof Error ? error.message : "Alt-Text-Generierung fehlgeschlagen"}`
        );
      }
    }

    return { enhancements, errors };
  }

  /**
   * Generiert einen generischen Alt-Text basierend auf Kontext
   */
  private async generateGenericAltText(element: SlideElement): Promise<string | null> {
    const typeDescriptions: Record<string, string> = {
      image: "Bild",
      chart: "Diagramm",
      smartart: "SmartArt-Grafik",
    };

    const elementType = typeDescriptions[element.type] || "Grafisches Element";

    try {
      const response = await this.ollama.generateText({
        prompt: `Erstelle einen kurzen, beschreibenden Alternativtext (1-2 Sätze) für ein ${elementType} in einer Präsentation.

Der Alt-Text sollte:
- Auf Deutsch sein
- Beschreiben, was der Zweck dieses Elements sein könnte
- Für Screenreader geeignet sein

Antworte NUR mit dem Alt-Text, ohne Anführungszeichen.`,
        temperature: 0.5,
        maxTokens: 100,
      });

      return response.text || null;
    } catch {
      return `[${elementType} - Beschreibung fehlt]`;
    }
  }

  /**
   * Generiert einen Folientitel wenn keiner vorhanden ist
   */
  private async generateSlideTitle(slide: Slide): Promise<Enhancement | null> {
    // Prüfen ob Titel fehlt oder leer ist
    const titleElement = slide.elements.find((e) => e.type === "title");
    if (titleElement?.content.text?.trim()) {
      return null; // Titel existiert bereits
    }

    // Inhalt der Folie sammeln
    const contentTexts = slide.elements
      .filter((e) => e.type !== "title" && e.content.text)
      .map((e) => e.content.text)
      .join("\n");

    if (!contentTexts.trim()) {
      return null; // Keine Inhalte zum Analysieren
    }

    try {
      const response = await this.ollama.generateSlideTitle(contentTexts);

      if (response.text) {
        const generatedTitle = response.text.trim();

        // Titel zum Element hinzufügen oder neues Element erstellen
        if (titleElement) {
          titleElement.content.text = generatedTitle;
        } else {
          // Neues Titel-Element am Anfang einfügen
          const newTitle: SlideElement = {
            id: `generated-title-${slide.number}`,
            type: "title",
            semanticRole: "H1",
            position: { x: 50, y: 50, width: 700, height: 50, zOrder: 0 },
            content: {
              text: generatedTitle,
              altTextStatus: "present",
            },
            style: {},
            isDecorative: false,
            isGrouped: false,
            issues: [],
          };
          slide.elements.unshift(newTitle);
          slide.readingOrder.unshift(newTitle.id);
        }

        // Issue entfernen
        slide.issues = slide.issues.filter((i) => i.type !== "missing_title");

        return {
          type: "title",
          slideNumber: slide.number,
          newValue: generatedTitle,
          confidence: 0.8,
        };
      }
    } catch (error) {
      console.error(`Titel-Generierung für Folie ${slide.number} fehlgeschlagen:`, error);
    }

    return null;
  }

  /**
   * Prüft und korrigiert die Lesereihenfolge
   */
  private async verifyReadingOrder(slide: Slide): Promise<Enhancement | null> {
    if (slide.elements.length < 3) {
      return null; // Zu wenige Elemente
    }

    // Elemente für AI vorbereiten
    const elementsForAI = slide.elements.map((e) => ({
      type: e.type,
      text: e.content.text || "",
      position: e.position,
    }));

    try {
      const result = await this.ollama.verifyReadingOrder(elementsForAI);

      if (!result.correct && result.suggestedOrder) {
        // Lesereihenfolge aktualisieren
        const newOrder = result.suggestedOrder
          .map((i) => slide.elements[i - 1]?.id)
          .filter(Boolean) as string[];

        if (newOrder.length === slide.readingOrder.length) {
          const oldOrder = [...slide.readingOrder];
          slide.readingOrder = newOrder;
          slide.readingOrderConfidence = 0.9;

          return {
            type: "reading_order",
            slideNumber: slide.number,
            originalValue: oldOrder.join(", "),
            newValue: newOrder.join(", "),
            confidence: 0.85,
          };
        }
      }
    } catch (error) {
      console.error(`Lesereihenfolge-Prüfung für Folie ${slide.number} fehlgeschlagen:`, error);
    }

    return null;
  }

  /**
   * Entfernt ein Issue von einem Element
   */
  private removeIssue(element: SlideElement, issueType: AccessibilityIssue["type"]): void {
    element.issues = element.issues.filter((i) => i.type !== issueType);
  }

  /**
   * Analysiert die inhaltliche Struktur einer Folie
   * Erkennt Zusammenhänge zwischen Überschriften und Text
   */
  private async analyzeContentStructure(slide: Slide): Promise<Enhancement[]> {
    const enhancements: Enhancement[] = [];

    // Alle Textelemente sammeln (inkl. heller Schrift)
    const textElements = slide.elements.filter(
      (e) => e.content.text && e.content.text.trim().length > 0
    );

    if (textElements.length < 2) {
      return enhancements;
    }

    // Weiße/helle Schrift warnen und trotzdem extrahieren
    for (const element of textElements) {
      if (element.style?.isLightText) {
        console.log(`Folie ${slide.number}: Helle Schrift erkannt in Element ${element.id}: "${element.content.text?.substring(0, 50)}..."`);
      }
    }

    // Inhalt für KI-Analyse vorbereiten
    const slideContent = textElements.map((e, i) => ({
      index: i,
      id: e.id,
      type: e.type,
      text: e.content.text?.substring(0, 200) || "",
      isLightText: e.style?.isLightText || false,
      position: { x: Math.round(e.position.x), y: Math.round(e.position.y) },
    }));

    try {
      const prompt = `Du bist ein Experte für Dokumentenstruktur und Barrierefreiheit.

Analysiere diese Folieninhalte und bestimme die logische Struktur:

ELEMENTE:
${slideContent.map((e) => `[${e.index}] Typ: ${e.type}, Position: y=${e.position.y}, Text: "${e.text}"${e.isLightText ? " (ACHTUNG: helle/weiße Schrift!)" : ""}`).join("\n")}

AUFGABEN:
1. Welches Element ist die Hauptüberschrift?
2. Welche Texte gehören inhaltlich zusammen?
3. Was ist die logische Lesereihenfolge?
4. Gibt es Elemente mit heller Schrift, deren Text wichtig ist?

Antworte im JSON-Format:
{
  "mainTitle": <index oder null>,
  "structure": [
    { "heading": <index>, "content": [<indices>] }
  ],
  "readingOrder": [<indices in korrekter Reihenfolge>],
  "lightTextWarnings": ["<wichtige Texte mit heller Schrift>"],
  "suggestions": ["<Verbesserungsvorschläge auf Deutsch>"]
}`;

      const response = await this.ollama.generateText({
        prompt,
        system: "Du bist ein Experte für barrierefreie Dokumente. Antworte nur mit validem JSON.",
        temperature: 0.2,
        maxTokens: 500,
      });

      // JSON parsen
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);

        // Lesereihenfolge aktualisieren wenn sinnvoller
        if (analysis.readingOrder && Array.isArray(analysis.readingOrder)) {
          const newOrder = analysis.readingOrder
            .map((i: number) => slideContent[i]?.id)
            .filter(Boolean);

          if (newOrder.length === slide.readingOrder.length) {
            const oldOrder = [...slide.readingOrder];
            const orderChanged = !newOrder.every((id: string, i: number) => id === oldOrder[i]);

            if (orderChanged) {
              slide.readingOrder = newOrder;
              slide.readingOrderConfidence = 0.95;

              enhancements.push({
                type: "reading_order",
                slideNumber: slide.number,
                originalValue: "KI-optimierte Lesereihenfolge",
                newValue: analysis.suggestions?.join("; ") || "Struktur verbessert",
                confidence: 0.9,
              });
            }
          }
        }

        // Warnungen für helle Schrift hinzufügen
        if (analysis.lightTextWarnings && analysis.lightTextWarnings.length > 0) {
          for (const warning of analysis.lightTextWarnings) {
            console.log(`Folie ${slide.number}: Wichtiger Text mit heller Schrift: ${warning}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Struktur-Analyse für Folie ${slide.number} fehlgeschlagen:`, error);
    }

    return enhancements;
  }
}

/**
 * Hilfsfunktion für schnelle Nutzung
 */
export async function enhancePresentation(
  presentation: Presentation,
  options?: Partial<EnhancementOptions>
): Promise<EnhancementResult> {
  const enhancer = new PptxAiEnhancer(options);
  return enhancer.enhance(presentation);
}

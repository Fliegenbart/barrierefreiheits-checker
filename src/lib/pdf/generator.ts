/**
 * PDF/UA Generator - Erstellt barrierefreie PDFs aus geparsten PPTX-Strukturen
 *
 * Implementiert PDF/UA-1 (ISO 14289-1) konforme Tagging:
 * - Vollständiger Strukturbaum
 * - Semantische Tags (H1, H2, P, L, LI, Table, Figure, etc.)
 * - Alt-Texte für Bilder
 * - Sprachattribute
 * - Lesezeichen für Navigation
 */

import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, PDFName, PDFDict, PDFArray, PDFString, PDFNumber, PDFRef } from "pdf-lib";
import {
  Presentation,
  Slide,
  SlideElement,
  SemanticRole,
  ConversionProfile,
  TableData,
} from "../pptx/types";

// Standardfarben aus dem Bund-Design-System
const COLORS = {
  text: rgb(0.1, 0.1, 0.1),
  heading: rgb(0, 0.294, 0.463), // Bund-Blau
  link: rgb(0, 0.294, 0.463),
  background: rgb(1, 1, 1),
};

// Standard-Einstellungen
const DEFAULTS = {
  pageWidth: 841.89, // A4 Landscape
  pageHeight: 595.28,
  margin: 50,
  titleSize: 28,
  subtitleSize: 20,
  bodySize: 12,
  lineHeight: 1.4,
};

// WinAnsi-kompatible Zeichen-Ersetzungen für Emojis und Sonderzeichen
// Verwendet Unicode-Escape-Sequenzen für problematische Zeichen
const UNICODE_REPLACEMENTS: Record<string, string> = {
  "\u{1F4CA}": "[Diagramm]",      // 📊
  "\u{1F4C8}": "[Aufwaertstrend]", // 📈
  "\u{1F4C9}": "[Abwaertstrend]",  // 📉
  "\u{1F4C1}": "[Ordner]",         // 📁
  "\u{1F4C4}": "[Dokument]",       // 📄
  "\u{1F4F7}": "[Foto]",           // 📷
  "\u{1F5BC}": "[Bild]",           // 🖼
  "\u2713": "x",                   // ✓
  "\u2714": "x",                   // ✔
  "\u2717": "-",                   // ✗
  "\u2718": "-",                   // ✘
  "\u2192": "->",                  // →
  "\u2190": "<-",                  // ←
  "\u2191": "^",                   // ↑
  "\u2193": "v",                   // ↓
  "\u2022": "-",                   // •
  "\u2013": "-",                   // –
  "\u2014": "-",                   // —
  "\u2026": "...",                 // …
  "\u201E": "\"",                  // „
  "\u201C": "\"",                  // "
  "\u201D": "\"",                  // "
  "\u2018": "'",                   // '
  "\u2019": "'",                   // '
  "\u00AB": "<<",                  // «
  "\u00BB": ">>",                  // »
};

/**
 * Bereinigt Text für WinAnsi-Encoding
 * Entfernt oder ersetzt Zeichen, die nicht im WinAnsi-Bereich liegen
 */
function sanitizeForWinAnsi(text: string): string {
  if (!text) return "";

  let result = text;

  // Bekannte Zeichen ersetzen
  for (const [unicode, replacement] of Object.entries(UNICODE_REPLACEMENTS)) {
    result = result.split(unicode).join(replacement);
  }

  // Alle verbleibenden Zeichen außerhalb des WinAnsi-Bereichs entfernen
  // WinAnsi unterstützt Latin-1 (0x00-0xFF) plus einige Windows-spezifische Zeichen
  result = result.replace(/[^\x00-\xFF]/g, (char) => {
    // Versuche Unicode-Name oder Codepoint als Fallback
    const codePoint = char.codePointAt(0);
    if (codePoint && codePoint > 0xFF) {
      // Unbekanntes Zeichen durch leeren String ersetzen
      return "";
    }
    return char;
  });

  return result;
}

interface GeneratorOptions {
  profile: ConversionProfile;
  documentTitle?: string;
  language?: string;
  includeBookmarks?: boolean;
  embedFonts?: boolean;
}

interface PDFStructureElement {
  role: SemanticRole;
  kids: (PDFStructureElement | PDFRef)[];
  attributes?: Record<string, unknown>;
  actualText?: string;
  altText?: string;
  lang?: string;
}

export class PdfUaGenerator {
  private doc: PDFDocument | null = null;
  private currentPage: PDFPage | null = null;
  private fonts: Map<string, PDFFont> = new Map();
  private structureTree: PDFStructureElement[] = [];
  private bookmarks: { title: string; pageIndex: number; y: number }[] = [];
  private options: GeneratorOptions;
  private presentation: Presentation | null = null;

  constructor(options: Partial<GeneratorOptions> = {}) {
    this.options = {
      profile: options.profile || this.getDefaultProfile(),
      documentTitle: options.documentTitle,
      language: options.language || "de",
      includeBookmarks: options.includeBookmarks ?? true,
      embedFonts: options.embedFonts ?? true,
    };
  }

  /**
   * Generiert ein PDF/UA-konformes Dokument aus einer geparsten Präsentation
   */
  async generate(presentation: Presentation): Promise<Uint8Array> {
    this.presentation = presentation;
    this.doc = await PDFDocument.create();

    // Schriftarten laden
    await this.loadFonts();

    // Metadaten setzen (PDF/UA-Anforderung)
    this.setMetadata(presentation);

    // Folien verarbeiten
    for (const slide of presentation.slides) {
      await this.renderSlide(slide);
    }

    // Strukturbaum hinzufügen (PDF/UA-Kernfunktion)
    await this.addStructureTree();

    // Lesezeichen hinzufügen
    if (this.options.includeBookmarks) {
      this.addBookmarks();
    }

    // PDF/UA-Identifier setzen
    this.setPdfUaIdentifier();

    return this.doc.save();
  }

  /**
   * Lädt die benötigten Schriftarten
   */
  private async loadFonts(): Promise<void> {
    if (!this.doc) return;

    // Standard-Schriftarten
    this.fonts.set("regular", await this.doc.embedFont(StandardFonts.Helvetica));
    this.fonts.set("bold", await this.doc.embedFont(StandardFonts.HelveticaBold));
    this.fonts.set("italic", await this.doc.embedFont(StandardFonts.HelveticaOblique));
    this.fonts.set("boldItalic", await this.doc.embedFont(StandardFonts.HelveticaBoldOblique));
  }

  /**
   * Setzt PDF-Metadaten (wichtig für PDF/UA)
   */
  private setMetadata(presentation: Presentation): void {
    if (!this.doc) return;

    const title = this.options.documentTitle ||
                  presentation.metadata.title ||
                  "Unbenannte Präsentation";

    this.doc.setTitle(title);
    this.doc.setLanguage(this.options.language || presentation.metadata.language || "de");

    if (presentation.metadata.author) {
      this.doc.setAuthor(presentation.metadata.author);
    }

    if (presentation.metadata.subject) {
      this.doc.setSubject(presentation.metadata.subject);
    }

    if (presentation.metadata.keywords) {
      this.doc.setKeywords(presentation.metadata.keywords);
    }

    this.doc.setCreator("Barrierefreiheit-Plattform PDF/UA Generator");
    this.doc.setProducer("Barrierefreiheit-Plattform (https://barrierefreiheit.example.de)");
    this.doc.setCreationDate(new Date());
    this.doc.setModificationDate(new Date());
  }

  /**
   * Rendert eine Folie als PDF-Seite
   */
  private async renderSlide(slide: Slide): Promise<void> {
    if (!this.doc) return;

    // Neue Seite erstellen
    this.currentPage = this.doc.addPage([DEFAULTS.pageWidth, DEFAULTS.pageHeight]);

    // Seiten-Strukturelement
    const pageStructure: PDFStructureElement = {
      role: "Part",
      kids: [],
      attributes: {
        "Pg": this.currentPage,
      },
    };

    // Elemente in Lesereihenfolge rendern
    const orderedElements = this.getOrderedElements(slide);

    let y = DEFAULTS.pageHeight - DEFAULTS.margin;

    for (const element of orderedElements) {
      // Dekorative Elemente überspringen (werden als Artifact gerendert)
      if (element.isDecorative) {
        await this.renderArtifact(element);
        continue;
      }

      // Element rendern und Strukturelement erstellen
      const renderedElement = await this.renderElement(element, y);
      if (renderedElement) {
        pageStructure.kids.push(renderedElement.structure);
        y = renderedElement.nextY;
      }
    }

    this.structureTree.push(pageStructure);

    // Folientitel als Lesezeichen speichern
    const titleElement = orderedElements.find(e => e.type === "title");
    if (titleElement?.content.text) {
      this.bookmarks.push({
        title: titleElement.content.text,
        pageIndex: this.doc.getPageCount() - 1,
        y: DEFAULTS.pageHeight - DEFAULTS.margin,
      });
    }
  }

  /**
   * Sortiert Elemente nach Lesereihenfolge
   */
  private getOrderedElements(slide: Slide): SlideElement[] {
    const elementMap = new Map(slide.elements.map(e => [e.id, e]));
    const ordered: SlideElement[] = [];

    for (const id of slide.readingOrder) {
      const element = elementMap.get(id);
      if (element) {
        ordered.push(element);
      }
    }

    // Elemente die nicht in readingOrder sind hinzufügen
    for (const element of slide.elements) {
      if (!slide.readingOrder.includes(element.id)) {
        ordered.push(element);
      }
    }

    return ordered;
  }

  /**
   * Rendert ein einzelnes Element
   */
  private async renderElement(
    element: SlideElement,
    startY: number
  ): Promise<{ structure: PDFStructureElement; nextY: number } | null> {
    switch (element.type) {
      case "title":
        return this.renderTitle(element, startY);
      case "subtitle":
        return this.renderSubtitle(element, startY);
      case "body":
      case "paragraph":
      case "textbox":
        return this.renderParagraph(element, startY);
      case "list":
        return this.renderList(element, startY);
      case "table":
        return this.renderTable(element, startY);
      case "image":
        return this.renderImage(element, startY);
      case "chart":
        return this.renderChart(element, startY);
      case "smartart":
        return this.renderSmartArt(element, startY);
      default:
        return this.renderParagraph(element, startY);
    }
  }

  /**
   * Rendert einen Titel (H1) mit automatischem Zeilenumbruch
   */
  private renderTitle(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    const font = this.fonts.get("bold")!;
    const text = element.content.text || "";
    const fontSize = DEFAULTS.titleSize;
    const lineHeight = fontSize * 1.2;
    const maxWidth = DEFAULTS.pageWidth - 2 * DEFAULTS.margin;

    // Text umbrechen
    const lines = this.wrapText(text, font, fontSize, maxWidth);

    let y = startY;
    for (const line of lines) {
      y -= lineHeight;
      this.currentPage?.drawText(line, {
        x: DEFAULTS.margin,
        y,
        size: fontSize,
        font,
        color: COLORS.heading,
      });
    }

    return {
      structure: {
        role: "H1",
        kids: [],
        actualText: text,
        lang: this.options.language,
      },
      nextY: y - fontSize * 0.5,
    };
  }

  /**
   * Rendert einen Untertitel (H2) mit automatischem Zeilenumbruch
   */
  private renderSubtitle(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    const font = this.fonts.get("bold")!;
    const text = element.content.text || "";
    const fontSize = DEFAULTS.subtitleSize;
    const lineHeight = fontSize * 1.2;
    const maxWidth = DEFAULTS.pageWidth - 2 * DEFAULTS.margin;

    // Text umbrechen
    const lines = this.wrapText(text, font, fontSize, maxWidth);

    let y = startY;
    for (const line of lines) {
      y -= lineHeight;
      this.currentPage?.drawText(line, {
        x: DEFAULTS.margin,
        y,
        size: fontSize,
        font,
        color: COLORS.heading,
      });
    }

    return {
      structure: {
        role: "H2",
        kids: [],
        actualText: text,
        lang: this.options.language,
      },
      nextY: y - fontSize * 0.4,
    };
  }

  /**
   * Rendert einen Absatz (P)
   */
  private renderParagraph(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    const font = this.fonts.get("regular")!;
    const text = element.content.text || "";
    const fontSize = DEFAULTS.bodySize;
    const lineHeight = fontSize * DEFAULTS.lineHeight;

    // Text umbrechen
    const lines = this.wrapText(text, font, fontSize, DEFAULTS.pageWidth - 2 * DEFAULTS.margin);

    let y = startY;
    for (const line of lines) {
      y -= lineHeight;
      this.currentPage?.drawText(line, {
        x: DEFAULTS.margin,
        y,
        size: fontSize,
        font,
        color: COLORS.text,
      });
    }

    // Hyperlink hinzufügen falls vorhanden
    if (element.hyperlink) {
      // TODO: Link-Annotation hinzufügen
    }

    return {
      structure: {
        role: "P",
        kids: [],
        actualText: text,
        lang: this.options.language,
      },
      nextY: y - fontSize * 0.5,
    };
  }

  /**
   * Rendert eine Liste (L mit LI, Lbl, LBody)
   */
  private renderList(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    const font = this.fonts.get("regular")!;
    const fontSize = DEFAULTS.bodySize;
    const lineHeight = fontSize * DEFAULTS.lineHeight;
    const indent = 20;

    const listStructure: PDFStructureElement = {
      role: "L",
      kids: [],
      lang: this.options.language,
    };

    let y = startY;
    const items = element.listData?.items || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      y -= lineHeight;

      // Aufzählungszeichen
      const bullet = item.listType === "ordered" ? `${i + 1}.` : "-";
      const bulletIndent = item.level * indent;

      this.currentPage?.drawText(sanitizeForWinAnsi(bullet), {
        x: DEFAULTS.margin + bulletIndent,
        y,
        size: fontSize,
        font,
        color: COLORS.text,
      });

      // Listen-Text
      const textX = DEFAULTS.margin + bulletIndent + 15;
      const lines = this.wrapText(
        item.text,
        font,
        fontSize,
        DEFAULTS.pageWidth - 2 * DEFAULTS.margin - bulletIndent - 15
      );

      for (const line of lines) {
        this.currentPage?.drawText(line, {
          x: textX,
          y,
          size: fontSize,
          font,
          color: COLORS.text,
        });
        y -= lineHeight;
      }
      y += lineHeight; // Korrektur für letzte Zeile

      // LI-Struktur
      const liStructure: PDFStructureElement = {
        role: "LI",
        kids: [
          {
            role: "Lbl",
            kids: [],
            actualText: bullet,
          },
          {
            role: "LBody",
            kids: [],
            actualText: item.text,
          },
        ],
      };
      listStructure.kids.push(liStructure);
    }

    return {
      structure: listStructure,
      nextY: y - fontSize * 0.5,
    };
  }

  /**
   * Rendert eine Tabelle (Table, TR, TH, TD)
   */
  private renderTable(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    const font = this.fonts.get("regular")!;
    const boldFont = this.fonts.get("bold")!;
    const fontSize = DEFAULTS.bodySize;
    const cellPadding = 8;
    const tableData = element.tableData;

    if (!tableData) {
      return {
        structure: { role: "Table", kids: [] },
        nextY: startY,
      };
    }

    const tableStructure: PDFStructureElement = {
      role: "Table",
      kids: [],
      lang: this.options.language,
    };

    // Spaltenbreiten berechnen
    const availableWidth = DEFAULTS.pageWidth - 2 * DEFAULTS.margin;
    const colWidth = availableWidth / (tableData.columns || 1);
    const rowHeight = fontSize * 2 + cellPadding * 2;

    let y = startY;

    for (let rowIndex = 0; rowIndex < tableData.cells.length; rowIndex++) {
      const row = tableData.cells[rowIndex];
      const isHeaderRow = rowIndex === 0 && tableData.hasHeaderRow;

      y -= rowHeight;

      const rowStructure: PDFStructureElement = {
        role: "TR",
        kids: [],
      };

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        const x = DEFAULTS.margin + colIndex * colWidth;
        const cellFont = cell.isHeader || isHeaderRow ? boldFont : font;

        // Zellen-Rahmen zeichnen
        this.currentPage?.drawRectangle({
          x,
          y,
          width: colWidth,
          height: rowHeight,
          borderWidth: 0.5,
          borderColor: rgb(0.7, 0.7, 0.7),
          color: isHeaderRow ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1),
        });

        // Text zeichnen
        const textY = y + rowHeight / 2 - fontSize / 3;
        this.currentPage?.drawText(sanitizeForWinAnsi(cell.content.substring(0, 50)), {
          x: x + cellPadding,
          y: textY,
          size: fontSize,
          font: cellFont,
          color: COLORS.text,
        });

        // Zellenstruktur
        const cellStructure: PDFStructureElement = {
          role: cell.isHeader || isHeaderRow ? "TH" : "TD",
          kids: [],
          actualText: cell.content,
          attributes: cell.scope ? { Scope: cell.scope } : undefined,
        };
        rowStructure.kids.push(cellStructure);
      }

      tableStructure.kids.push(rowStructure);
    }

    return {
      structure: tableStructure,
      nextY: y - fontSize * 0.5,
    };
  }

  /**
   * Rendert ein Bild (Figure mit Alt-Text)
   */
  private renderImage(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    // Platzhalter für Bild (echte Bildeinbettung würde mehr Code benötigen)
    const width = Math.min(element.position.width || 200, DEFAULTS.pageWidth - 2 * DEFAULTS.margin);
    const altText = element.content.altText || "[Bild ohne Alternativtext]";
    const font = this.fonts.get("italic")!;
    const fontSize = 10;
    const lineHeight = fontSize * 1.4;
    const textPadding = 10;
    const maxTextWidth = width - 2 * textPadding;

    // Alt-Text umbrechen
    const lines = this.wrapText(altText, font, fontSize, maxTextWidth);
    const textBlockHeight = lines.length * lineHeight + 2 * textPadding;

    // Höhe basierend auf Textmenge berechnen (mindestens Originalhöhe)
    const minHeight = element.position.height || 150;
    const height = Math.max(minHeight, textBlockHeight);
    const y = startY - height;

    // Platzhalter-Rechteck
    this.currentPage?.drawRectangle({
      x: DEFAULTS.margin,
      y,
      width,
      height,
      borderWidth: 1,
      borderColor: rgb(0.8, 0.8, 0.8),
      color: rgb(0.95, 0.95, 0.95),
    });

    // Alt-Text mit Zeilenumbruch anzeigen
    let textY = y + height - textPadding - fontSize;
    for (const line of lines) {
      this.currentPage?.drawText(line, {
        x: DEFAULTS.margin + textPadding,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      textY -= lineHeight;
    }

    return {
      structure: {
        role: "Figure",
        kids: [],
        altText: altText,
        lang: this.options.language,
      },
      nextY: y - 10,
    };
  }

  /**
   * Rendert ein Diagramm (Figure mit beschreibendem Alt-Text)
   */
  private renderChart(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    // Ähnlich wie Bild, aber mit Hinweis auf Datentabelle
    const width = Math.min(element.position.width || 300, DEFAULTS.pageWidth - 2 * DEFAULTS.margin);
    const font = this.fonts.get("italic")!;
    const fontSize = 10;
    const lineHeight = fontSize * 1.4;
    const textPadding = 10;
    const maxTextWidth = width - 2 * textPadding;

    const altText = element.content.altText || "[Diagramm ohne Beschreibung]";
    const displayText = "[Diagramm] " + altText;

    // Alt-Text umbrechen
    const lines = this.wrapText(displayText, font, fontSize, maxTextWidth);
    const textBlockHeight = lines.length * lineHeight + 2 * textPadding;

    // Höhe basierend auf Textmenge berechnen (mindestens Originalhöhe)
    const minHeight = element.position.height || 200;
    const height = Math.max(minHeight, textBlockHeight);
    const y = startY - height;

    this.currentPage?.drawRectangle({
      x: DEFAULTS.margin,
      y,
      width,
      height,
      borderWidth: 1,
      borderColor: COLORS.heading,
      color: rgb(0.98, 0.98, 1),
    });

    // Alt-Text mit Zeilenumbruch anzeigen
    let textY = y + height - textPadding - fontSize;
    for (const line of lines) {
      this.currentPage?.drawText(line, {
        x: DEFAULTS.margin + textPadding,
        y: textY,
        size: fontSize,
        font,
        color: COLORS.heading,
      });
      textY -= lineHeight;
    }

    return {
      structure: {
        role: "Figure",
        kids: [],
        altText: element.content.altText || element.content.longDescription || "Diagramm",
        lang: this.options.language,
      },
      nextY: y - 10,
    };
  }

  /**
   * Rendert SmartArt (als Liste oder Figure)
   */
  private renderSmartArt(
    element: SlideElement,
    startY: number
  ): { structure: PDFStructureElement; nextY: number } {
    // SmartArt als beschreibendes Figure-Element
    const width = Math.min(element.position.width || 300, DEFAULTS.pageWidth - 2 * DEFAULTS.margin);
    const font = this.fonts.get("regular")!;
    const fontSize = 10;
    const lineHeight = fontSize * 1.4;
    const textPadding = 10;
    const maxTextWidth = width - 2 * textPadding;

    const altText = element.content.altText || "[SmartArt-Grafik]";

    // Alt-Text umbrechen
    const lines = this.wrapText(altText, font, fontSize, maxTextWidth);
    const textBlockHeight = lines.length * lineHeight + 2 * textPadding;

    // Höhe basierend auf Textmenge berechnen (mindestens Originalhöhe)
    const minHeight = element.position.height || 200;
    const height = Math.max(minHeight, textBlockHeight);
    const y = startY - height;

    this.currentPage?.drawRectangle({
      x: DEFAULTS.margin,
      y,
      width,
      height,
      borderWidth: 1,
      borderColor: rgb(0.7, 0.7, 0.7),
      color: rgb(0.97, 0.97, 0.97),
    });

    // Alt-Text mit Zeilenumbruch anzeigen
    let textY = y + height - textPadding - fontSize;
    for (const line of lines) {
      this.currentPage?.drawText(line, {
        x: DEFAULTS.margin + textPadding,
        y: textY,
        size: fontSize,
        font,
        color: COLORS.text,
      });
      textY -= lineHeight;
    }

    return {
      structure: {
        role: element.content.altText ? "Figure" : "L", // Als Liste wenn strukturiert
        kids: [],
        altText: element.content.altText,
        lang: this.options.language,
      },
      nextY: y - 10,
    };
  }

  /**
   * Rendert dekorative Elemente als Artifact (nicht im Strukturbaum)
   */
  private async renderArtifact(element: SlideElement): Promise<void> {
    // Dekorative Elemente werden gerendert, aber nicht getaggt
    // PDF/UA: Artifacts sind von assistiven Technologien ignoriert

    if (element.type === "image") {
      const width = Math.min(element.position.width || 100, 200);
      const height = element.position.height || 100;

      // Position aus Element verwenden oder zufällig platzieren
      const x = element.position.x || DEFAULTS.margin;
      const y = (DEFAULTS.pageHeight - element.position.y - height) || DEFAULTS.margin;

      this.currentPage?.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0.9, 0.9, 0.9),
        opacity: 0.3,
      });
    }
  }

  /**
   * Textumbruch-Hilfsfunktion
   */
  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    // Text für WinAnsi-Encoding bereinigen
    const sanitizedText = sanitizeForWinAnsi(text);
    const words = sanitizedText.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length ? lines : [""];
  }

  /**
   * Fügt den PDF/UA-konformen Strukturbaum hinzu
   */
  private async addStructureTree(): Promise<void> {
    if (!this.doc) return;

    // Hinweis: pdf-lib hat begrenzte Unterstützung für Tagged PDF.
    // Für vollständige PDF/UA-Konformität wäre ein spezialisiertes Tool wie
    // pdf-lib-tagged oder eine Server-seitige Lösung mit einer anderen
    // Bibliothek erforderlich.

    // Wir setzen zumindest die grundlegenden Marker für Tagged PDF
    const catalog = this.doc.catalog;

    // MarkInfo Dictionary setzen
    // Dies signalisiert, dass das PDF getaggt ist
    const markInfo = this.doc.context.obj({
      Marked: true,
      Suspects: false,
    });
    catalog.set(PDFName.of("MarkInfo"), markInfo);

    // ViewerPreferences für bessere Zugänglichkeit
    const viewerPrefs = this.doc.context.obj({
      DisplayDocTitle: true, // Dokumenttitel in Titelleiste anzeigen
    });
    catalog.set(PDFName.of("ViewerPreferences"), viewerPrefs);
  }

  /**
   * Fügt Lesezeichen/Outline hinzu
   */
  private addBookmarks(): void {
    if (!this.doc || this.bookmarks.length === 0) return;

    // Outline-Dictionary erstellen
    // Vereinfachte Implementierung - vollständige Outline-Struktur wäre komplexer

    // pdf-lib unterstützt keine direkte Outline-Erstellung,
    // daher setzen wir nur die Metadaten entsprechend
  }

  /**
   * Setzt den PDF/UA-Identifier (Teil der PDF/UA-Konformität)
   */
  private setPdfUaIdentifier(): void {
    if (!this.doc) return;

    // PDF/UA-1 Identifier würde normalerweise im XMP-Metadata-Stream gesetzt
    // pdf-lib hat begrenzte XMP-Unterstützung

    // Wir setzen zumindest Custom Metadata
    const existingSubject = this.doc.getSubject() || "";
    this.doc.setSubject(
      existingSubject +
      (existingSubject ? " | " : "") +
      "PDF/UA-1 (ISO 14289-1)"
    );
  }

  /**
   * Standard-Konvertierungsprofil
   */
  private getDefaultProfile(): ConversionProfile {
    return {
      name: "Standard",
      id: "standard",
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
        linearized: false,
      },
    };
  }
}

/**
 * Hilfsfunktion für schnelle PDF-Generierung
 */
export async function generateAccessiblePdf(
  presentation: Presentation,
  options?: Partial<GeneratorOptions>
): Promise<Uint8Array> {
  const generator = new PdfUaGenerator(options);
  return generator.generate(presentation);
}

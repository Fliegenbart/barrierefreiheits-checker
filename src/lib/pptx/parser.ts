/**
 * PPTX Parser - Extrahiert Struktur und Semantik aus PowerPoint-Dateien
 */

import JSZip from "jszip";
import { parseStringPromise } from "xml2js";
import {
  Presentation,
  Slide,
  SlideElement,
  ElementType,
  SemanticRole,
  AltTextStatus,
  SlideLayoutType,
  RichTextRun,
  TableData,
  TableCell,
  ListData,
  AccessibilityIssue,
} from "./types";

// EMU zu Pixel Konvertierung (914400 EMUs = 1 inch, 96 DPI)
const EMU_TO_PX = 914400 / 96;

export class PptxParser {
  private zip: JSZip | null = null;
  private presentation: Presentation | null = null;

  /**
   * Parst eine PPTX-Datei und extrahiert die Struktur
   */
  async parse(buffer: Buffer): Promise<Presentation> {
    this.zip = await JSZip.loadAsync(buffer);

    // Metadaten extrahieren
    const metadata = await this.parseMetadata();

    // Slides extrahieren
    const slides = await this.parseSlides();

    // Theme extrahieren
    const theme = await this.parseTheme();

    // Statistiken berechnen
    const stats = this.calculateStats(slides);

    // Globale Issues sammeln
    const issues = this.collectGlobalIssues(metadata, slides);

    this.presentation = {
      metadata,
      slides,
      theme,
      issues,
      stats,
    };

    return this.presentation;
  }

  /**
   * Extrahiert Metadaten aus der PPTX
   */
  private async parseMetadata(): Promise<Presentation["metadata"]> {
    const metadata: Presentation["metadata"] = {
      title: "",
      language: "de", // Default für deutsche Behörden
    };

    try {
      // Core Properties (docProps/core.xml)
      const coreXml = await this.getXmlContent("docProps/core.xml");
      if (coreXml) {
        const core = await parseStringPromise(coreXml);
        const cp = core["cp:coreProperties"] || core["coreProperties"] || {};

        metadata.title = this.extractText(cp["dc:title"]) || "";
        metadata.author = this.extractText(cp["dc:creator"]);
        metadata.subject = this.extractText(cp["dc:subject"]);

        const keywords = this.extractText(cp["cp:keywords"]);
        if (keywords) {
          metadata.keywords = keywords.split(/[,;]/).map((k) => k.trim());
        }

        // Sprache aus verschiedenen Quellen
        metadata.language =
          this.extractText(cp["dc:language"]) ||
          this.extractText(cp["xml:lang"]) ||
          "de";

        // Datumsangaben
        const created = this.extractText(cp["dcterms:created"]);
        if (created) metadata.createdDate = new Date(created);

        const modified = this.extractText(cp["dcterms:modified"]);
        if (modified) metadata.modifiedDate = new Date(modified);
      }

      // App Properties für zusätzliche Infos
      const appXml = await this.getXmlContent("docProps/app.xml");
      if (appXml && !metadata.title) {
        const app = await parseStringPromise(appXml);
        const props = app["Properties"] || {};
        metadata.title = this.extractText(props["TitlesOfParts"]) || "";
      }
    } catch (error) {
      console.warn("Fehler beim Parsen der Metadaten:", error);
    }

    return metadata;
  }

  /**
   * Extrahiert alle Folien
   */
  private async parseSlides(): Promise<Slide[]> {
    const slides: Slide[] = [];

    // Präsentations-XML für Folienreihenfolge
    const presentationXml = await this.getXmlContent("ppt/presentation.xml");
    if (!presentationXml) return slides;

    const presentation = await parseStringPromise(presentationXml);
    const sldIdLst =
      presentation["p:presentation"]?.["p:sldIdLst"]?.[0]?.["p:sldId"] || [];

    for (let i = 0; i < sldIdLst.length; i++) {
      const slideNum = i + 1;
      const slideXml = await this.getXmlContent(`ppt/slides/slide${slideNum}.xml`);

      if (slideXml) {
        const slide = await this.parseSlide(slideXml, slideNum);
        slides.push(slide);
      }
    }

    return slides;
  }

  /**
   * Parst eine einzelne Folie
   */
  private async parseSlide(xml: string, slideNumber: number): Promise<Slide> {
    const parsed = await parseStringPromise(xml);
    const sld = parsed["p:sld"];

    const elements: SlideElement[] = [];
    const backgroundElements: SlideElement[] = [];
    const issues: AccessibilityIssue[] = [];

    // CSld (Common Slide Data) enthält die Inhalte
    const cSld = sld?.["p:cSld"]?.[0];
    const spTree = cSld?.["p:spTree"]?.[0];

    if (spTree) {
      // Shapes parsen
      const shapes = spTree["p:sp"] || [];
      for (const shape of shapes) {
        const element = await this.parseShape(shape, slideNumber);
        if (element) {
          if (element.isDecorative) {
            backgroundElements.push(element);
          } else {
            elements.push(element);
          }
        }
      }

      // Bilder parsen
      const pics = spTree["p:pic"] || [];
      for (const pic of pics) {
        const element = await this.parsePicture(pic, slideNumber);
        if (element) {
          if (element.isDecorative) {
            backgroundElements.push(element);
          } else {
            elements.push(element);
          }
        }
      }

      // Tabellen/GraphicFrames parsen
      const graphicFrames = spTree["p:graphicFrame"] || [];
      for (const gf of graphicFrames) {
        const element = await this.parseGraphicFrame(gf, slideNumber);
        if (element) {
          elements.push(element);
        }
      }

      // Gruppen parsen
      const groups = spTree["p:grpSp"] || [];
      for (const grp of groups) {
        const groupElements = await this.parseGroup(grp, slideNumber);
        elements.push(...groupElements);
      }
    }

    // Lesereihenfolge berechnen
    const { readingOrder, confidence } = this.calculateReadingOrder(elements);

    // Layout-Typ ermitteln
    const layout = await this.detectLayoutType(elements);

    // Folie validieren
    this.validateSlide(elements, issues, slideNumber);

    return {
      number: slideNumber,
      id: `slide-${slideNumber}`,
      layout,
      elements,
      readingOrder,
      readingOrderConfidence: confidence,
      backgroundElements,
      issues,
    };
  }

  /**
   * Parst ein Shape (Textbox, Titel, etc.)
   */
  private async parseShape(
    shape: Record<string, unknown>,
    slideNumber: number
  ): Promise<SlideElement | null> {
    const nvSpPr = (shape["p:nvSpPr"] as Record<string, unknown>[])?.[0];
    const spPr = (shape["p:spPr"] as Record<string, unknown>[])?.[0];
    const txBody = (shape["p:txBody"] as Record<string, unknown>[])?.[0];

    if (!nvSpPr) return null;

    const cNvPr = (nvSpPr["p:cNvPr"] as Record<string, unknown>[])?.[0];
    const nvPr = (nvSpPr["p:nvPr"] as Record<string, unknown>[])?.[0];

    // Grundlegende Eigenschaften
    const id = (cNvPr?.["$"] as Record<string, string>)?.id || `shape-${Date.now()}`;
    const name = (cNvPr?.["$"] as Record<string, string>)?.name || "";

    // Element-Typ basierend auf Placeholder-Typ bestimmen
    const phType = this.getPlaceholderType(nvPr);
    const elementType = this.mapPlaceholderToType(phType, name);
    const semanticRole = this.mapTypeToRole(elementType);

    // Position extrahieren
    const position = this.extractPosition(spPr);

    // Text-Inhalt extrahieren
    const { text, richText } = this.extractTextContent(txBody);

    // Alt-Text und Decorative-Status
    const { altText, isDecorative } = this.extractAltText(cNvPr);

    // Hyperlinks
    const hyperlink = this.extractHyperlink(txBody);

    // Issues für dieses Element
    const issues: AccessibilityIssue[] = [];

    // Prüfen auf leeren Titel
    if (elementType === "title" && !text.trim()) {
      issues.push({
        id: `issue-${id}-empty-title`,
        type: "missing_title",
        severity: "error",
        slideNumber,
        elementId: id,
        elementType,
        message: "Slide title is empty",
        messageDE: "Folientitel ist leer",
        wcagCriteria: "2.4.2",
        pdfuaClause: "7.1",
        suggestion: "Add a meaningful title to the slide",
        suggestionDE: "Fügen Sie einen aussagekräftigen Titel hinzu",
        autoFixable: false,
      });
    }

    return {
      id,
      type: elementType,
      semanticRole,
      position,
      content: {
        text,
        richText,
        altText,
        altTextStatus: this.determineAltTextStatus(altText, isDecorative, elementType),
      },
      style: this.extractStyle(txBody, spPr),
      isDecorative,
      isGrouped: false,
      hyperlink,
      issues,
    };
  }

  /**
   * Parst ein Bild
   */
  private async parsePicture(
    pic: Record<string, unknown>,
    slideNumber: number
  ): Promise<SlideElement | null> {
    const nvPicPr = (pic["p:nvPicPr"] as Record<string, unknown>[])?.[0];
    const spPr = (pic["p:spPr"] as Record<string, unknown>[])?.[0];

    if (!nvPicPr) return null;

    const cNvPr = (nvPicPr["p:cNvPr"] as Record<string, unknown>[])?.[0];

    const id = (cNvPr?.["$"] as Record<string, string>)?.id || `pic-${Date.now()}`;
    const name = (cNvPr?.["$"] as Record<string, string>)?.name || "";

    // Alt-Text extrahieren
    const { altText, isDecorative, longDescription } = this.extractAltText(cNvPr);

    // Position
    const position = this.extractPosition(spPr);

    // Issues
    const issues: AccessibilityIssue[] = [];
    const altTextStatus = this.determineAltTextStatus(altText, isDecorative, "image");

    if (altTextStatus === "missing" && !isDecorative) {
      issues.push({
        id: `issue-${id}-missing-alt`,
        type: "missing_alt_text",
        severity: "error",
        slideNumber,
        elementId: id,
        elementType: "image",
        message: `Image "${name}" is missing alt text`,
        messageDE: `Bild "${name}" hat keinen Alternativtext`,
        wcagCriteria: "1.1.1",
        pdfuaClause: "7.3",
        suggestion: "Add descriptive alt text or mark as decorative",
        suggestionDE:
          "Fügen Sie beschreibenden Alt-Text hinzu oder markieren Sie als dekorativ",
        autoFixable: false,
        context: name,
      });
    }

    return {
      id,
      type: "image",
      semanticRole: isDecorative ? "Artifact" : "Figure",
      position,
      content: {
        altText,
        altTextStatus,
        longDescription,
      },
      style: {},
      isDecorative,
      isGrouped: false,
      issues,
    };
  }

  /**
   * Parst ein GraphicFrame (Tabelle, Diagramm, SmartArt)
   */
  private async parseGraphicFrame(
    gf: Record<string, unknown>,
    slideNumber: number
  ): Promise<SlideElement | null> {
    const nvGraphicFramePr = (gf["p:nvGraphicFramePr"] as Record<string, unknown>[])?.[0];
    const xfrm = (gf["p:xfrm"] as Record<string, unknown>[])?.[0];
    const graphic = (gf["a:graphic"] as Record<string, unknown>[])?.[0];

    if (!nvGraphicFramePr || !graphic) return null;

    const cNvPr = (nvGraphicFramePr["p:cNvPr"] as Record<string, unknown>[])?.[0];
    const id = (cNvPr?.["$"] as Record<string, string>)?.id || `gf-${Date.now()}`;

    const graphicData = (graphic["a:graphicData"] as Record<string, unknown>[])?.[0];

    // Tabelle erkennen
    const tbl = (graphicData?.["a:tbl"] as Record<string, unknown>[])?.[0];
    if (tbl) {
      return this.parseTable(tbl, id, xfrm, slideNumber);
    }

    // Diagramm erkennen
    const chart = graphicData?.["c:chart"];
    if (chart) {
      return this.parseChart(graphicData, id, xfrm, cNvPr, slideNumber);
    }

    // SmartArt erkennen
    const dgm = graphicData?.["dgm:relIds"];
    if (dgm) {
      return this.parseSmartArt(graphicData, id, xfrm, cNvPr, slideNumber);
    }

    return null;
  }

  /**
   * Parst eine Tabelle
   */
  private parseTable(
    tbl: Record<string, unknown>,
    id: string,
    xfrm: Record<string, unknown> | undefined,
    slideNumber: number
  ): SlideElement {
    const rows = (tbl["a:tr"] as Record<string, unknown>[]) || [];
    const tableData: TableData = {
      rows: rows.length,
      columns: 0,
      cells: [],
      hasHeaderRow: false,
      hasHeaderColumn: false,
    };

    const issues: AccessibilityIssue[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const cells = (row["a:tc"] as Record<string, unknown>[]) || [];
      const rowCells: TableCell[] = [];

      if (rowIndex === 0) {
        tableData.columns = cells.length;
      }

      for (let colIndex = 0; colIndex < cells.length; colIndex++) {
        const cell = cells[colIndex];
        const txBody = (cell["a:txBody"] as Record<string, unknown>[])?.[0];
        const { text, richText } = this.extractTextContent(txBody);

        // Erste Zeile als Header annehmen (heuristisch)
        const isHeader = rowIndex === 0;
        if (isHeader) tableData.hasHeaderRow = true;

        rowCells.push({
          content: text,
          richText,
          isHeader,
          scope: isHeader ? "col" : undefined,
        });
      }

      tableData.cells.push(rowCells);
    }

    // Prüfen ob Header korrekt gesetzt
    if (!tableData.hasHeaderRow && tableData.rows > 1) {
      issues.push({
        id: `issue-${id}-no-header`,
        type: "table_missing_headers",
        severity: "warning",
        slideNumber,
        elementId: id,
        elementType: "table",
        message: "Table has no header row defined",
        messageDE: "Tabelle hat keine Kopfzeile definiert",
        wcagCriteria: "1.3.1",
        pdfuaClause: "7.5",
        suggestion: "Mark the first row as table header",
        suggestionDE: "Markieren Sie die erste Zeile als Tabellenkopf",
        autoFixable: true,
      });
    }

    return {
      id,
      type: "table",
      semanticRole: "Table",
      position: this.extractPosition(xfrm as Record<string, unknown>),
      content: {
        altTextStatus: "present",
      },
      style: {},
      isDecorative: false,
      isGrouped: false,
      tableData,
      issues,
    };
  }

  /**
   * Parst ein Diagramm
   */
  private parseChart(
    graphicData: Record<string, unknown>,
    id: string,
    xfrm: Record<string, unknown> | undefined,
    cNvPr: Record<string, unknown> | undefined,
    slideNumber: number
  ): SlideElement {
    const { altText, isDecorative, longDescription } = this.extractAltText(cNvPr);
    const issues: AccessibilityIssue[] = [];

    if (!altText && !isDecorative) {
      issues.push({
        id: `issue-${id}-chart-alt`,
        type: "missing_alt_text",
        severity: "error",
        slideNumber,
        elementId: id,
        elementType: "chart",
        message: "Chart is missing alt text",
        messageDE: "Diagramm hat keinen Alternativtext",
        wcagCriteria: "1.1.1",
        pdfuaClause: "7.3",
        suggestion:
          "Add alt text describing the chart data and key insights",
        suggestionDE:
          "Fügen Sie Alt-Text hinzu, der die Daten und wichtige Erkenntnisse beschreibt",
        autoFixable: false,
      });
    }

    return {
      id,
      type: "chart",
      semanticRole: "Figure",
      position: this.extractPosition(xfrm as Record<string, unknown>),
      content: {
        altText,
        altTextStatus: this.determineAltTextStatus(altText, isDecorative, "chart"),
        longDescription,
      },
      style: {},
      isDecorative,
      isGrouped: false,
      issues,
    };
  }

  /**
   * Parst SmartArt
   */
  private parseSmartArt(
    graphicData: Record<string, unknown>,
    id: string,
    xfrm: Record<string, unknown> | undefined,
    cNvPr: Record<string, unknown> | undefined,
    slideNumber: number
  ): SlideElement {
    const { altText, isDecorative } = this.extractAltText(cNvPr);
    const issues: AccessibilityIssue[] = [];

    // SmartArt sollte in semantische Struktur überführt werden
    issues.push({
      id: `issue-${id}-smartart`,
      type: "flattened_content",
      severity: "warning",
      slideNumber,
      elementId: id,
      elementType: "smartart",
      message: "SmartArt may lose structure when converted",
      messageDE:
        "SmartArt kann bei der Konvertierung Struktur verlieren",
      suggestion:
        "Consider converting SmartArt to a structured list or adding detailed alt text",
      suggestionDE:
        "Erwägen Sie, SmartArt in eine strukturierte Liste umzuwandeln oder detaillierten Alt-Text hinzuzufügen",
      autoFixable: false,
    });

    return {
      id,
      type: "smartart",
      semanticRole: altText ? "Figure" : "L", // Als Liste wenn möglich
      position: this.extractPosition(xfrm as Record<string, unknown>),
      content: {
        altText,
        altTextStatus: this.determineAltTextStatus(altText, isDecorative, "smartart"),
      },
      style: {},
      isDecorative,
      isGrouped: false,
      issues,
    };
  }

  /**
   * Parst eine Gruppe von Elementen
   */
  private async parseGroup(
    grp: Record<string, unknown>,
    slideNumber: number
  ): Promise<SlideElement[]> {
    const elements: SlideElement[] = [];
    const nvGrpSpPr = (grp["p:nvGrpSpPr"] as Record<string, unknown>[])?.[0];
    const grpSpPr = (grp["p:grpSpPr"] as Record<string, unknown>[])?.[0];

    const cNvPr = (nvGrpSpPr?.["p:cNvPr"] as Record<string, unknown>[])?.[0];
    const groupId = (cNvPr?.["$"] as Record<string, string>)?.id || `grp-${Date.now()}`;

    // Shapes in der Gruppe
    const shapes = (grp["p:sp"] as Record<string, unknown>[]) || [];
    for (const shape of shapes) {
      const element = await this.parseShape(shape, slideNumber);
      if (element) {
        element.isGrouped = true;
        element.groupId = groupId;
        elements.push(element);
      }
    }

    // Bilder in der Gruppe
    const pics = (grp["p:pic"] as Record<string, unknown>[]) || [];
    for (const pic of pics) {
      const element = await this.parsePicture(pic, slideNumber);
      if (element) {
        element.isGrouped = true;
        element.groupId = groupId;
        elements.push(element);
      }
    }

    // Warnung bei Gruppen-Lesereihenfolge
    if (elements.length > 1) {
      elements[0].issues.push({
        id: `issue-${groupId}-order`,
        type: "grouped_content_order",
        severity: "info",
        slideNumber,
        elementId: groupId,
        message: "Grouped elements - verify reading order is correct",
        messageDE: "Gruppierte Elemente - Lesereihenfolge prüfen",
        autoFixable: false,
      });
    }

    return elements;
  }

  /**
   * Berechnet die logische Lesereihenfolge
   */
  private calculateReadingOrder(
    elements: SlideElement[]
  ): { readingOrder: string[]; confidence: number } {
    // Sortiere nach Heuristik:
    // 1. Titel immer zuerst
    // 2. Dann nach Y-Position (oben nach unten)
    // 3. Bei gleicher Y-Position: links nach rechts

    const sorted = [...elements].sort((a, b) => {
      // Titel haben höchste Priorität
      if (a.type === "title" && b.type !== "title") return -1;
      if (b.type === "title" && a.type !== "title") return 1;

      // Subtitle nach Titel
      if (a.type === "subtitle" && b.type !== "subtitle" && b.type !== "title")
        return -1;
      if (b.type === "subtitle" && a.type !== "subtitle" && a.type !== "title")
        return 1;

      // Nach Y-Position (mit Toleranz von 20px für gleiche Zeile)
      const yDiff = a.position.y - b.position.y;
      if (Math.abs(yDiff) > 20) return yDiff;

      // Bei gleicher Zeile: links nach rechts
      return a.position.x - b.position.x;
    });

    // Konfidenz basierend auf Strukturklarheit
    let confidence = 1.0;

    // Reduziere Konfidenz bei:
    // - Vielen Elementen auf gleicher Y-Position
    // - Überlappenden Elementen
    // - Gruppen

    const hasOverlap = this.checkForOverlaps(elements);
    if (hasOverlap) confidence -= 0.2;

    const hasGroups = elements.some((e) => e.isGrouped);
    if (hasGroups) confidence -= 0.1;

    const yPositions = new Set(elements.map((e) => Math.round(e.position.y / 20)));
    if (yPositions.size < elements.length * 0.5) confidence -= 0.2;

    return {
      readingOrder: sorted.map((e) => e.id),
      confidence: Math.max(0.3, confidence),
    };
  }

  /**
   * Prüft auf überlappende Elemente
   */
  private checkForOverlaps(elements: SlideElement[]): boolean {
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i].position;
        const b = elements[j].position;

        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;

        if (overlapX && overlapY) return true;
      }
    }
    return false;
  }

  /**
   * Ermittelt den Layout-Typ der Folie
   */
  private async detectLayoutType(
    elements: SlideElement[]
  ): Promise<Slide["layout"]> {
    const hasTitle = elements.some((e) => e.type === "title");
    const hasSubtitle = elements.some((e) => e.type === "subtitle");
    const bodyElements = elements.filter(
      (e) =>
        e.type === "body" ||
        e.type === "paragraph" ||
        e.type === "list" ||
        e.type === "textbox"
    );

    let type: SlideLayoutType = "custom";
    let name = "Benutzerdefiniert";

    if (hasTitle && hasSubtitle && bodyElements.length === 0) {
      type = "title";
      name = "Titelfolie";
    } else if (hasTitle && bodyElements.length === 1) {
      type = "titleAndContent";
      name = "Titel und Inhalt";
    } else if (hasTitle && bodyElements.length === 2) {
      type = "twoContent";
      name = "Zwei Inhalte";
    } else if (hasTitle && bodyElements.length === 0) {
      type = "titleOnly";
      name = "Nur Titel";
    } else if (!hasTitle && bodyElements.length === 0) {
      type = "blank";
      name = "Leer";
    }

    return { type, name };
  }

  /**
   * Validiert eine Folie auf Barrierefreiheitsprobleme
   */
  private validateSlide(
    elements: SlideElement[],
    issues: AccessibilityIssue[],
    slideNumber: number
  ): void {
    // Prüfe auf fehlenden Titel
    const hasTitle = elements.some(
      (e) => e.type === "title" && e.content.text?.trim()
    );
    if (!hasTitle) {
      issues.push({
        id: `issue-slide-${slideNumber}-no-title`,
        type: "missing_title",
        severity: "warning",
        slideNumber,
        message: "Slide has no title",
        messageDE: "Folie hat keinen Titel",
        wcagCriteria: "2.4.2",
        pdfuaClause: "7.1",
        suggestion: "Add a title to every slide for navigation",
        suggestionDE:
          "Fügen Sie jeder Folie einen Titel zur Navigation hinzu",
        autoFixable: false,
      });
    }

    // Prüfe auf Pseudo-Tabellen (Textboxen in Gitteranordnung)
    const textboxes = elements.filter((e) => e.type === "textbox");
    if (textboxes.length >= 4) {
      const isPseudoTable = this.detectPseudoTable(textboxes);
      if (isPseudoTable) {
        issues.push({
          id: `issue-slide-${slideNumber}-pseudo-table`,
          type: "pseudo_table",
          severity: "warning",
          slideNumber,
          message: "Textboxes arranged like a table detected",
          messageDE: "Textfelder in Tabellenform erkannt",
          suggestion: "Convert to a proper table for accessibility",
          suggestionDE:
            "Konvertieren Sie in eine echte Tabelle für Barrierefreiheit",
          autoFixable: false,
        });
      }
    }

    // Sammle Issues von allen Elementen
    for (const element of elements) {
      issues.push(...element.issues);
    }
  }

  /**
   * Erkennt Pseudo-Tabellen (Textboxen in Gitteranordnung)
   */
  private detectPseudoTable(textboxes: SlideElement[]): boolean {
    if (textboxes.length < 4) return false;

    // Gruppiere nach Y-Position (Zeilen)
    const rows = new Map<number, SlideElement[]>();
    for (const tb of textboxes) {
      const y = Math.round(tb.position.y / 30) * 30; // 30px Toleranz
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push(tb);
    }

    // Prüfe auf Gitterstruktur
    const rowSizes = Array.from(rows.values()).map((r) => r.length);
    const allSameSize = rowSizes.every((s) => s === rowSizes[0]);
    const atLeastTwoRowsAndCols =
      rows.size >= 2 && (rowSizes[0] || 0) >= 2;

    return allSameSize && atLeastTwoRowsAndCols;
  }

  // ===== Hilfsmethoden =====

  private async getXmlContent(path: string): Promise<string | null> {
    try {
      const file = this.zip?.file(path);
      if (!file) return null;
      return await file.async("string");
    } catch {
      return null;
    }
  }

  private extractText(node: unknown): string {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map((n) => this.extractText(n)).join("");
    if (typeof node === "object" && node !== null) {
      const obj = node as Record<string, unknown>;
      if ("_" in obj) return String(obj["_"]);
      if (obj["#text"]) return String(obj["#text"]);
    }
    return "";
  }

  private getPlaceholderType(nvPr: Record<string, unknown> | undefined): string {
    const ph = (nvPr?.["p:ph"] as Record<string, unknown>[])?.[0];
    return ((ph?.["$"] as Record<string, string>)?.type) || "";
  }

  private mapPlaceholderToType(phType: string, name: string): ElementType {
    const typeMap: Record<string, ElementType> = {
      title: "title",
      ctrTitle: "title",
      subTitle: "subtitle",
      body: "body",
      dt: "date",
      ftr: "footer",
      sldNum: "slideNumber",
    };

    if (typeMap[phType]) return typeMap[phType];

    // Fallback basierend auf Name
    const lowerName = name.toLowerCase();
    if (lowerName.includes("title")) return "title";
    if (lowerName.includes("subtitle")) return "subtitle";
    if (lowerName.includes("content") || lowerName.includes("body")) return "body";

    return "textbox";
  }

  private mapTypeToRole(type: ElementType): SemanticRole {
    const roleMap: Record<ElementType, SemanticRole> = {
      title: "H1",
      subtitle: "H2",
      body: "P",
      paragraph: "P",
      list: "L",
      listItem: "LI",
      table: "Table",
      image: "Figure",
      shape: "Figure",
      chart: "Figure",
      smartart: "Figure",
      group: "Sect",
      textbox: "P",
      footer: "Artifact",
      slideNumber: "Artifact",
      date: "Artifact",
      unknown: "Span",
    };
    return roleMap[type] || "Span";
  }

  private extractPosition(
    spPr: Record<string, unknown> | undefined
  ): SlideElement["position"] {
    const xfrm = (spPr?.["a:xfrm"] as Record<string, unknown>[])?.[0];
    const off = (xfrm?.["a:off"] as Record<string, unknown>[])?.[0];
    const ext = (xfrm?.["a:ext"] as Record<string, unknown>[])?.[0];

    const offAttrs = (off?.["$"] as Record<string, string>) || {};
    const extAttrs = (ext?.["$"] as Record<string, string>) || {};

    return {
      x: parseInt(offAttrs.x || "0") / EMU_TO_PX,
      y: parseInt(offAttrs.y || "0") / EMU_TO_PX,
      width: parseInt(extAttrs.cx || "0") / EMU_TO_PX,
      height: parseInt(extAttrs.cy || "0") / EMU_TO_PX,
      zOrder: 0,
    };
  }

  private extractTextContent(
    txBody: Record<string, unknown> | undefined
  ): { text: string; richText: RichTextRun[] } {
    if (!txBody)
      return { text: "", richText: [] };

    const paragraphs = (txBody["a:p"] as Record<string, unknown>[]) || [];
    let fullText = "";
    const richText: RichTextRun[] = [];

    for (const p of paragraphs) {
      const runs = (p["a:r"] as Record<string, unknown>[]) || [];
      for (const r of runs) {
        const t = (r["a:t"] as string[])?.join("") || "";
        const rPr = (r["a:rPr"] as Record<string, unknown>[])?.[0];

        fullText += t;
        richText.push({
          text: t,
          bold: !!rPr?.["a:b"],
          italic: !!rPr?.["a:i"],
          underline: !!rPr?.["a:u"],
        });
      }

      // Zeilenumbruch zwischen Absätzen
      if (paragraphs.indexOf(p) < paragraphs.length - 1) {
        fullText += "\n";
      }
    }

    return { text: fullText, richText };
  }

  private extractAltText(
    cNvPr: Record<string, unknown> | undefined
  ): { altText?: string; isDecorative: boolean; longDescription?: string } {
    if (!cNvPr) return { isDecorative: false };

    const attrs = (cNvPr["$"] as Record<string, string>) || {};
    const descr = attrs.descr;
    const title = attrs.title;

    // Decorative erkennen
    const extLst = (cNvPr["a:extLst"] as Record<string, unknown>[])?.[0];
    const decorative = this.extractDecorativeFlag(extLst);

    return {
      altText: descr || title,
      isDecorative: decorative || descr === "" || descr === " ",
      longDescription: title && descr ? descr : undefined,
    };
  }

  private extractDecorativeFlag(
    extLst: Record<string, unknown> | undefined
  ): boolean {
    if (!extLst) return false;

    const exts = (extLst["a:ext"] as Record<string, unknown>[]) || [];
    for (const ext of exts) {
      // Microsoft decorative marker
      const decorative = ext["adec:decorative"];
      if (decorative) {
        const val = ((decorative as Record<string, unknown>[])?.[0]?.["$"] as Record<string, string>)?.val;
        return val === "1" || val === "true";
      }
    }
    return false;
  }

  private extractHyperlink(
    txBody: Record<string, unknown> | undefined
  ): string | undefined {
    if (!txBody) return undefined;

    const paragraphs = (txBody["a:p"] as Record<string, unknown>[]) || [];
    for (const p of paragraphs) {
      const runs = (p["a:r"] as Record<string, unknown>[]) || [];
      for (const r of runs) {
        const rPr = (r["a:rPr"] as Record<string, unknown>[])?.[0];
        const hlinkClick = (rPr?.["a:hlinkClick"] as Record<string, unknown>[])?.[0];
        if (hlinkClick) {
          const attrs = (hlinkClick["$"] as Record<string, string>) || {};
          return attrs["r:id"]; // Relationship ID - muss aufgelöst werden
        }
      }
    }
    return undefined;
  }

  private extractStyle(
    txBody: Record<string, unknown> | undefined,
    spPr: Record<string, unknown> | undefined
  ): SlideElement["style"] {
    const style: SlideElement["style"] = {};

    // Textfarbe extrahieren
    if (txBody) {
      const paragraphs = (txBody["a:p"] as Record<string, unknown>[]) || [];
      for (const p of paragraphs) {
        const runs = (p["a:r"] as Record<string, unknown>[]) || [];
        for (const r of runs) {
          const rPr = (r["a:rPr"] as Record<string, unknown>[])?.[0];
          if (rPr) {
            // Solid fill color
            const solidFill = (rPr["a:solidFill"] as Record<string, unknown>[])?.[0];
            if (solidFill) {
              const color = this.extractColor(solidFill);
              if (color) {
                style.textColor = color;
                // Warnung bei heller/weißer Schrift
                if (this.isLightColor(color)) {
                  style.isLightText = true;
                }
              }
            }
          }
        }
      }
    }

    // Hintergrundfarbe extrahieren
    if (spPr) {
      const solidFill = (spPr["a:solidFill"] as Record<string, unknown>[])?.[0];
      if (solidFill) {
        const color = this.extractColor(solidFill);
        if (color) {
          style.backgroundColor = color;
        }
      }
    }

    return style;
  }

  /**
   * Extrahiert eine Farbe aus einem Fill-Element
   */
  private extractColor(fill: Record<string, unknown>): string | undefined {
    // srgbClr (Standard RGB)
    const srgbClr = (fill["a:srgbClr"] as Record<string, unknown>[])?.[0];
    if (srgbClr) {
      const val = ((srgbClr["$"] as Record<string, string>)?.val) || "";
      if (val) return `#${val}`;
    }

    // schemeClr (Theme-Farbe)
    const schemeClr = (fill["a:schemeClr"] as Record<string, unknown>[])?.[0];
    if (schemeClr) {
      const val = ((schemeClr["$"] as Record<string, string>)?.val) || "";
      // Theme-Farben zuordnen (vereinfacht)
      const schemeMap: Record<string, string> = {
        "tx1": "#000000", // Dunkel
        "tx2": "#000000",
        "bg1": "#FFFFFF", // Hell/Weiß
        "bg2": "#FFFFFF",
        "lt1": "#FFFFFF",
        "lt2": "#F0F0F0",
        "dk1": "#000000",
        "dk2": "#333333",
      };
      if (schemeMap[val]) return schemeMap[val];
    }

    return undefined;
  }

  /**
   * Prüft ob eine Farbe hell/weiß ist
   */
  private isLightColor(hexColor: string): boolean {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Luminanz berechnen
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.8; // > 80% ist "hell"
  }

  private determineAltTextStatus(
    altText: string | undefined,
    isDecorative: boolean,
    elementType: ElementType
  ): AltTextStatus {
    if (isDecorative) return "decorative";
    if (!altText) return "missing";
    if (altText.trim() === "") return "missing";
    return "present";
  }

  private async parseTheme(): Promise<Presentation["theme"]> {
    // Vereinfachte Theme-Extraktion
    return {
      name: "Default",
      colors: {},
      fonts: {
        heading: "Arial",
        body: "Arial",
      },
    };
  }

  private calculateStats(slides: Slide[]): Presentation["stats"] {
    let totalElements = 0;
    let imagesWithAltText = 0;
    let imagesWithoutAltText = 0;
    let decorativeImages = 0;
    let tables = 0;
    let lists = 0;
    let links = 0;

    for (const slide of slides) {
      for (const element of slide.elements) {
        totalElements++;

        if (element.type === "image" || element.type === "chart") {
          if (element.isDecorative) {
            decorativeImages++;
          } else if (element.content.altTextStatus === "present") {
            imagesWithAltText++;
          } else {
            imagesWithoutAltText++;
          }
        }

        if (element.type === "table") tables++;
        if (element.type === "list") lists++;
        if (element.hyperlink) links++;
      }
    }

    return {
      totalElements,
      imagesWithAltText,
      imagesWithoutAltText,
      decorativeImages,
      tables,
      lists,
      links,
    };
  }

  private collectGlobalIssues(
    metadata: Presentation["metadata"],
    slides: Slide[]
  ): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Dokumenttitel prüfen
    if (!metadata.title?.trim()) {
      issues.push({
        id: "issue-global-no-title",
        type: "missing_document_title",
        severity: "error",
        message: "Document has no title",
        messageDE: "Dokument hat keinen Titel",
        wcagCriteria: "2.4.2",
        pdfuaClause: "7.1",
        suggestion: "Add a document title in File > Info > Properties",
        suggestionDE:
          "Fügen Sie einen Dokumenttitel unter Datei > Info > Eigenschaften hinzu",
        autoFixable: true,
      });
    }

    // Sprache prüfen
    if (!metadata.language || metadata.language === "und") {
      issues.push({
        id: "issue-global-no-language",
        type: "missing_language",
        severity: "error",
        message: "Document language is not set",
        messageDE: "Dokumentsprache ist nicht gesetzt",
        wcagCriteria: "3.1.1",
        pdfuaClause: "7.2",
        suggestion: "Set the document language in File > Options > Language",
        suggestionDE:
          "Setzen Sie die Dokumentsprache unter Datei > Optionen > Sprache",
        autoFixable: true,
      });
    }

    return issues;
  }
}

/**
 * Barrierefreiheits-Validator für PPTX-Dateien
 *
 * Prüft vor der PDF-Konvertierung auf Probleme und generiert
 * einen umfassenden Accessibility-Report
 */

import {
  Presentation,
  Slide,
  SlideElement,
  AccessibilityIssue,
  AccessibilityReport,
  ConversionProfile,
} from "./types";

// WCAG 2.1 Kriterien mit deutschen Beschreibungen
const WCAG_CRITERIA: Record<string, { title: string; titleDE: string; level: string }> = {
  "1.1.1": { title: "Non-text Content", titleDE: "Nicht-Text-Inhalt", level: "A" },
  "1.3.1": { title: "Info and Relationships", titleDE: "Informationen und Beziehungen", level: "A" },
  "1.3.2": { title: "Meaningful Sequence", titleDE: "Bedeutungstragende Reihenfolge", level: "A" },
  "1.4.3": { title: "Contrast (Minimum)", titleDE: "Kontrast (Minimum)", level: "AA" },
  "2.4.2": { title: "Page Titled", titleDE: "Seite mit Titel versehen", level: "A" },
  "2.4.4": { title: "Link Purpose (In Context)", titleDE: "Linkzweck (im Kontext)", level: "A" },
  "2.4.6": { title: "Headings and Labels", titleDE: "Überschriften und Beschriftungen", level: "AA" },
  "3.1.1": { title: "Language of Page", titleDE: "Sprache der Seite", level: "A" },
  "3.1.2": { title: "Language of Parts", titleDE: "Sprache von Teilen", level: "AA" },
  "4.1.2": { title: "Name, Role, Value", titleDE: "Name, Rolle, Wert", level: "A" },
};

// PDF/UA-1 Klauseln
const PDFUA_CLAUSES: Record<string, { title: string; titleDE: string }> = {
  "7.1": { title: "General", titleDE: "Allgemein" },
  "7.2": { title: "Text", titleDE: "Text" },
  "7.3": { title: "Graphics", titleDE: "Grafiken" },
  "7.4": { title: "Headings", titleDE: "Überschriften" },
  "7.5": { title: "Tables", titleDE: "Tabellen" },
  "7.6": { title: "Lists", titleDE: "Listen" },
  "7.7": { title: "Mathematical Expressions", titleDE: "Mathematische Ausdrücke" },
  "7.17": { title: "Annotations", titleDE: "Anmerkungen" },
  "7.18": { title: "Artifacts", titleDE: "Artefakte" },
  "7.21": { title: "Optional Content", titleDE: "Optionaler Inhalt" },
};

export class AccessibilityValidator {
  private presentation: Presentation;
  private issues: AccessibilityIssue[] = [];
  private profile: ConversionProfile;

  constructor(presentation: Presentation, profile?: ConversionProfile) {
    this.presentation = presentation;
    this.profile = profile || this.getDefaultProfile();
  }

  /**
   * Führt alle Validierungsprüfungen durch
   */
  validate(): AccessibilityReport {
    this.issues = [];

    // Dokumentebene prüfen
    this.validateDocument();

    // Jede Folie prüfen
    for (const slide of this.presentation.slides) {
      this.validateSlide(slide);
    }

    // Issues aus der Präsentation sammeln
    this.collectPresentationIssues();

    // Report generieren
    return this.generateReport();
  }

  /**
   * Dokumentweite Validierung
   */
  private validateDocument(): void {
    const { metadata } = this.presentation;

    // Dokumenttitel prüfen (WCAG 2.4.2, PDF/UA 7.1)
    if (!metadata.title?.trim()) {
      this.addIssue({
        id: "doc-no-title",
        type: "missing_document_title",
        severity: "error",
        message: "Document title is missing",
        messageDE: "Dokumenttitel fehlt",
        wcagCriteria: "2.4.2",
        pdfuaClause: "7.1",
        suggestion: "Add a document title in File > Info > Properties",
        suggestionDE: "Fügen Sie einen Dokumenttitel unter Datei > Info > Eigenschaften hinzu",
        autoFixable: true,
      });
    }

    // Sprache prüfen (WCAG 3.1.1, PDF/UA 7.2)
    if (!metadata.language || metadata.language === "und" || metadata.language.length < 2) {
      this.addIssue({
        id: "doc-no-language",
        type: "missing_language",
        severity: "error",
        message: "Document language is not defined",
        messageDE: "Dokumentsprache ist nicht definiert",
        wcagCriteria: "3.1.1",
        pdfuaClause: "7.2",
        suggestion: "Set the document language in the presentation settings",
        suggestionDE: "Setzen Sie die Dokumentsprache in den Präsentationseinstellungen",
        autoFixable: true,
      });
    }

    // Autor prüfen (Best Practice für PDF/UA)
    if (!metadata.author?.trim()) {
      this.addIssue({
        id: "doc-no-author",
        type: "missing_metadata",
        severity: "info",
        message: "Document author is not set",
        messageDE: "Dokumentautor ist nicht gesetzt",
        suggestion: "Consider adding author information for better metadata",
        suggestionDE: "Erwägen Sie, Autorinformationen für bessere Metadaten hinzuzufügen",
        autoFixable: false,
      });
    }
  }

  /**
   * Folienvalidierung
   */
  private validateSlide(slide: Slide): void {
    // Folientitel prüfen (WCAG 2.4.2)
    this.validateSlideTitle(slide);

    // Lesereihenfolge prüfen (WCAG 1.3.2)
    this.validateReadingOrder(slide);

    // Elemente prüfen
    for (const element of slide.elements) {
      this.validateElement(element, slide.number);
    }

    // Pseudo-Tabellen erkennen
    this.validatePseudoTables(slide);

    // Hintergrund-Elemente prüfen
    for (const bgElement of slide.backgroundElements) {
      this.validateBackgroundElement(bgElement, slide.number);
    }
  }

  /**
   * Prüft Folientitel
   */
  private validateSlideTitle(slide: Slide): void {
    const titleElement = slide.elements.find(
      (e) => e.type === "title" && e.content.text?.trim()
    );

    if (!titleElement) {
      this.addIssue({
        id: `slide-${slide.number}-no-title`,
        type: "missing_title",
        severity: "warning",
        slideNumber: slide.number,
        message: `Slide ${slide.number} has no title`,
        messageDE: `Folie ${slide.number} hat keinen Titel`,
        wcagCriteria: "2.4.2",
        pdfuaClause: "7.4",
        suggestion: "Add a title to enable navigation via headings",
        suggestionDE: "Fügen Sie einen Titel hinzu, um Navigation über Überschriften zu ermöglichen",
        autoFixable: false,
      });
    }
  }

  /**
   * Prüft Lesereihenfolge
   */
  private validateReadingOrder(slide: Slide): void {
    if (slide.readingOrderConfidence < 0.7) {
      this.addIssue({
        id: `slide-${slide.number}-order-uncertain`,
        type: "reading_order_unclear",
        severity: "warning",
        slideNumber: slide.number,
        message: `Reading order on slide ${slide.number} may be incorrect`,
        messageDE: `Lesereihenfolge auf Folie ${slide.number} ist möglicherweise unkorrekt`,
        wcagCriteria: "1.3.2",
        pdfuaClause: "7.1",
        suggestion: "Review and manually adjust reading order if needed",
        suggestionDE: "Überprüfen und ggf. manuell anpassen",
        autoFixable: false,
        context: `Confidence: ${Math.round(slide.readingOrderConfidence * 100)}%`,
      });
    }

    // Überlappende Elemente prüfen
    const overlaps = this.findOverlappingElements(slide.elements);
    if (overlaps.length > 0) {
      for (const [elem1, elem2] of overlaps) {
        this.addIssue({
          id: `slide-${slide.number}-overlap-${elem1.id}-${elem2.id}`,
          type: "overlapping_elements",
          severity: "info",
          slideNumber: slide.number,
          elementId: elem1.id,
          message: `Elements "${elem1.id}" and "${elem2.id}" overlap`,
          messageDE: `Elemente "${elem1.id}" und "${elem2.id}" überlappen sich`,
          wcagCriteria: "1.3.2",
          suggestion: "Ensure overlapping elements have correct reading order",
          suggestionDE: "Stellen Sie sicher, dass überlappende Elemente die richtige Lesereihenfolge haben",
          autoFixable: false,
        });
      }
    }
  }

  /**
   * Validiert ein einzelnes Element
   */
  private validateElement(element: SlideElement, slideNumber: number): void {
    // Alt-Text für Bilder prüfen (WCAG 1.1.1, PDF/UA 7.3)
    if (element.type === "image" || element.type === "chart" || element.type === "smartart") {
      this.validateImageAltText(element, slideNumber);
    }

    // Tabellen-Header prüfen (WCAG 1.3.1, PDF/UA 7.5)
    if (element.type === "table") {
      this.validateTableStructure(element, slideNumber);
    }

    // Links prüfen (WCAG 2.4.4)
    if (element.hyperlink) {
      this.validateLink(element, slideNumber);
    }

    // Leere Textelemente
    if (
      (element.type === "body" || element.type === "textbox") &&
      !element.content.text?.trim() &&
      !element.isDecorative
    ) {
      this.addIssue({
        id: `slide-${slideNumber}-${element.id}-empty`,
        type: "empty_element",
        severity: "info",
        slideNumber,
        elementId: element.id,
        elementType: element.type,
        message: "Empty text element that is not marked as decorative",
        messageDE: "Leeres Textelement, das nicht als dekorativ markiert ist",
        suggestion: "Remove empty element or mark as decorative",
        suggestionDE: "Leeres Element entfernen oder als dekorativ markieren",
        autoFixable: true,
      });
    }
  }

  /**
   * Validiert Alt-Text für Bilder
   */
  private validateImageAltText(element: SlideElement, slideNumber: number): void {
    const { altTextStatus, altText } = element.content;

    if (element.isDecorative) {
      // Dekorativ ist OK
      return;
    }

    if (altTextStatus === "missing" || !altText?.trim()) {
      this.addIssue({
        id: `slide-${slideNumber}-${element.id}-no-alt`,
        type: "missing_alt_text",
        severity: "error",
        slideNumber,
        elementId: element.id,
        elementType: element.type,
        message: `${this.getElementTypeName(element.type)} is missing alt text`,
        messageDE: `${this.getElementTypeNameDE(element.type)} hat keinen Alternativtext`,
        wcagCriteria: "1.1.1",
        pdfuaClause: "7.3",
        suggestion: "Add descriptive alt text or mark as decorative",
        suggestionDE: "Fügen Sie beschreibenden Alt-Text hinzu oder markieren Sie als dekorativ",
        autoFixable: false,
      });
    } else if (altText && this.isLowQualityAltText(altText)) {
      this.addIssue({
        id: `slide-${slideNumber}-${element.id}-poor-alt`,
        type: "insufficient_alt_text",
        severity: "warning",
        slideNumber,
        elementId: element.id,
        elementType: element.type,
        message: "Alt text may not be sufficiently descriptive",
        messageDE: "Alt-Text ist möglicherweise nicht ausreichend beschreibend",
        wcagCriteria: "1.1.1",
        pdfuaClause: "7.3",
        suggestion: "Review alt text: avoid file names, generic descriptions, or overly short text",
        suggestionDE: "Überprüfen Sie den Alt-Text: Vermeiden Sie Dateinamen, generische Beschreibungen oder zu kurzen Text",
        autoFixable: false,
        context: `Current: "${altText}"`,
      });
    }
  }

  /**
   * Erkennt minderwertige Alt-Texte
   */
  private isLowQualityAltText(altText: string): boolean {
    const lowered = altText.toLowerCase().trim();

    // Dateinamen-Muster
    if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(lowered)) {
      return true;
    }

    // Generische Beschreibungen
    const genericPatterns = [
      /^bild$/,
      /^image$/,
      /^foto$/,
      /^photo$/,
      /^grafik$/,
      /^graphic$/,
      /^diagramm$/,
      /^chart$/,
      /^logo$/,
      /^icon$/,
      /^screenshot$/,
      /^img\d*$/,
      /^picture\d*$/,
      /^untitled$/,
      /^placeholder$/,
    ];

    for (const pattern of genericPatterns) {
      if (pattern.test(lowered)) {
        return true;
      }
    }

    // Zu kurz (weniger als 3 Wörter für komplexe Bilder)
    if (lowered.split(/\s+/).length < 2) {
      return true;
    }

    return false;
  }

  /**
   * Validiert Tabellenstruktur
   */
  private validateTableStructure(element: SlideElement, slideNumber: number): void {
    const tableData = element.tableData;
    if (!tableData) return;

    // Header-Zeile prüfen
    if (!tableData.hasHeaderRow && !tableData.hasHeaderColumn) {
      if (tableData.rows > 1) {
        this.addIssue({
          id: `slide-${slideNumber}-${element.id}-no-header`,
          type: "table_missing_headers",
          severity: "warning",
          slideNumber,
          elementId: element.id,
          elementType: "table",
          message: "Table has no defined header row or column",
          messageDE: "Tabelle hat keine definierte Kopfzeile oder -spalte",
          wcagCriteria: "1.3.1",
          pdfuaClause: "7.5",
          suggestion: "Mark the first row as header for screen reader navigation",
          suggestionDE: "Markieren Sie die erste Zeile als Kopf für Screenreader-Navigation",
          autoFixable: true,
        });
      }
    }

    // Leere Zellen prüfen
    let emptyCellCount = 0;
    for (const row of tableData.cells) {
      for (const cell of row) {
        if (!cell.content.trim()) {
          emptyCellCount++;
        }
      }
    }

    if (emptyCellCount > 0) {
      this.addIssue({
        id: `slide-${slideNumber}-${element.id}-empty-cells`,
        type: "table_empty_cells",
        severity: "info",
        slideNumber,
        elementId: element.id,
        elementType: "table",
        message: `Table has ${emptyCellCount} empty cells`,
        messageDE: `Tabelle hat ${emptyCellCount} leere Zellen`,
        wcagCriteria: "1.3.1",
        suggestion: 'Consider using "-" or "N/A" for intentionally empty cells',
        suggestionDE: 'Erwaegen Sie "-" oder "k.A." fuer absichtlich leere Zellen',
        autoFixable: false,
      });
    }
  }

  /**
   * Validiert Links
   */
  private validateLink(element: SlideElement, slideNumber: number): void {
    const text = element.content.text?.trim() || "";

    // Unklare Linktexte
    const unclearPatterns = [
      /^hier$/i,
      /^klick$/i,
      /^click here$/i,
      /^more$/i,
      /^mehr$/i,
      /^link$/i,
      /^read more$/i,
      /^weiterlesen$/i,
      /^details$/i,
    ];

    for (const pattern of unclearPatterns) {
      if (pattern.test(text)) {
        this.addIssue({
          id: `slide-${slideNumber}-${element.id}-unclear-link`,
          type: "unclear_link_text",
          severity: "warning",
          slideNumber,
          elementId: element.id,
          message: `Link text "${text}" is not descriptive`,
          messageDE: `Linktext "${text}" ist nicht beschreibend`,
          wcagCriteria: "2.4.4",
          pdfuaClause: "7.17",
          suggestion: "Use descriptive link text that explains the destination",
          suggestionDE: "Verwenden Sie beschreibenden Linktext, der das Ziel erklärt",
          autoFixable: false,
        });
        break;
      }
    }
  }

  /**
   * Erkennt Pseudo-Tabellen (Textboxen in Tabellenform)
   */
  private validatePseudoTables(slide: Slide): void {
    const textboxes = slide.elements.filter((e) => e.type === "textbox");
    if (textboxes.length < 4) return;

    // Gruppiere nach Y-Position
    const rows = new Map<number, SlideElement[]>();
    for (const tb of textboxes) {
      const y = Math.round(tb.position.y / 30) * 30;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push(tb);
    }

    // Prüfe auf Gitterstruktur
    const rowSizes = Array.from(rows.values()).map((r) => r.length);
    const allSameSize = rowSizes.length > 1 && rowSizes.every((s) => s === rowSizes[0]);
    const hasMultipleRowsAndCols = rows.size >= 2 && (rowSizes[0] || 0) >= 2;

    if (allSameSize && hasMultipleRowsAndCols) {
      this.addIssue({
        id: `slide-${slide.number}-pseudo-table`,
        type: "pseudo_table",
        severity: "warning",
        slideNumber: slide.number,
        message: "Text boxes arranged like a table detected",
        messageDE: "Textfelder in Tabellenanordnung erkannt",
        wcagCriteria: "1.3.1",
        pdfuaClause: "7.5",
        suggestion: "Convert to a real table for proper accessibility markup",
        suggestionDE: "Konvertieren Sie in eine echte Tabelle für korrektes Accessibility-Markup",
        autoFixable: false,
        context: `${rows.size} rows × ${rowSizes[0]} columns of textboxes`,
      });
    }
  }

  /**
   * Validiert Hintergrund-Elemente
   */
  private validateBackgroundElement(element: SlideElement, slideNumber: number): void {
    // Prüfe ob Element korrekt als dekorativ markiert ist
    if (element.type === "image" && !element.isDecorative) {
      this.addIssue({
        id: `slide-${slideNumber}-bg-${element.id}-not-decorative`,
        type: "background_not_decorative",
        severity: "info",
        slideNumber,
        elementId: element.id,
        elementType: element.type,
        message: "Background image should be marked as decorative",
        messageDE: "Hintergrundbild sollte als dekorativ markiert sein",
        pdfuaClause: "7.18",
        suggestion: "Mark background images as decorative (artifact)",
        suggestionDE: "Markieren Sie Hintergrundbilder als dekorativ (Artefakt)",
        autoFixable: true,
      });
    }
  }

  /**
   * Sammelt Issues aus der Präsentationsstruktur
   */
  private collectPresentationIssues(): void {
    // Globale Issues
    this.issues.push(...this.presentation.issues);

    // Issues aus Folien
    for (const slide of this.presentation.slides) {
      this.issues.push(...slide.issues);

      // Issues aus Elementen
      for (const element of slide.elements) {
        this.issues.push(...element.issues);
      }
    }
  }

  /**
   * Findet überlappende Elemente
   */
  private findOverlappingElements(elements: SlideElement[]): [SlideElement, SlideElement][] {
    const overlaps: [SlideElement, SlideElement][] = [];

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i].position;
        const b = elements[j].position;

        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;

        if (overlapX && overlapY) {
          overlaps.push([elements[i], elements[j]]);
        }
      }
    }

    return overlaps;
  }

  /**
   * Fügt ein Issue hinzu
   */
  private addIssue(issue: Omit<AccessibilityIssue, "id"> & { id: string }): void {
    this.issues.push(issue as AccessibilityIssue);
  }

  /**
   * Generiert den vollständigen Report
   */
  private generateReport(): AccessibilityReport {
    // Issues deduplizieren
    const uniqueIssues = this.deduplicateIssues(this.issues);

    // Nach Schweregrad zählen
    const errorCount = uniqueIssues.filter((i) => i.severity === "error").length;
    const warningCount = uniqueIssues.filter((i) => i.severity === "warning").length;
    const infoCount = uniqueIssues.filter((i) => i.severity === "info").length;

    // Gesamtbewertung
    const overallScore = this.calculateScore(errorCount, warningCount, infoCount);
    const conformance = this.determineConformance(errorCount, warningCount);

    // Summary generieren
    const summary = this.generateSummary(errorCount, warningCount, uniqueIssues);

    return {
      timestamp: new Date(),
      documentTitle: this.presentation.metadata.title || "Unbenannt",
      issues: uniqueIssues,
      summary: {
        total: uniqueIssues.length,
        errors: errorCount,
        warnings: warningCount,
        info: infoCount,
        autoFixable: uniqueIssues.filter((i) => i.autoFixable).length,
      },
      conformance,
      overallScore,
      wcagLevel: conformance.wcagLevel,
      pdfuaConformant: errorCount === 0,
      recommendations: this.generateRecommendations(uniqueIssues),
      stats: this.presentation.stats,
      reportText: summary,
      reportTextDE: this.generateSummaryDE(errorCount, warningCount, uniqueIssues),
    };
  }

  /**
   * Entfernt doppelte Issues
   */
  private deduplicateIssues(issues: AccessibilityIssue[]): AccessibilityIssue[] {
    const seen = new Set<string>();
    return issues.filter((issue) => {
      if (seen.has(issue.id)) return false;
      seen.add(issue.id);
      return true;
    });
  }

  /**
   * Berechnet einen Accessibility-Score (0-100)
   */
  private calculateScore(errors: number, warnings: number, infos: number): number {
    // Basiswert 100
    let score = 100;

    // Fehler wiegen schwer
    score -= errors * 15;

    // Warnungen wiegen mittel
    score -= warnings * 5;

    // Infos wiegen leicht
    score -= infos * 1;

    // Minimum 0
    return Math.max(0, score);
  }

  /**
   * Bestimmt Konformitätsstufe
   */
  private determineConformance(errors: number, warnings: number): AccessibilityReport["conformance"] {
    if (errors === 0 && warnings === 0) {
      return {
        wcagLevel: "AAA",
        pdfuaLevel: "PDF/UA-1",
        bitvConformant: true,
      };
    } else if (errors === 0) {
      return {
        wcagLevel: "AA",
        pdfuaLevel: "PDF/UA-1",
        bitvConformant: true,
      };
    } else if (errors <= 3) {
      return {
        wcagLevel: "A",
        pdfuaLevel: "partial",
        bitvConformant: false,
      };
    } else {
      return {
        wcagLevel: "none",
        pdfuaLevel: "none",
        bitvConformant: false,
      };
    }
  }

  /**
   * Generiert englische Zusammenfassung
   */
  private generateSummary(
    errors: number,
    warnings: number,
    issues: AccessibilityIssue[]
  ): string {
    const lines: string[] = [];

    lines.push("=== Accessibility Report ===\n");
    lines.push(`Document: ${this.presentation.metadata.title || "Untitled"}`);
    lines.push(`Date: ${new Date().toISOString()}\n`);

    if (errors === 0 && warnings === 0) {
      lines.push("✅ No accessibility issues found.\n");
    } else {
      lines.push(`Found ${errors} error(s) and ${warnings} warning(s).\n`);
    }

    if (errors > 0) {
      lines.push("--- Errors (must fix) ---");
      for (const issue of issues.filter((i) => i.severity === "error")) {
        lines.push(`• ${issue.message}`);
        if (issue.slideNumber) lines.push(`  Slide: ${issue.slideNumber}`);
        if (issue.wcagCriteria) lines.push(`  WCAG: ${issue.wcagCriteria}`);
        lines.push("");
      }
    }

    if (warnings > 0) {
      lines.push("--- Warnings (should fix) ---");
      for (const issue of issues.filter((i) => i.severity === "warning")) {
        lines.push(`• ${issue.message}`);
        if (issue.slideNumber) lines.push(`  Slide: ${issue.slideNumber}`);
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Generiert deutsche Zusammenfassung
   */
  private generateSummaryDE(
    errors: number,
    warnings: number,
    issues: AccessibilityIssue[]
  ): string {
    const lines: string[] = [];

    lines.push("=== Barrierefreiheits-Prüfbericht ===\n");
    lines.push(`Dokument: ${this.presentation.metadata.title || "Ohne Titel"}`);
    lines.push(`Datum: ${new Date().toLocaleDateString("de-DE")}\n`);

    if (errors === 0 && warnings === 0) {
      lines.push("✅ Keine Barrierefreiheitsprobleme gefunden.\n");
    } else {
      lines.push(`${errors} Fehler und ${warnings} Warnungen gefunden.\n`);
    }

    if (errors > 0) {
      lines.push("--- Fehler (müssen behoben werden) ---");
      for (const issue of issues.filter((i) => i.severity === "error")) {
        lines.push(`• ${issue.messageDE || issue.message}`);
        if (issue.slideNumber) lines.push(`  Folie: ${issue.slideNumber}`);
        if (issue.wcagCriteria) {
          const criterion = WCAG_CRITERIA[issue.wcagCriteria];
          lines.push(`  WCAG: ${issue.wcagCriteria} - ${criterion?.titleDE || criterion?.title || ""}`);
        }
        if (issue.suggestionDE) lines.push(`  Empfehlung: ${issue.suggestionDE}`);
        lines.push("");
      }
    }

    if (warnings > 0) {
      lines.push("--- Warnungen (sollten behoben werden) ---");
      for (const issue of issues.filter((i) => i.severity === "warning")) {
        lines.push(`• ${issue.messageDE || issue.message}`);
        if (issue.slideNumber) lines.push(`  Folie: ${issue.slideNumber}`);
        if (issue.suggestionDE) lines.push(`  Empfehlung: ${issue.suggestionDE}`);
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Generiert Empfehlungen basierend auf Issues
   */
  private generateRecommendations(issues: AccessibilityIssue[]): string[] {
    const recommendations: string[] = [];
    const issueTypes = new Set(issues.map((i) => i.type));

    if (issueTypes.has("missing_alt_text")) {
      recommendations.push(
        "Add alternative text to all meaningful images. In PowerPoint: Right-click image > Edit Alt Text."
      );
    }

    if (issueTypes.has("missing_title") || issueTypes.has("missing_document_title")) {
      recommendations.push(
        "Ensure all slides have titles and the document has a title. This aids navigation with assistive technology."
      );
    }

    if (issueTypes.has("table_missing_headers")) {
      recommendations.push(
        "Mark table headers properly. In PowerPoint: Table Design > Header Row checkbox."
      );
    }

    if (issueTypes.has("reading_order_unclear")) {
      recommendations.push(
        "Review reading order using the Selection Pane (Home > Arrange > Selection Pane)."
      );
    }

    if (issueTypes.has("pseudo_table")) {
      recommendations.push(
        "Convert text boxes arranged as tables into real tables for proper structure and accessibility."
      );
    }

    if (issueTypes.has("missing_language")) {
      recommendations.push(
        "Set the document language in File > Options > Language."
      );
    }

    return recommendations;
  }

  /**
   * Hilfsfunktion für Element-Typ-Namen
   */
  private getElementTypeName(type: string): string {
    const names: Record<string, string> = {
      image: "Image",
      chart: "Chart",
      smartart: "SmartArt",
      table: "Table",
    };
    return names[type] || "Element";
  }

  private getElementTypeNameDE(type: string): string {
    const names: Record<string, string> = {
      image: "Bild",
      chart: "Diagramm",
      smartart: "SmartArt",
      table: "Tabelle",
    };
    return names[type] || "Element";
  }

  /**
   * Standard-Konvertierungsprofil
   */
  private getDefaultProfile(): ConversionProfile {
    return {
      name: "Standard",
      id: "standard",
      tagMapping: {},
      autoFixOptions: {
        generateMissingAltText: false,
        markUncaptionedAsDecorative: false,
        fixEmptyTitles: false,
        setDocumentLanguage: true,
        fixReadingOrder: false,
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
 * Schnelle Validierungsfunktion
 */
export function validatePresentation(
  presentation: Presentation,
  profile?: ConversionProfile
): AccessibilityReport {
  const validator = new AccessibilityValidator(presentation, profile);
  return validator.validate();
}

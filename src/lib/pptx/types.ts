/**
 * PPTX Struktur-Typen für barrierefreie PDF-Konvertierung
 */

// Basis-Element-Typen
export type ElementType =
  | "title"
  | "subtitle"
  | "body"
  | "paragraph"
  | "list"
  | "listItem"
  | "table"
  | "image"
  | "shape"
  | "chart"
  | "smartart"
  | "group"
  | "textbox"
  | "footer"
  | "slideNumber"
  | "date"
  | "unknown";

// Semantische Rollen für PDF-Tagging
export type SemanticRole =
  | "H1"
  | "H2"
  | "H3"
  | "P"
  | "L"
  | "LI"
  | "Lbl"
  | "LBody"
  | "Table"
  | "TR"
  | "TH"
  | "TD"
  | "Figure"
  | "Caption"
  | "Link"
  | "Note"
  | "Artifact"
  | "Span"
  | "Document"
  | "Part"
  | "Sect";

// Alt-Text Status
export type AltTextStatus =
  | "present"
  | "missing"
  | "decorative"
  | "needs_review";

// Konvertierungs-Profil
export interface ConversionProfile {
  name: string;
  id: string;
  description?: string;

  // Tag-Mapping
  tagMapping: Partial<Record<ElementType, SemanticRole>>;

  // Auto-Fix Optionen
  autoFixOptions: {
    generateMissingAltText: boolean;
    markUncaptionedAsDecorative: boolean;
    fixEmptyTitles: boolean;
    setDocumentLanguage: boolean;
    fixReadingOrder: boolean;
    convertPseudoTables: boolean;
  };

  // Export-Optionen
  exportOptions: {
    pdfVersion: string;
    pdfUaConformance: string;
    embedFonts: boolean;
    includeBookmarks: boolean;
    includeLinks: boolean;
    taggedPdf: boolean;
    linearized: boolean;
  };
}

// Einzelnes Element auf einer Folie
export interface SlideElement {
  id: string;
  type: ElementType;
  semanticRole: SemanticRole;

  // Position und Größe
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zOrder: number;
  };

  // Inhalt
  content: {
    text?: string;
    richText?: RichTextRun[];
    altText?: string;
    altTextStatus: AltTextStatus;
    longDescription?: string;
  };

  // Styling
  style: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    color?: string;
    textColor?: string;
    backgroundColor?: string;
    isLightText?: boolean; // Warnung: helle/weiße Schrift erkannt
  };

  // Hierarchie
  children?: SlideElement[];
  parentId?: string;

  // Zusätzliche Eigenschaften
  isDecorative: boolean;
  isGrouped: boolean;
  groupId?: string;
  hyperlink?: string;

  // Für Tabellen
  tableData?: TableData;

  // Für Listen
  listData?: ListData;

  // Validierungs-Ergebnisse
  issues: AccessibilityIssue[];
}

// Rich-Text Formatierung
export interface RichTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  hyperlink?: string;
  language?: string;
}

// Tabellen-Daten
export interface TableData {
  rows: number;
  columns: number;
  cells: TableCell[][];
  hasHeaderRow: boolean;
  hasHeaderColumn: boolean;
}

export interface TableCell {
  content: string;
  richText?: RichTextRun[];
  isHeader: boolean;
  scope?: "row" | "col" | "rowgroup" | "colgroup";
  rowSpan?: number;
  colSpan?: number;
}

// Listen-Daten
export interface ListData {
  type: "bullet" | "numbered";
  level: number;
  items: ListItem[];
}

export interface ListItem {
  text: string;
  content: string;
  richText?: RichTextRun[];
  level: number;
  listType: "bullet" | "ordered";
  subList?: ListData;
}

// Einzelne Folie
export interface Slide {
  number: number;
  id: string;

  // Layout-Informationen
  layout: {
    name: string;
    type: SlideLayoutType;
  };

  // Elemente in korrekter Lesereihenfolge
  elements: SlideElement[];

  // Berechnete Lesereihenfolge
  readingOrder: string[]; // Element-IDs in Lesereihenfolge
  readingOrderConfidence: number; // 0-1

  // Hintergrund/Master-Elemente (werden Artifacts)
  backgroundElements: SlideElement[];

  // Notizen
  notes?: string;

  // Validierungs-Ergebnisse
  issues: AccessibilityIssue[];
}

// Folien-Layout-Typen
export type SlideLayoutType =
  | "title"
  | "titleAndContent"
  | "sectionHeader"
  | "twoContent"
  | "comparison"
  | "titleOnly"
  | "blank"
  | "contentWithCaption"
  | "pictureWithCaption"
  | "custom";

// Gesamte Präsentation
export interface Presentation {
  // Metadaten
  metadata: {
    title: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    language: string;
    createdDate?: Date;
    modifiedDate?: Date;
  };

  // Folien
  slides: Slide[];

  // Master/Theme-Informationen
  theme: {
    name: string;
    colors: Record<string, string>;
    fonts: {
      heading: string;
      body: string;
    };
  };

  // Globale Validierungs-Ergebnisse
  issues: AccessibilityIssue[];

  // Statistiken
  stats: {
    totalElements: number;
    imagesWithAltText: number;
    imagesWithoutAltText: number;
    decorativeImages: number;
    tables: number;
    lists: number;
    links: number;
  };
}

// Barrierefreiheits-Problem
export interface AccessibilityIssue {
  id: string;
  type: IssueType;
  severity: "error" | "warning" | "info";

  // Lokalisierung
  slideNumber?: number;
  elementId?: string;
  elementType?: ElementType;

  // Beschreibung
  message: string;
  messageDE: string;

  // WCAG/PDF-UA Referenz
  wcagCriteria?: string;
  pdfuaClause?: string;

  // Fix-Vorschlag
  suggestion?: string;
  suggestionDE?: string;
  autoFixable: boolean;

  // Kontext
  context?: string;
}

export type IssueType =
  // Alt-Text
  | "missing_alt_text"
  | "empty_alt_text"
  | "decorative_not_marked"
  | "insufficient_alt_text"
  // Struktur
  | "missing_title"
  | "heading_hierarchy"
  | "reading_order_unclear"
  | "pseudo_table"
  | "empty_element"
  | "overlapping_elements"
  // Tabellen
  | "table_missing_headers"
  | "table_complex_structure"
  | "table_empty_cells"
  // Links
  | "link_text_empty"
  | "link_text_generic"
  | "link_text_url_only"
  | "unclear_link_text"
  // Metadaten
  | "missing_language"
  | "missing_document_title"
  | "missing_metadata"
  // Kontrast/Farbe
  | "insufficient_contrast"
  | "color_only_information"
  | "small_text"
  // Fonts
  | "font_not_embedded"
  | "unicode_mapping_issue"
  // Sonstiges
  | "grouped_content_order"
  | "flattened_content"
  | "background_not_decorative";

// Konvertierungs-Ergebnis
export interface ConversionResult {
  success: boolean;

  // Output
  pdfBuffer?: Buffer;
  pdfFileName?: string;

  // Report
  report: AccessibilityReport;

  // Fehler (bei success=false)
  error?: string;
}

// Barrierefreiheits-Report
export interface AccessibilityReport {
  // Zeitstempel
  timestamp: Date;

  // Dokumentinfo
  documentTitle: string;

  // Zusammenfassung
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    autoFixable: number;
  };

  // Alle Issues
  issues: AccessibilityIssue[];

  // Konformitaet
  conformance: {
    wcagLevel: "AAA" | "AA" | "A" | "none";
    pdfuaLevel: "PDF/UA-1" | "partial" | "none";
    bitvConformant: boolean;
  };

  // Score (0-100)
  overallScore: number;

  // WCAG Level
  wcagLevel?: string;

  // PDF/UA konform
  pdfuaConformant: boolean;

  // Empfehlungen
  recommendations: string[];

  // Statistiken
  stats: Presentation["stats"];

  // Textreports
  reportText?: string;
  reportTextDE?: string;
}

// Export-Optionen
export interface ExportOptions {
  profile: ConversionProfile;
  outputPath?: string;
  generateReport: boolean;
  reportFormat: "json" | "html" | "both";
}

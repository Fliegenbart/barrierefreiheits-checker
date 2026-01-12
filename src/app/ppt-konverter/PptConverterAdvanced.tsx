"use client";

import { useState, useCallback, ReactNode } from "react";
import { Button, FileUpload, Input, Card } from "@/components/ui";
import { AccessibilityReport } from "@/lib/pptx/types";

type ConversionStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "converting"
  | "completed"
  | "error";

interface ConversionProfile {
  id: string;
  name: string;
  description?: string;
}

interface ConversionResult {
  success: boolean;
  downloadUrl?: string;
  reportUrl?: string;
  fileName?: string;
  fileSize?: number;
  report?: AccessibilityReport;
  warnings?: string[];
  errors?: string[];
  aiEnhancements?: {
    altTextsGenerated: number;
    titlesGenerated: number;
    processingTimeMs: number;
  };
}

export function PptConverterAdvanced() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Erweiterte Optionen
  const [selectedProfile, setSelectedProfile] = useState("standard");
  const [customTitle, setCustomTitle] = useState("");
  const [language, setLanguage] = useState("de");
  const [validateOnly, setValidateOnly] = useState(false);
  const [useAI, setUseAI] = useState(true); // KI-Unterstützung standardmäßig aktiv
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Profile
  const profiles: ConversionProfile[] = [
    { id: "standard", name: "Standard", description: "Empfohlen für die meisten Präsentationen" },
    { id: "strict", name: "Strikt (BITV 2.0)", description: "Maximale Barrierefreiheit für öffentliche Stellen" },
    { id: "quick", name: "Schnell", description: "Basis-Tags ohne erweiterte Prüfung" },
  ];

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setStatus("idle");
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setStatus("uploading");
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("profile", selectedProfile);
      formData.append("language", language);
      formData.append("validateOnly", validateOnly.toString());
      formData.append("includeReport", "true");
      formData.append("useAI", useAI.toString());

      if (customTitle.trim()) {
        formData.append("title", customTitle.trim());
      }

      setProgress(30);
      setStatus("analyzing");

      const response = await fetch("/api/convert/pptx-to-pdf-ua", {
        method: "POST",
        body: formData,
      });

      setProgress(70);

      if (!validateOnly) {
        setStatus("converting");
      }

      const data: ConversionResult = await response.json();

      setProgress(100);

      if (!data.success) {
        throw new Error(data.errors?.[0] || "Konvertierung fehlgeschlagen");
      }

      setStatus("completed");
      setResult(data);

    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten"
      );
    }
  }, [file, selectedProfile, customTitle, language, validateOnly, useAI]);

  const handleReset = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
    setCustomTitle("");
    setValidateOnly(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusText = (): string => {
    switch (status) {
      case "uploading": return "Datei wird hochgeladen...";
      case "analyzing": return "Barrierefreiheit wird geprüft...";
      case "converting": return "PDF/UA wird erstellt...";
      default: return "";
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Upload-Bereich */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">
          PowerPoint-Datei hochladen
        </h2>

        <FileUpload
          label="PPTX-Datei auswählen"
          acceptedFormats={[".pptx"]}
          maxSizeMB={100}
          onFileSelect={handleFileSelect}
          helperText="Unterstütztes Format: .pptx (max. 100 MB)"
          disabled={status !== "idle" && status !== "completed" && status !== "error"}
        />

        {/* Profil-Auswahl */}
        {file && (
          <div className="mt-6">
            <fieldset>
              <legend className="text-sm font-medium text-gray-700 mb-3">
                Konvertierungsprofil
              </legend>
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <label
                    key={profile.id}
                    className={`
                      flex items-start p-3 rounded-lg border cursor-pointer
                      transition-colors duration-150
                      ${selectedProfile === profile.id
                        ? "border-bund-blue bg-bund-blue-light"
                        : "border-gray-200 hover:border-gray-300"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={profile.id}
                      checked={selectedProfile === profile.id}
                      onChange={(e) => setSelectedProfile(e.target.value)}
                      className="mt-1 mr-3"
                      disabled={status !== "idle"}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        {profile.name}
                      </span>
                      {profile.description && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          {profile.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Erweiterte Optionen */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                aria-expanded={showAdvanced}
              >
                <ChevronIcon
                  className={`w-4 h-4 transition-transform ${
                    showAdvanced ? "rotate-90" : ""
                  }`}
                />
                Erweiterte Optionen
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  <Input
                    label="Dokumenttitel (optional)"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Wird aus PowerPoint übernommen wenn leer"
                    disabled={status !== "idle"}
                  />

                  <div>
                    <label
                      htmlFor="language"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Dokumentsprache
                    </label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-bund-blue focus:border-transparent"
                      disabled={status !== "idle"}
                    >
                      <option value="de">Deutsch</option>
                      <option value="en">Englisch</option>
                      <option value="fr">Französisch</option>
                      <option value="es">Spanisch</option>
                      <option value="it">Italienisch</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-bund-blue focus:ring-bund-blue"
                      disabled={status !== "idle"}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        KI-Unterstützung (Ollama)
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatische Alt-Text-Generierung für Bilder und Diagramme,
                        optimiert für sehbehinderte Menschen
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={validateOnly}
                      onChange={(e) => setValidateOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-bund-blue focus:ring-bund-blue"
                      disabled={status !== "idle"}
                    />
                    <span className="text-sm text-gray-700">
                      Nur prüfen (kein PDF erstellen)
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Datei-Info und Konvertieren-Button */}
        {file && status === "idle" && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileIcon className="w-10 h-10 text-bund-blue" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button onClick={handleConvert}>
                {validateOnly ? "Prüfen" : "Konvertieren"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Fortschrittsanzeige */}
      {(status === "uploading" || status === "analyzing" || status === "converting") && (
        <div role="status" aria-live="polite">
          <Card className="mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {getStatusText()}
            </h2>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Fortschritt</span>
                <span>{progress}%</span>
              </div>
              <div
                className="h-3 bg-gray-200 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-bund-blue transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <LoadingSpinner />
              <span>
                {status === "analyzing"
                  ? "Struktur und Barrierefreiheit werden analysiert..."
                  : status === "converting"
                  ? "PDF/UA-konformes Dokument wird erstellt..."
                  : "Datei wird zum Server übertragen..."}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Erfolgsmeldung */}
      {status === "completed" && result?.success && (
        <div role="alert">
          <Card className="mb-6 border-success bg-success-light">
            <div className="flex items-start gap-4">
              <SuccessIcon className="w-8 h-8 text-success flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {validateOnly ? "Prüfung abgeschlossen!" : "Konvertierung erfolgreich!"}
                </h2>

                {/* AI-Enhancement Ergebnisse */}
                {result.aiEnhancements && (
                  <div className="mt-4 p-4 bg-bund-blue-light rounded-lg border border-bund-blue">
                    <div className="flex items-center gap-2 mb-2">
                      <AIIcon className="w-5 h-5 text-bund-blue" />
                      <h3 className="font-semibold text-bund-blue">
                        KI-Optimierung für Barrierefreiheit
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div className="bg-white p-2 rounded text-center">
                        <div className="text-xl font-bold text-bund-blue">
                          {result.aiEnhancements.altTextsGenerated}
                        </div>
                        <div className="text-xs text-gray-600">Alt-Texte generiert</div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="text-xl font-bold text-bund-blue">
                          {result.aiEnhancements.titlesGenerated}
                        </div>
                        <div className="text-xs text-gray-600">Folientitel ergänzt</div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="text-xl font-bold text-gray-600">
                          {(result.aiEnhancements.processingTimeMs / 1000).toFixed(1)}s
                        </div>
                        <div className="text-xs text-gray-600">Verarbeitungszeit</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Alle Bilder wurden für Screenreader beschrieben.
                    </p>
                  </div>
                )}

                {/* Report-Zusammenfassung */}
                {result.report && (
                  <ReportSummary report={result.report} />
                )}

                {/* Warnungen */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-warning-light rounded border border-warning">
                    <p className="font-medium text-gray-900 mb-2">Hinweise:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {result.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Download-Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {result.downloadUrl && (
                    <LinkButton
                      href={result.downloadUrl}
                      download={result.fileName}
                      leftIcon={<DownloadIcon className="w-4 h-4" />}
                    >
                      PDF herunterladen
                      {result.fileSize && ` (${formatFileSize(result.fileSize)})`}
                    </LinkButton>
                  )}

                  {result.reportUrl && (
                    <LinkButton
                      href={result.reportUrl}
                      variant="outline"
                      leftIcon={<ReportIcon className="w-4 h-4" />}
                    >
                      Prüfbericht (JSON)
                    </LinkButton>
                  )}

                  <Button variant="outline" onClick={handleReset}>
                    Neue Datei
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Fehlermeldung */}
      {status === "error" && error && (
        <div role="alert">
          <Card className="mb-6 border-error bg-error-light">
            <div className="flex items-start gap-4">
              <ErrorIcon className="w-8 h-8 text-error flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {validateOnly ? "Prüfung fehlgeschlagen" : "Konvertierung fehlgeschlagen"}
                </h2>
                <p className="text-gray-700 mb-4">{error}</p>
                <Button variant="outline" onClick={handleReset}>
                  Erneut versuchen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Report-Zusammenfassung Komponente
function ReportSummary({ report }: { report: AccessibilityReport }) {
  const { summary, conformance, overallScore } = report;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-error";
  };

  const getConformanceLabel = () => {
    if (conformance.wcagLevel === "AAA") return "Vollständig konform";
    if (conformance.wcagLevel === "AA") return "Weitgehend konform";
    if (conformance.wcagLevel === "A") return "Teilweise konform";
    return "Nicht konform";
  };

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">Prüfergebnis</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore}
          </div>
          <div className="text-xs text-gray-600">Score</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded">
          <div className={`text-2xl font-bold ${summary.errors > 0 ? "text-error" : "text-success"}`}>
            {summary.errors}
          </div>
          <div className="text-xs text-gray-600">Fehler</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded">
          <div className={`text-2xl font-bold ${summary.warnings > 0 ? "text-warning" : "text-success"}`}>
            {summary.warnings}
          </div>
          <div className="text-xs text-gray-600">Warnungen</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-bund-blue">
            {conformance.wcagLevel || "–"}
          </div>
          <div className="text-xs text-gray-600">WCAG</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Status:</span>
        <span className={conformance.bitvConformant ? "text-success" : "text-warning"}>
          {getConformanceLabel()}
        </span>
        {conformance.pdfuaLevel === "PDF/UA-1" && (
          <span className="ml-2 px-2 py-0.5 bg-bund-blue text-white text-xs rounded">
            PDF/UA-1
          </span>
        )}
      </div>
    </div>
  );
}

// Link-Button Komponente
interface LinkButtonProps {
  href: string;
  download?: string;
  leftIcon?: ReactNode;
  children: ReactNode;
  variant?: "primary" | "outline";
}

function LinkButton({
  href,
  download,
  leftIcon,
  children,
  variant = "primary",
}: LinkButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    px-4 py-2 font-semibold rounded-md
    transition-colors duration-150
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bund-blue focus-visible:ring-offset-2
  `;

  const variantClasses =
    variant === "primary"
      ? "bg-bund-blue text-white hover:bg-bund-blue-dark"
      : "border-2 border-bund-blue text-bund-blue hover:bg-bund-blue-light";

  return (
    <a
      href={href}
      download={download}
      className={`${baseClasses} ${variantClasses}`.trim()}
    >
      {leftIcon}
      {children}
    </a>
  );
}

// Icons
function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-bund-blue"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function AIIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

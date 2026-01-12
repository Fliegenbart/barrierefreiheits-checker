"use client";

import { useState, useCallback } from "react";
import { Button, FileUpload, Card } from "@/components/ui";

interface CheckResult {
  id: string;
  category: string;
  categoryDE: string;
  name: string;
  nameDE: string;
  status: "passed" | "failed" | "warning" | "manual";
  message: string;
  messageDE: string;
  wcagCriteria?: string;
  pdfuaClause?: string;
  severity: "error" | "warning" | "info";
}

interface AnalysisResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount?: number;
  isTagged?: boolean;
  hasTitle?: boolean;
  language?: string;
  checks: CheckResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    manual: number;
    score: number;
  };
  conformance: {
    wcagLevel: "AAA" | "AA" | "A" | "none";
    pdfua: boolean;
    bitv: boolean;
  };
}

type AnalysisStatus = "idle" | "uploading" | "analyzing" | "completed" | "error";

export function DokumentPruefer() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setStatus("analyzing");

      const response = await fetch("/api/analyze/document", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analyse fehlgeschlagen");
      }

      setResult(data);
      setStatus("completed");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten"
      );
    }
  }, [file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setActiveCategory(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Gruppiere Checks nach Kategorie
  const groupedChecks = result?.checks.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = {
        name: check.categoryDE,
        checks: [],
      };
    }
    acc[check.category].checks.push(check);
    return acc;
  }, {} as Record<string, { name: string; checks: CheckResult[] }>) || {};

  return (
    <div className="max-w-4xl">
      {/* Upload */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Dokument hochladen</h2>

        <FileUpload
          label="PDF oder Word-Dokument auswählen"
          acceptedFormats={[".pdf", ".docx", ".doc"]}
          maxSizeMB={50}
          onFileSelect={handleFileSelect}
          helperText="Unterstützte Formate: PDF, DOCX, DOC (max. 50 MB)"
          disabled={status === "uploading" || status === "analyzing"}
        />

        {file && status === "idle" && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileIcon className="w-10 h-10 text-bund-blue" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button onClick={handleAnalyze}>Prüfung starten</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Fortschritt */}
      {(status === "uploading" || status === "analyzing") && (
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <LoadingSpinner />
            <div>
              <p className="font-medium text-gray-900">
                {status === "uploading"
                  ? "Dokument wird hochgeladen..."
                  : "Barrierefreiheit wird analysiert..."}
              </p>
              <p className="text-sm text-gray-500">
                Dies kann je nach Dokumentgröße einen Moment dauern.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Ergebnis */}
      {status === "completed" && result && (
        <div className="space-y-6">
          {/* Zusammenfassung */}
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">{result.fileName}</h2>
                <p className="text-sm text-gray-500">
                  {result.fileType} | {formatFileSize(result.fileSize)}
                  {result.pageCount && ` | ${result.pageCount} Seiten`}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-3xl font-bold ${
                    result.summary.score >= 80
                      ? "text-success"
                      : result.summary.score >= 50
                      ? "text-warning"
                      : "text-error"
                  }`}
                >
                  {result.summary.score}%
                </div>
                <p className="text-sm text-gray-500">Barrierefreiheits-Score</p>
              </div>
            </div>

            {/* Status-Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatusBadge
                label="Bestanden"
                count={result.summary.passed}
                type="success"
              />
              <StatusBadge
                label="Fehlgeschlagen"
                count={result.summary.failed}
                type="error"
              />
              <StatusBadge
                label="Warnungen"
                count={result.summary.warnings}
                type="warning"
              />
              <StatusBadge
                label="Manuell prüfen"
                count={result.summary.manual}
                type="info"
              />
            </div>

            {/* Konformität */}
            <div className="flex flex-wrap gap-3">
              <ConformanceBadge
                label="WCAG 2.1"
                level={result.conformance.wcagLevel}
                passed={result.conformance.wcagLevel !== "none"}
              />
              <ConformanceBadge
                label="PDF/UA"
                passed={result.conformance.pdfua}
              />
              <ConformanceBadge
                label="BITV 2.0"
                passed={result.conformance.bitv}
              />
            </div>

            {/* Dokument-Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-3">Dokument-Eigenschaften</h3>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Getaggt</dt>
                  <dd className="font-medium">
                    {result.isTagged ? (
                      <span className="text-success">Ja</span>
                    ) : (
                      <span className="text-error">Nein</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Titel</dt>
                  <dd className="font-medium">
                    {result.hasTitle ? (
                      <span className="text-success">Vorhanden</span>
                    ) : (
                      <span className="text-error">Fehlt</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Sprache</dt>
                  <dd className="font-medium">
                    {result.language || (
                      <span className="text-error">Nicht gesetzt</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Detaillierte Prüfungen */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Detaillierte Prüfung</h2>

            <div className="space-y-4">
              {Object.entries(groupedChecks).map(([category, group]) => (
                <div key={category} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() =>
                      setActiveCategory(
                        activeCategory === category ? null : category
                      )
                    }
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    aria-expanded={activeCategory === category}
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon category={category} />
                      <span className="font-medium">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckSummary checks={group.checks} />
                      <ChevronIcon
                        className={`w-5 h-5 transition-transform ${
                          activeCategory === category ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {activeCategory === category && (
                    <div className="border-t border-gray-200 p-4 space-y-3">
                      {group.checks.map((check) => (
                        <CheckItem key={check.id} check={check} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Aktionen */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              Neues Dokument prüfen
            </Button>
          </div>
        </div>
      )}

      {/* Fehler */}
      {status === "error" && error && (
        <Card className="border-error bg-error-light">
          <div className="flex items-start gap-4">
            <ErrorIcon className="w-6 h-6 text-error flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">
                Analyse fehlgeschlagen
              </h2>
              <p className="text-gray-700">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleReset}
              >
                Erneut versuchen
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({
  label,
  count,
  type,
}: {
  label: string;
  count: number;
  type: "success" | "error" | "warning" | "info";
}) {
  const colors = {
    success: "bg-success-light text-success",
    error: "bg-error-light text-error",
    warning: "bg-warning-light text-warning",
    info: "bg-gray-100 text-gray-600",
  };

  return (
    <div className={`p-3 rounded-lg ${colors[type]}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function ConformanceBadge({
  label,
  level,
  passed,
}: {
  label: string;
  level?: string;
  passed: boolean;
}) {
  return (
    <div
      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
        passed
          ? "bg-success-light text-success"
          : "bg-error-light text-error"
      }`}
    >
      {label}
      {level && level !== "none" && ` ${level}`}
      {passed ? " ✓" : " ✗"}
    </div>
  );
}

function CheckSummary({ checks }: { checks: CheckResult[] }) {
  const passed = checks.filter((c) => c.status === "passed").length;
  const failed = checks.filter((c) => c.status === "failed").length;
  const warnings = checks.filter((c) => c.status === "warning").length;

  return (
    <div className="flex items-center gap-2 text-sm">
      {passed > 0 && (
        <span className="text-success">{passed} ✓</span>
      )}
      {failed > 0 && (
        <span className="text-error">{failed} ✗</span>
      )}
      {warnings > 0 && (
        <span className="text-warning">{warnings} ⚠</span>
      )}
    </div>
  );
}

function CheckItem({ check }: { check: CheckResult }) {
  const statusIcons = {
    passed: <span className="text-success">✓</span>,
    failed: <span className="text-error">✗</span>,
    warning: <span className="text-warning">⚠</span>,
    manual: <span className="text-gray-400">?</span>,
  };

  const statusColors = {
    passed: "border-success bg-success-light",
    failed: "border-error bg-error-light",
    warning: "border-warning bg-warning-light",
    manual: "border-gray-300 bg-gray-50",
  };

  return (
    <div
      className={`p-3 rounded-lg border ${statusColors[check.status]}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{statusIcons[check.status]}</span>
        <div className="flex-1">
          <div className="font-medium">{check.nameDE}</div>
          <div className="text-sm text-gray-600 mt-1">{check.messageDE}</div>
          {(check.wcagCriteria || check.pdfuaClause) && (
            <div className="flex gap-2 mt-2 text-xs">
              {check.wcagCriteria && (
                <span className="px-2 py-0.5 bg-white rounded">
                  WCAG {check.wcagCriteria}
                </span>
              )}
              {check.pdfuaClause && (
                <span className="px-2 py-0.5 bg-white rounded">
                  PDF/UA {check.pdfuaClause}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    structure: "📄",
    images: "🖼️",
    tables: "📊",
    language: "🌐",
    links: "🔗",
    contrast: "🎨",
    metadata: "ℹ️",
  };
  return <span className="text-xl">{icons[category] || "📋"}</span>;
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-bund-blue" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

"use client";

import { useState, useCallback, ReactNode } from "react";
import { Button, FileUpload } from "@/components/ui";

type ConversionStatus =
  | "idle"
  | "uploading"
  | "converting"
  | "completed"
  | "error";

interface ConversionResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  message?: string;
  warnings?: string[];
}

export function PptConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simuliere Upload-Fortschritt
      setProgress(20);

      const response = await fetch("/api/convert/ppt-to-pdf", {
        method: "POST",
        body: formData,
      });

      setStatus("converting");
      setProgress(50);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Konvertierung fehlgeschlagen");
      }

      setProgress(100);
      setStatus("completed");
      setResult({
        success: true,
        downloadUrl: data.downloadUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        warnings: data.warnings,
      });
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
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-2xl">
      {/* Upload-Bereich */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          PowerPoint-Datei hochladen
        </h2>

        <FileUpload
          label="PowerPoint-Datei auswählen"
          acceptedFormats={[".ppt", ".pptx"]}
          maxSizeMB={50}
          onFileSelect={handleFileSelect}
          helperText="Unterstützte Formate: .ppt, .pptx (max. 50 MB)"
          disabled={status === "uploading" || status === "converting"}
        />

        {file && status === "idle" && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileIcon className="w-8 h-8 text-bund-blue" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button onClick={handleConvert}>Konvertieren</Button>
            </div>
          </div>
        )}
      </div>

      {/* Fortschrittsanzeige */}
      {(status === "uploading" || status === "converting") && (
        <div
          className="bg-white border border-gray-200 rounded-lg p-6 mb-6"
          role="status"
          aria-live="polite"
        >
          <h2 className="text-lg font-semibold mb-4">
            {status === "uploading" ? "Datei wird hochgeladen..." : "Konvertierung läuft..."}
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
              {status === "uploading"
                ? "Datei wird zum Server übertragen..."
                : "PDF wird erstellt und optimiert..."}
            </span>
          </div>
        </div>
      )}

      {/* Erfolgsmeldung */}
      {status === "completed" && result?.success && (
        <div
          className="bg-success-light border border-success rounded-lg p-6 mb-6"
          role="alert"
        >
          <div className="flex items-start gap-4">
            <SuccessIcon className="w-8 h-8 text-success flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Konvertierung erfolgreich!
              </h2>
              <p className="text-gray-700 mb-4">
                Ihre PowerPoint-Präsentation wurde erfolgreich in ein
                barrierefreies PDF konvertiert.
              </p>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-warning-light rounded border border-warning">
                  <p className="font-medium text-gray-900 mb-1">Hinweise:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
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
                <Button variant="outline" onClick={handleReset}>
                  Neue Datei konvertieren
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fehlermeldung */}
      {status === "error" && error && (
        <div
          className="bg-error-light border border-error rounded-lg p-6 mb-6"
          role="alert"
        >
          <div className="flex items-start gap-4">
            <ErrorIcon className="w-8 h-8 text-error flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Konvertierung fehlgeschlagen
              </h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <Button variant="outline" onClick={handleReset}>
                Erneut versuchen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Link-Button Komponente für Downloads
interface LinkButtonProps {
  href: string;
  download?: string;
  leftIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

function LinkButton({ href, download, leftIcon, children, className = "" }: LinkButtonProps) {
  return (
    <a
      href={href}
      download={download}
      className={`
        inline-flex items-center justify-center gap-2
        px-4 py-2 font-semibold rounded-md
        bg-bund-blue text-white hover:bg-bund-blue-dark
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bund-blue focus-visible:ring-offset-2
        ${className}
      `.trim()}
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

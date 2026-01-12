"use client";

import { useState, useCallback } from "react";
import { Button, FileUpload, Input } from "@/components/ui";

interface GeneratedAltText {
  short: string;
  detailed: string;
  context?: string;
}

type GenerationStatus = "idle" | "uploading" | "generating" | "completed" | "error";

export function AltTextGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<GeneratedAltText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setStatus("idle");

    // Erstelle Vorschau-URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (context.trim()) {
        formData.append("context", context.trim());
      }

      setStatus("generating");

      const response = await fetch("/api/generate/alt-text", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Alt-Text Generierung fehlgeschlagen");
      }

      setStatus("completed");
      setResult({
        short: data.short,
        detailed: data.detailed,
        context: data.context,
      });
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten"
      );
    }
  }, [file, context]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback für ältere Browser
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setImagePreview(null);
    setContext("");
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Eingabe-Bereich */}
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Bild hochladen</h2>

          <FileUpload
            label="Bild auswählen"
            acceptedFormats={[".jpg", ".jpeg", ".png", ".gif", ".webp"]}
            maxSizeMB={10}
            onFileSelect={handleFileSelect}
            helperText="Unterstützte Formate: JPG, PNG, GIF, WebP (max. 10 MB)"
            disabled={status === "uploading" || status === "generating"}
          />

          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Vorschau:</p>
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                <img
                  src={imagePreview}
                  alt="Vorschau des hochgeladenen Bildes"
                  className="max-h-64 w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Kontext (optional)</h2>
            <Input
              label="Verwendungskontext"
              placeholder="z.B. 'Dieses Bild wird auf der Startseite als Hero-Bild verwendet'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              helperText="Beschreiben Sie, wo und wie das Bild verwendet wird, um bessere Ergebnisse zu erhalten."
            />

            <div className="mt-6">
              <Button
                onClick={handleGenerate}
                disabled={status === "uploading" || status === "generating"}
                isLoading={status === "uploading" || status === "generating"}
                loadingText="Wird analysiert..."
                className="w-full"
              >
                Alt-Text generieren
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ergebnis-Bereich */}
      <div className="space-y-6">
        {/* Ladeanzeige */}
        {(status === "uploading" || status === "generating") && (
          <div
            className="bg-white border border-gray-200 rounded-lg p-6"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-4">
              <LoadingSpinner />
              <div>
                <p className="font-medium text-gray-900">
                  {status === "uploading"
                    ? "Bild wird hochgeladen..."
                    : "KI analysiert das Bild..."}
                </p>
                <p className="text-sm text-gray-500">
                  Dies kann einige Sekunden dauern.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Erfolgsmeldung */}
        {status === "completed" && result && (
          <div className="space-y-4">
            <div className="bg-success-light border border-success rounded-lg p-4">
              <div className="flex items-center gap-2">
                <SuccessIcon className="w-5 h-5 text-success" />
                <p className="font-medium text-gray-900">
                  Alt-Text erfolgreich generiert!
                </p>
              </div>
            </div>

            {/* Kurzer Alt-Text */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">
                  Kurzer Alt-Text
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (empfohlen)
                  </span>
                </h3>
                <span className="text-sm text-gray-500">
                  {result.short.length} Zeichen
                </span>
              </div>
              <div className="bg-gray-50 rounded p-3 mb-3">
                <p className="text-gray-900">{result.short}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(result.short, "short")}
                leftIcon={
                  copiedField === "short" ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )
                }
              >
                {copiedField === "short" ? "Kopiert!" : "Kopieren"}
              </Button>
            </div>

            {/* Detaillierter Alt-Text */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">
                  Ausführliche Beschreibung
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (für komplexe Bilder)
                  </span>
                </h3>
                <span className="text-sm text-gray-500">
                  {result.detailed.length} Zeichen
                </span>
              </div>
              <div className="bg-gray-50 rounded p-3 mb-3">
                <p className="text-gray-900">{result.detailed}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(result.detailed, "detailed")}
                leftIcon={
                  copiedField === "detailed" ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )
                }
              >
                {copiedField === "detailed" ? "Kopiert!" : "Kopieren"}
              </Button>
            </div>

            {/* HTML-Code */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                HTML-Code
              </h3>
              <div className="bg-gray-900 rounded p-3 mb-3 overflow-x-auto">
                <code className="text-sm text-green-400">
                  {`<img src="bild.jpg" alt="${result.short}" />`}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopy(`<img src="bild.jpg" alt="${result.short}" />`, "html")
                }
                leftIcon={
                  copiedField === "html" ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )
                }
              >
                {copiedField === "html" ? "Kopiert!" : "HTML kopieren"}
              </Button>
            </div>

            <Button variant="secondary" onClick={handleReset} className="w-full">
              Neues Bild analysieren
            </Button>
          </div>
        )}

        {/* Fehlermeldung */}
        {status === "error" && error && (
          <div
            className="bg-error-light border border-error rounded-lg p-6"
            role="alert"
          >
            <div className="flex items-start gap-4">
              <ErrorIcon className="w-6 h-6 text-error flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Generierung fehlgeschlagen
                </h3>
                <p className="text-gray-700 mb-4">{error}</p>
                <Button variant="outline" onClick={handleReset}>
                  Erneut versuchen
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Leerer Zustand */}
        {status === "idle" && !file && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Laden Sie ein Bild hoch, um einen Alt-Text zu generieren.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-bund-blue"
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
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
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

function ImageIcon({ className }: { className?: string }) {
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
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
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
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

"use client";

import { useState, useCallback } from "react";
import { Button, Card } from "@/components/ui";

interface ConversionResult {
  originalText: string;
  simplifiedText: string;
  explanations: Explanation[];
  stats: TextStats;
  warnings: string[];
}

interface Explanation {
  term: string;
  explanation: string;
}

interface TextStats {
  originalWordCount: number;
  simplifiedWordCount: number;
  originalSentenceCount: number;
  simplifiedSentenceCount: number;
  avgWordsPerSentenceOriginal: number;
  avgWordsPerSentenceSimplified: number;
  readabilityScore: number;
}

type ConversionStatus = "idle" | "converting" | "completed" | "error";

export function LeichteSpracheConverter() {
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLevel, setTargetLevel] = useState<"leicht" | "einfach">("leicht");

  const handleConvert = useCallback(async () => {
    if (!inputText.trim()) return;

    setStatus("converting");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/convert/leichte-sprache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          targetLevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Konvertierung fehlgeschlagen");
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
  }, [inputText, targetLevel]);

  const handleReset = useCallback(() => {
    setInputText("");
    setResult(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleCopyResult = useCallback(() => {
    if (result?.simplifiedText) {
      navigator.clipboard.writeText(result.simplifiedText);
    }
  }, [result]);

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = inputText.length;

  return (
    <div className="max-w-4xl">
      {/* Eingabebereich */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Ausgangstext</h2>
          <div className="flex items-center gap-4">
            <fieldset className="flex items-center gap-2">
              <legend className="sr-only">Zielsprache</legend>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value="leicht"
                  checked={targetLevel === "leicht"}
                  onChange={() => setTargetLevel("leicht")}
                  className="w-4 h-4 text-bund-blue"
                />
                <span className="text-sm">Leichte Sprache</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value="einfach"
                  checked={targetLevel === "einfach"}
                  onChange={() => setTargetLevel("einfach")}
                  className="w-4 h-4 text-bund-blue"
                />
                <span className="text-sm">Einfache Sprache</span>
              </label>
            </fieldset>
          </div>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Geben Sie hier den Text ein, der in Leichte Sprache umgewandelt werden soll..."
          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-bund-blue focus:border-transparent"
          aria-label="Ausgangstext eingeben"
          disabled={status === "converting"}
        />

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            {wordCount} Wörter | {charCount} Zeichen
          </div>
          <div className="flex gap-3">
            {inputText && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={status === "converting"}
              >
                Zurücksetzen
              </Button>
            )}
            <Button
              onClick={handleConvert}
              disabled={!inputText.trim() || status === "converting"}
            >
              {status === "converting" ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  Wird umgewandelt...
                </span>
              ) : (
                "In Leichte Sprache umwandeln"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Ergebnis */}
      {status === "completed" && result && (
        <div className="space-y-6">
          {/* Statistik */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Analyse</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox
                label="Wörter (Original)"
                value={result.stats.originalWordCount}
              />
              <StatBox
                label="Wörter (Vereinfacht)"
                value={result.stats.simplifiedWordCount}
              />
              <StatBox
                label="Ø Wörter/Satz (Original)"
                value={result.stats.avgWordsPerSentenceOriginal.toFixed(1)}
                highlight={result.stats.avgWordsPerSentenceOriginal > 15}
              />
              <StatBox
                label="Ø Wörter/Satz (Vereinfacht)"
                value={result.stats.avgWordsPerSentenceSimplified.toFixed(1)}
                success={result.stats.avgWordsPerSentenceSimplified <= 10}
              />
            </div>

            {result.stats.readabilityScore > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Lesbarkeits-Score</span>
                  <span
                    className={`text-lg font-bold ${
                      result.stats.readabilityScore >= 80
                        ? "text-success"
                        : result.stats.readabilityScore >= 60
                        ? "text-warning"
                        : "text-error"
                    }`}
                  >
                    {result.stats.readabilityScore}/100
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      result.stats.readabilityScore >= 80
                        ? "bg-success"
                        : result.stats.readabilityScore >= 60
                        ? "bg-warning"
                        : "bg-error"
                    }`}
                    style={{ width: `${result.stats.readabilityScore}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Vereinfachter Text */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Text in {targetLevel === "leicht" ? "Leichter" : "Einfacher"} Sprache
              </h2>
              <Button variant="outline" onClick={handleCopyResult}>
                <CopyIcon className="w-4 h-4 mr-2" />
                Kopieren
              </Button>
            </div>

            <div
              className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-lg leading-relaxed"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {result.simplifiedText}
            </div>

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
          </Card>

          {/* Worterklärungen */}
          {result.explanations && result.explanations.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Worterklärungen</h2>
              <div className="space-y-3">
                {result.explanations.map((exp, index) => (
                  <div
                    key={index}
                    className="p-3 bg-bund-blue-light rounded-lg"
                  >
                    <dt className="font-semibold text-bund-blue">{exp.term}</dt>
                    <dd className="text-gray-700 mt-1">{exp.explanation}</dd>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Fehlermeldung */}
      {status === "error" && error && (
        <Card className="border-error bg-error-light">
          <div className="flex items-start gap-4">
            <ErrorIcon className="w-6 h-6 text-error flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">
                Fehler bei der Umwandlung
              </h2>
              <p className="text-gray-700">{error}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
  success,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  success?: boolean;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg text-center">
      <div
        className={`text-2xl font-bold ${
          success ? "text-success" : highlight ? "text-warning" : "text-gray-900"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
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

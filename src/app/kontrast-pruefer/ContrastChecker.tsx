"use client";

import { useState, useCallback } from "react";
import { Button, ColorPicker } from "@/components/ui";
import { checkContrast, type ContrastCheckResult } from "@/lib/contrast";

export function ContrastChecker() {
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#FFFFFF");
  const [result, setResult] = useState<ContrastCheckResult | null>(() =>
    checkContrast("#000000", "#FFFFFF")
  );

  const handleCheck = useCallback(() => {
    const newResult = checkContrast(foreground, background);
    setResult(newResult);
  }, [foreground, background]);

  const handleForegroundChange = useCallback((color: string) => {
    setForeground(color);
    const newResult = checkContrast(color, background);
    setResult(newResult);
  }, [background]);

  const handleBackgroundChange = useCallback((color: string) => {
    setBackground(color);
    const newResult = checkContrast(foreground, color);
    setResult(newResult);
  }, [foreground]);

  const handleSwapColors = useCallback(() => {
    setForeground(background);
    setBackground(foreground);
    const newResult = checkContrast(background, foreground);
    setResult(newResult);
  }, [foreground, background]);

  const handleApplySuggestion = useCallback(() => {
    if (result?.suggestedForeground) {
      setForeground(result.suggestedForeground);
      const newResult = checkContrast(result.suggestedForeground, background);
      setResult(newResult);
    }
  }, [result, background]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Eingabe-Bereich */}
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Farben auswählen</h2>

          <div className="space-y-4">
            <ColorPicker
              label="Vordergrundfarbe (Text)"
              value={foreground}
              onChange={handleForegroundChange}
              helperText="Die Farbe des Textes oder der Grafik"
            />

            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapColors}
                aria-label="Farben tauschen"
              >
                <SwapIcon className="w-5 h-5" />
                <span className="ml-2">Farben tauschen</span>
              </Button>
            </div>

            <ColorPicker
              label="Hintergrundfarbe"
              value={background}
              onChange={handleBackgroundChange}
              helperText="Die Farbe des Hintergrunds"
            />
          </div>

          <div className="mt-6">
            <Button onClick={handleCheck} className="w-full">
              Kontrast prüfen
            </Button>
          </div>
        </div>

        {/* Vorschau */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Vorschau</h2>

          <div
            className="rounded-lg p-6 min-h-[150px] flex flex-col justify-center"
            style={{ backgroundColor: background }}
          >
            <p
              className="text-2xl font-bold mb-2"
              style={{ color: foreground }}
            >
              Überschrift Beispiel
            </p>
            <p className="text-base" style={{ color: foreground }}>
              Dies ist ein Beispieltext, um die Lesbarkeit der gewählten
              Farbkombination zu demonstrieren. Guter Kontrast ist wichtig für
              alle Nutzer.
            </p>
            <p
              className="text-sm mt-2"
              style={{ color: foreground }}
            >
              Kleiner Text (14px) - prüfen Sie ob dieser gut lesbar ist.
            </p>
          </div>
        </div>
      </div>

      {/* Ergebnis-Bereich */}
      <div className="space-y-6">
        {result && (
          <>
            {/* Kontrastverhältnis */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Ergebnis</h2>

              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {result.ratioFormatted}
                </div>
                <div
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusStyles(
                    result.recommendation.level
                  )}`}
                >
                  {result.recommendation.message}
                </div>
              </div>

              <p className="text-gray-600 text-center">
                {result.recommendation.messageDetailed}
              </p>
            </div>

            {/* WCAG Konformität */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">WCAG 2.1 Konformität</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Level AA</h3>
                  <ul className="space-y-2">
                    <ComplianceItem
                      label="Normaler Text (4.5:1)"
                      passed={result.compliance.aa.normalText}
                    />
                    <ComplianceItem
                      label="Großer Text (3:1)"
                      passed={result.compliance.aa.largeText}
                    />
                    <ComplianceItem
                      label="UI-Komponenten (3:1)"
                      passed={result.compliance.aa.uiComponents}
                    />
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Level AAA</h3>
                  <ul className="space-y-2">
                    <ComplianceItem
                      label="Normaler Text (7:1)"
                      passed={result.compliance.aaa.normalText}
                    />
                    <ComplianceItem
                      label="Großer Text (4.5:1)"
                      passed={result.compliance.aaa.largeText}
                    />
                  </ul>
                </div>
              </div>
            </div>

            {/* Verbesserungsvorschlag */}
            {result.suggestedForeground && (
              <div className="bg-warning-light border border-warning rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">
                  Verbesserungsvorschlag
                </h2>
                <p className="text-gray-700 mb-4">
                  Die aktuelle Farbkombination erfüllt nicht die Mindestanforderungen.
                  Hier ist ein Vorschlag für eine kontrastreichere Vordergrundfarbe:
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-md border border-gray-300"
                    style={{ backgroundColor: result.suggestedForeground }}
                    aria-label={`Vorgeschlagene Farbe: ${result.suggestedForeground}`}
                  />
                  <span className="font-mono text-sm">
                    {result.suggestedForeground.toUpperCase()}
                  </span>
                </div>
                <Button variant="outline" onClick={handleApplySuggestion}>
                  Vorschlag übernehmen
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ComplianceItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className="flex items-center gap-2">
      {passed ? (
        <CheckIcon className="w-5 h-5 text-success" />
      ) : (
        <XIcon className="w-5 h-5 text-error" />
      )}
      <span className={passed ? "text-gray-900" : "text-gray-500"}>
        {label}
      </span>
      <span className="sr-only">{passed ? "erfüllt" : "nicht erfüllt"}</span>
    </li>
  );
}

function getStatusStyles(level: "excellent" | "good" | "poor" | "fail"): string {
  switch (level) {
    case "excellent":
      return "bg-success-light text-success";
    case "good":
      return "bg-info-light text-info";
    case "poor":
      return "bg-warning-light text-warning";
    case "fail":
      return "bg-error-light text-error";
  }
}

function SwapIcon({ className }: { className?: string }) {
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
        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
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

function XIcon({ className }: { className?: string }) {
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
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

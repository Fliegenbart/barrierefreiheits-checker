/**
 * WCAG 2.1 Kontrast-Berechnungen
 * Basierend auf den offiziellen WCAG 2.1 Richtlinien
 */

/**
 * Parst einen Hex-Farbwert zu RGB-Komponenten
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Konvertiert RGB zu Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Berechnet die relative Leuchtdichte nach WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Berechnet das Kontrastverhältnis nach WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const lum1 = getRelativeLuminance(color1.r, color1.g, color1.b);
  const lum2 = getRelativeLuminance(color2.r, color2.g, color2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 Konformitätsstufen
 */
export interface WcagCompliance {
  // Level AA
  aa: {
    normalText: boolean; // 4.5:1
    largeText: boolean; // 3:1
    uiComponents: boolean; // 3:1
  };
  // Level AAA
  aaa: {
    normalText: boolean; // 7:1
    largeText: boolean; // 4.5:1
  };
}

/**
 * Prüft WCAG-Konformität für ein Kontrastverhältnis
 */
export function checkWcagCompliance(ratio: number): WcagCompliance {
  return {
    aa: {
      normalText: ratio >= 4.5,
      largeText: ratio >= 3,
      uiComponents: ratio >= 3,
    },
    aaa: {
      normalText: ratio >= 7,
      largeText: ratio >= 4.5,
    },
  };
}

/**
 * Formatiert das Kontrastverhältnis als String
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Generiert eine Empfehlung basierend auf dem Kontrastverhältnis
 */
export function getRecommendation(ratio: number): {
  level: "excellent" | "good" | "poor" | "fail";
  message: string;
  messageDetailed: string;
} {
  if (ratio >= 7) {
    return {
      level: "excellent",
      message: "Ausgezeichnet",
      messageDetailed:
        "Diese Farbkombination erfüllt WCAG 2.1 Level AAA für alle Textgrößen. Optimale Lesbarkeit für alle Nutzer.",
    };
  } else if (ratio >= 4.5) {
    return {
      level: "good",
      message: "Gut",
      messageDetailed:
        "Diese Farbkombination erfüllt WCAG 2.1 Level AA für normalen Text und Level AAA für großen Text.",
    };
  } else if (ratio >= 3) {
    return {
      level: "poor",
      message: "Eingeschränkt",
      messageDetailed:
        "Diese Farbkombination erfüllt nur die Mindestanforderungen für großen Text (ab 18pt oder 14pt fett) und UI-Komponenten. Nicht geeignet für normalen Fließtext.",
    };
  } else {
    return {
      level: "fail",
      message: "Unzureichend",
      messageDetailed:
        "Diese Farbkombination erfüllt nicht die WCAG 2.1 Mindestanforderungen. Bitte wählen Sie kontrastreichere Farben.",
    };
  }
}

/**
 * Schlägt eine kontrastreichere Alternative vor
 */
export function suggestBetterContrast(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  targetRatio: number = 4.5
): { r: number; g: number; b: number } {
  const bgLuminance = getRelativeLuminance(background.r, background.g, background.b);

  // Bestimme, ob wir aufhellen oder abdunkeln sollen
  const shouldLighten = bgLuminance < 0.5;

  let adjustedFg = { ...foreground };
  let currentRatio = getContrastRatio(adjustedFg, background);
  let iterations = 0;
  const maxIterations = 100;

  while (currentRatio < targetRatio && iterations < maxIterations) {
    if (shouldLighten) {
      // Aufhellen
      adjustedFg = {
        r: Math.min(255, adjustedFg.r + 5),
        g: Math.min(255, adjustedFg.g + 5),
        b: Math.min(255, adjustedFg.b + 5),
      };
    } else {
      // Abdunkeln
      adjustedFg = {
        r: Math.max(0, adjustedFg.r - 5),
        g: Math.max(0, adjustedFg.g - 5),
        b: Math.max(0, adjustedFg.b - 5),
      };
    }
    currentRatio = getContrastRatio(adjustedFg, background);
    iterations++;
  }

  return adjustedFg;
}

/**
 * Vollständiges Ergebnis einer Kontrastprüfung
 */
export interface ContrastCheckResult {
  ratio: number;
  ratioFormatted: string;
  compliance: WcagCompliance;
  recommendation: ReturnType<typeof getRecommendation>;
  foreground: string;
  background: string;
  suggestedForeground?: string;
}

/**
 * Führt eine vollständige Kontrastprüfung durch
 */
export function checkContrast(
  foregroundHex: string,
  backgroundHex: string
): ContrastCheckResult | null {
  const fg = hexToRgb(foregroundHex);
  const bg = hexToRgb(backgroundHex);

  if (!fg || !bg) return null;

  const ratio = getContrastRatio(fg, bg);
  const compliance = checkWcagCompliance(ratio);
  const recommendation = getRecommendation(ratio);

  const result: ContrastCheckResult = {
    ratio,
    ratioFormatted: formatContrastRatio(ratio),
    compliance,
    recommendation,
    foreground: foregroundHex.startsWith("#") ? foregroundHex : `#${foregroundHex}`,
    background: backgroundHex.startsWith("#") ? backgroundHex : `#${backgroundHex}`,
  };

  // Nur Vorschlag wenn Kontrast unzureichend
  if (ratio < 4.5) {
    const suggested = suggestBetterContrast(fg, bg);
    result.suggestedForeground = rgbToHex(suggested.r, suggested.g, suggested.b);
  }

  return result;
}

"use client";

import { forwardRef, InputHTMLAttributes, useId, useState } from "react";

export interface ColorPickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: string;
  helperText?: string;
  error?: string;
  value?: string;
  onChange?: (color: string) => void;
  showHexInput?: boolean;
  showPreview?: boolean;
}

export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  (
    {
      label,
      helperText,
      error,
      value = "#000000",
      onChange,
      showHexInput = true,
      showPreview = true,
      id: providedId,
      className = "",
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hexInputId = `${id}-hex`;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    const [localValue, setLocalValue] = useState(value);

    const hasError = Boolean(error);
    const describedBy = [
      helperText ? helperId : null,
      hasError ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ");

    const handleColorChange = (newColor: string) => {
      setLocalValue(newColor);
      onChange?.(newColor);
    };

    const handleHexInput = (hex: string) => {
      const cleanHex = hex.startsWith("#") ? hex : `#${hex}`;
      if (/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        handleColorChange(cleanHex);
      } else {
        setLocalValue(cleanHex);
      }
    };

    // Calculate luminance to determine if color is light or dark
    const getLuminance = (hex: string): number => {
      const clean = hex.replace("#", "");
      const r = parseInt(clean.substr(0, 2), 16) / 255;
      const g = parseInt(clean.substr(2, 2), 16) / 255;
      const b = parseInt(clean.substr(4, 2), 16) / 255;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    const isLightColor = getLuminance(localValue) > 0.6;

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label htmlFor={id} className="text-sm font-semibold text-slate-700 tracking-tight">
          {label}
          {props.required && (
            <span className="text-error ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <div className="flex items-center gap-4">
          {/* Color Picker Button */}
          <div className="relative group">
            <input
              ref={ref}
              id={id}
              type="color"
              value={localValue}
              onChange={(e) => handleColorChange(e.target.value)}
              aria-describedby={describedBy || undefined}
              className={`
                w-14 h-14 p-1.5 rounded-2xl border-2 cursor-pointer
                transition-all duration-300 ease-out
                hover:scale-105 hover:shadow-lg
                focus:outline-none focus:ring-4 focus:ring-bund-blue/20 focus:ring-offset-2
                ${hasError ? "border-error" : "border-slate-200 hover:border-slate-300"}
              `.trim().replace(/\s+/g, ' ')}
              style={{
                boxShadow: `0 4px 20px ${localValue}40`,
              }}
              {...props}
            />
            <div className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"
              style={{
                background: `radial-gradient(circle at center, ${localValue}20 0%, transparent 70%)`,
              }}
            />
          </div>

          {/* Hex Input */}
          {showHexInput && (
            <div className="flex flex-col gap-1">
              <label htmlFor={hexInputId} className="sr-only">
                Hex-Farbwert für {label}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                  #
                </span>
                <input
                  id={hexInputId}
                  type="text"
                  value={localValue.toUpperCase().replace("#", "")}
                  onChange={(e) => handleHexInput(e.target.value)}
                  pattern="^[0-9A-Fa-f]{6}$"
                  maxLength={6}
                  className={`
                    w-28 pl-7 pr-3 py-2.5 font-mono text-sm uppercase
                    border rounded-xl bg-white
                    transition-all duration-200 ease-out
                    focus:outline-none focus:ring-4 focus:ring-bund-blue/10 focus:border-bund-blue
                    ${hasError ? "border-error" : "border-slate-200 hover:border-slate-300"}
                  `.trim().replace(/\s+/g, ' ')}
                  aria-describedby={describedBy || undefined}
                />
              </div>
            </div>
          )}

          {/* Color Preview */}
          {showPreview && (
            <div
              className="w-14 h-14 rounded-2xl border-2 border-slate-200 shadow-inner overflow-hidden transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: localValue }}
              aria-hidden="true"
            >
              <div className="w-full h-full flex items-center justify-center">
                <span
                  className={`text-xs font-mono font-bold ${isLightColor ? "text-slate-900/60" : "text-white/60"}`}
                >
                  {localValue.toUpperCase().replace("#", "")}
                </span>
              </div>
            </div>
          )}
        </div>

        {helperText && !hasError && (
          <p id={helperId} className="text-sm text-slate-500 leading-relaxed">
            {helperText}
          </p>
        )}

        {hasError && (
          <div id={errorId} className="flex items-center gap-2 text-sm text-error" role="alert">
            <ErrorIcon className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

ColorPicker.displayName = "ColorPicker";

function ErrorIcon({ className }: { className?: string }) {
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
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

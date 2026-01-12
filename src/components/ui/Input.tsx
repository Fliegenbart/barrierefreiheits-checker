"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  hideLabel?: boolean;
  variant?: "default" | "filled" | "flushed";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftAddon,
      rightAddon,
      hideLabel = false,
      variant = "default",
      id: providedId,
      className = "",
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    const hasError = Boolean(error);
    const describedBy = [
      helperText ? helperId : null,
      hasError ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ");

    const variantStyles = {
      default: `
        bg-white border-slate-200
        hover:border-slate-300
        focus:border-bund-blue focus:ring-4 focus:ring-bund-blue/10
      `,
      filled: `
        bg-slate-50 border-transparent
        hover:bg-slate-100
        focus:bg-white focus:border-bund-blue focus:ring-4 focus:ring-bund-blue/10
      `,
      flushed: `
        bg-transparent border-0 border-b-2 border-slate-200 rounded-none
        hover:border-slate-300
        focus:border-bund-blue focus:ring-0
      `,
    };

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label
          htmlFor={id}
          className={`
            text-sm font-semibold text-slate-700 tracking-tight
            ${hideLabel ? "sr-only" : ""}
          `.trim()}
        >
          {label}
          {props.required && (
            <span className="text-error ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <div className="relative flex group">
          {leftAddon && (
            <div className="flex items-center px-4 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 font-medium transition-colors group-focus-within:border-bund-blue group-focus-within:bg-bund-blue-light/30">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            className={`
              flex-1 px-4 py-3
              border rounded-xl
              text-slate-900 placeholder:text-slate-400
              transition-all duration-200 ease-out
              focus:outline-none
              disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60
              ${leftAddon ? "rounded-l-none border-l-0" : ""}
              ${rightAddon ? "rounded-r-none border-r-0" : ""}
              ${hasError
                ? "border-error bg-error/5 focus:ring-4 focus:ring-error/10 focus:border-error"
                : variantStyles[variant]
              }
            `.trim().replace(/\s+/g, ' ')}
            {...props}
          />

          {rightAddon && (
            <div className="flex items-center px-4 bg-slate-50 border border-l-0 border-slate-200 rounded-r-xl text-slate-500 font-medium transition-colors group-focus-within:border-bund-blue group-focus-within:bg-bund-blue-light/30">
              {rightAddon}
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

Input.displayName = "Input";

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

"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  glow?: boolean;
}

const variantStyles = {
  primary: `
    bg-gradient-to-r from-bund-blue to-bund-blue-dark text-white
    hover:from-bund-blue-dark hover:to-bund-blue-900
    active:from-bund-blue-900 active:to-bund-blue-900
    shadow-lg shadow-bund-blue/25 hover:shadow-xl hover:shadow-bund-blue/30
  `,
  secondary: `
    bg-slate-100 text-slate-900
    hover:bg-slate-200 active:bg-slate-300
    border border-slate-200
    shadow-sm hover:shadow
  `,
  outline: `
    bg-transparent text-bund-blue
    border-2 border-bund-blue
    hover:bg-bund-blue hover:text-white
    shadow-sm hover:shadow-lg hover:shadow-bund-blue/20
  `,
  ghost: `
    bg-transparent text-bund-blue
    hover:bg-bund-blue-light/50
  `,
  danger: `
    bg-gradient-to-r from-error to-red-700 text-white
    hover:from-red-700 hover:to-red-800
    active:from-red-800 active:to-red-900
    shadow-lg shadow-error/25 hover:shadow-xl hover:shadow-error/30
  `,
  accent: `
    bg-gradient-to-r from-accent to-accent-dark text-white
    hover:from-accent-dark hover:to-teal-800
    active:from-teal-800 active:to-teal-900
    shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30
  `,
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-base gap-2",
  lg: "px-7 py-3.5 text-lg gap-2.5",
  xl: "px-9 py-4 text-xl gap-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText = "Wird geladen...",
      leftIcon,
      rightIcon,
      fullWidth = false,
      glow = false,
      children,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-semibold rounded-xl
          transition-all duration-300 ease-out
          transform hover:-translate-y-0.5 active:translate-y-0
          focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-bund-blue focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${glow ? "btn-glow" : ""}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="sr-only">{loadingText}</span>
            <LoadingSpinner />
            <span aria-hidden="true">
              {loadingText.replace("...", "")}
            </span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
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
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

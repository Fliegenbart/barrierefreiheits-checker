"use client";

import {
  forwardRef,
  InputHTMLAttributes,
  useId,
  useState,
  useCallback,
  DragEvent,
} from "react";

export interface FileUploadProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: string;
  helperText?: string;
  error?: string;
  acceptedFormats?: string[];
  maxSizeMB?: number;
  onChange?: (files: FileList | null) => void;
  onFileSelect?: (file: File) => void;
  variant?: "default" | "compact";
}

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      label,
      helperText,
      error,
      acceptedFormats = [],
      maxSizeMB = 100,
      onChange,
      onFileSelect,
      variant = "default",
      id: providedId,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    const hasError = Boolean(error || localError);
    const displayError = error || localError;

    const describedBy = [
      helperText ? helperId : null,
      hasError ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ");

    const validateFile = useCallback(
      (file: File): string | null => {
        if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
          return `Die Datei ist zu groß. Maximale Größe: ${maxSizeMB} MB`;
        }

        if (acceptedFormats.length > 0) {
          const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
          const isAccepted = acceptedFormats.some(
            (format) =>
              format.toLowerCase() === extension ||
              file.type.includes(format.replace(".", ""))
          );
          if (!isAccepted) {
            return `Dateiformat nicht unterstützt. Erlaubt: ${acceptedFormats.join(", ")}`;
          }
        }

        return null;
      },
      [acceptedFormats, maxSizeMB]
    );

    const handleFileChange = useCallback(
      (files: FileList | null) => {
        setLocalError(null);

        if (files && files.length > 0) {
          const file = files[0];
          const validationError = validateFile(file);

          if (validationError) {
            setLocalError(validationError);
            setSelectedFile(null);
            return;
          }

          setSelectedFile(file);
          onFileSelect?.(file);
        } else {
          setSelectedFile(null);
        }

        onChange?.(files);
      },
      [onChange, onFileSelect, validateFile]
    );

    const handleDragOver = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          setIsDragging(true);
        }
      },
      [disabled]
    );

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const files = e.dataTransfer.files;
        handleFileChange(files);
      },
      [disabled, handleFileChange]
    );

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const isCompact = variant === "compact";

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

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center
            border-2 border-dashed rounded-2xl
            transition-all duration-300 ease-out
            ${isCompact ? "px-4 py-5" : "px-8 py-10"}
            ${disabled
              ? "bg-slate-50 cursor-not-allowed opacity-60"
              : "cursor-pointer hover:bg-slate-50/50 hover:border-slate-300"
            }
            ${isDragging
              ? "border-bund-blue bg-bund-blue-light/20 scale-[1.02] shadow-lg shadow-bund-blue/10"
              : ""
            }
            ${hasError
              ? "border-error bg-error/5"
              : "border-slate-200"
            }
            ${selectedFile && !hasError
              ? "border-success bg-success/5 border-solid"
              : ""
            }
          `.trim().replace(/\s+/g, ' ')}
        >
          <input
            ref={ref}
            id={id}
            type="file"
            onChange={(e) => handleFileChange(e.target.files)}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            disabled={disabled}
            accept={acceptedFormats.join(",")}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />

          {selectedFile ? (
            <div className="text-center animate-fade-in">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-success/10 flex items-center justify-center">
                <CheckIcon className="w-7 h-7 text-success" />
              </div>
              <p className="font-semibold text-slate-900 text-lg">{selectedFile.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {formatFileSize(selectedFile.size)}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  onChange?.(null);
                }}
                className="mt-3 text-sm text-bund-blue hover:text-bund-blue-dark font-medium transition-colors"
              >
                Andere Datei wählen
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className={`
                mx-auto mb-4 rounded-2xl flex items-center justify-center
                transition-all duration-300
                ${isCompact ? "w-12 h-12" : "w-16 h-16"}
                ${isDragging
                  ? "bg-bund-blue/10 scale-110"
                  : "bg-gradient-to-br from-slate-100 to-slate-50"
                }
              `}>
                <UploadIcon className={`
                  transition-all duration-300
                  ${isCompact ? "w-6 h-6" : "w-8 h-8"}
                  ${isDragging ? "text-bund-blue" : "text-slate-400"}
                `} />
              </div>

              <p className={`font-medium text-slate-700 ${isCompact ? "text-sm" : "text-base"}`}>
                <span className="text-bund-blue hover:text-bund-blue-dark transition-colors">
                  Datei auswählen
                </span>
                {!isCompact && (
                  <span className="text-slate-500"> oder per Drag & Drop hierher ziehen</span>
                )}
              </p>

              <div className="mt-2 space-y-1">
                {acceptedFormats.length > 0 && (
                  <p className="text-xs text-slate-400">
                    {acceptedFormats.map(f => f.replace('.', '').toUpperCase()).join(", ")}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Max. {maxSizeMB} MB
                </p>
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
            <span>{displayError}</span>
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

function UploadIcon({ className }: { className?: string }) {
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
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
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

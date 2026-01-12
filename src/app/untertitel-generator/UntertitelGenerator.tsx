"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button, FileUpload, Card } from "@/components/ui";
import {
  isFFmpegWasmSupported,
  burnSubtitles as burnSubtitlesBrowser,
  downloadBlob,
} from "@/lib/ffmpeg-wasm";

interface Subtitle {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface TranscriptionResult {
  subtitles: Subtitle[];
  language: string;
  duration: number;
  wordCount: number;
}

interface SubtitleStyle {
  fontSize: number;
  fontName: string;
  primaryColor: string;
  outlineColor: string;
  backgroundColor: string;
  outlineWidth: number;
  shadow: boolean;
  position: "bottom" | "top" | "center";
}

type TranscriptionStatus = "idle" | "uploading" | "transcribing" | "completed" | "error";
type BurnStatus = "idle" | "burning" | "completed" | "error";
type ExportFormat = "srt" | "vtt" | "ttml";
type ProcessingMode = "server" | "browser";

const DEFAULT_STYLE: SubtitleStyle = {
  fontSize: 24,
  fontName: "Arial",
  primaryColor: "#FFFFFF",
  outlineColor: "#000000",
  backgroundColor: "#000000",
  outlineWidth: 2,
  shadow: true,
  position: "bottom",
};

export function UntertitelGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("de");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // Burn subtitles state
  const [burnStatus, setBurnStatus] = useState<BurnStatus>("idle");
  const [burnProgress, setBurnProgress] = useState(0);
  const [burnProgressMessage, setBurnProgressMessage] = useState("");
  const [burnError, setBurnError] = useState<string | null>(null);
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(DEFAULT_STYLE);
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null);
  const [ffmpegWasmSupported, setFfmpegWasmSupported] = useState<boolean>(false);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("browser");

  // Video/Audio preview state
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playingSubtitleIndex, setPlayingSubtitleIndex] = useState<number | null>(null);

  // Check FFmpeg availability on mount
  useEffect(() => {
    // Check server-side FFmpeg
    fetch("/api/burn-subtitles")
      .then((res) => res.json())
      .then((data) => setFfmpegAvailable(data.available))
      .catch(() => setFfmpegAvailable(false));

    // Check browser-side FFmpeg.wasm support
    setFfmpegWasmSupported(isFFmpegWasmSupported());
  }, []);

  // Create media URL when file changes
  useEffect(() => {
    if (!file) {
      setMediaUrl(null);
      setVideoUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setMediaUrl(url);

    // Check if it's a video file
    if (file.type.startsWith("video/") || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name)) {
      setVideoUrl(url);
    } else {
      setVideoUrl(null);
    }

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // VTT Blob URL for subtitles track
  const vttBlobUrl = useMemo(() => {
    if (!result) return null;
    const vttContent = exportToVtt(result.subtitles);
    const blob = new Blob([vttContent], { type: "text/vtt" });
    return URL.createObjectURL(blob);
  }, [result]);

  // Cleanup VTT blob URL
  useEffect(() => {
    return () => {
      if (vttBlobUrl) URL.revokeObjectURL(vttBlobUrl);
    };
  }, [vttBlobUrl]);

  // Update current time from video/audio
  const handleTimeUpdate = useCallback(() => {
    const mediaElement = videoRef.current || audioRef.current;
    if (mediaElement) {
      setCurrentTime(mediaElement.currentTime);
    }
  }, []);

  // Stop playback when reaching end of subtitle
  useEffect(() => {
    if (playingSubtitleIndex === null || !result) return;

    const subtitle = result.subtitles[playingSubtitleIndex];
    if (!subtitle) return;

    const mediaElement = videoRef.current || audioRef.current;
    if (!mediaElement) return;

    // Check if we've reached the end of the subtitle
    if (currentTime >= subtitle.endTime) {
      mediaElement.pause();
      setPlayingSubtitleIndex(null);
    }
  }, [currentTime, playingSubtitleIndex, result]);

  // Play subtitle segment (works for both video and audio)
  const handlePlaySubtitle = useCallback((index: number, startTime: number, endTime: number) => {
    const mediaElement = videoRef.current || audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = startTime;
      mediaElement.play();
      setPlayingSubtitleIndex(index);
      if (videoUrl) {
        setShowPreview(true);
      }
    }
  }, [videoUrl]);

  // Jump to subtitle position in video (legacy - for play button)
  const handleJumpToSubtitle = useCallback((startTime: number) => {
    const mediaElement = videoRef.current || audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = startTime;
      mediaElement.play();
      setPlayingSubtitleIndex(null); // Don't auto-stop when using play button
      if (videoUrl) {
        setShowPreview(true);
      }
    }
  }, [videoUrl]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setStatus("idle");
    setResult(null);
    setError(null);
    setProgress(0);
    setBurnStatus("idle");
    setBurnError(null);
    setShowPreview(false);
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!file) return;

    setStatus("uploading");
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);

      setProgress(30);
      setStatus("transcribing");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      setProgress(90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transkription fehlgeschlagen");
      }

      // Map API response to our format
      const subtitles: Subtitle[] = (data.subtitles || []).map(
        (sub: { id: number; start: number; end: number; text: string }, index: number) => ({
          index,
          startTime: sub.start,
          endTime: sub.end,
          text: sub.text,
        })
      );

      setResult({
        subtitles,
        language: data.language,
        duration: data.duration,
        wordCount: subtitles.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0),
      });
      setStatus("completed");
      setProgress(100);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten"
      );
    }
  }, [file, language]);

  const handleReset = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setProgress(0);
    setEditingIndex(null);
    setBurnStatus("idle");
    setBurnError(null);
    setShowPreview(false);
    setVideoUrl(null);
    setMediaUrl(null);
    setPlayingSubtitleIndex(null);
  }, []);

  const handleEditSubtitle = useCallback((index: number) => {
    if (result) {
      setEditingIndex(index);
      setEditText(result.subtitles[index].text);
    }
  }, [result]);

  const handleSaveEdit = useCallback(() => {
    if (result && editingIndex !== null) {
      const newSubtitles = [...result.subtitles];
      newSubtitles[editingIndex] = {
        ...newSubtitles[editingIndex],
        text: editText,
      };
      setResult({ ...result, subtitles: newSubtitles });
      setEditingIndex(null);
      setEditText("");
    }
  }, [result, editingIndex, editText]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (!result) return;

      let content: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case "srt":
          content = exportToSrt(result.subtitles);
          mimeType = "text/plain";
          extension = "srt";
          break;
        case "vtt":
          content = exportToVtt(result.subtitles);
          mimeType = "text/vtt";
          extension = "vtt";
          break;
        case "ttml":
          content = exportToTtml(result.subtitles, language);
          mimeType = "application/ttml+xml";
          extension = "ttml";
          break;
        default:
          return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file?.name.replace(/\.[^/.]+$/, "") || "untertitel"}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [result, file, language]
  );

  const handleBurnSubtitles = useCallback(async () => {
    if (!result || !file) return;

    // Check if it's a video file
    const isVideo = file.type.startsWith("video/") ||
      /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);

    if (!isVideo) {
      setBurnError("Untertitel können nur in Videodateien eingebrannt werden, nicht in Audiodateien.");
      return;
    }

    setBurnStatus("burning");
    setBurnProgress(0);
    setBurnProgressMessage("Starte Verarbeitung...");
    setBurnError(null);

    try {
      if (processingMode === "browser") {
        // Browser-based processing with FFmpeg.wasm
        const srtContent = exportToSrt(result.subtitles);

        const { blob, filename } = await burnSubtitlesBrowser({
          videoFile: file,
          srtContent,
          style: subtitleStyle,
          onProgress: (progress, message) => {
            setBurnProgress(progress);
            setBurnProgressMessage(message);
          },
        });

        downloadBlob(blob, filename);
      } else {
        // Server-based processing
        setBurnProgress(10);
        setBurnProgressMessage("Datei wird hochgeladen...");

        const formData = new FormData();
        formData.append("video", file);
        formData.append("subtitles", exportToSrt(result.subtitles));
        formData.append("style", JSON.stringify(subtitleStyle));

        setBurnProgress(30);
        setBurnProgressMessage("Video wird auf dem Server verarbeitet...");

        const response = await fetch("/api/burn-subtitles", {
          method: "POST",
          body: formData,
        });

        setBurnProgress(80);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Video-Export fehlgeschlagen");
        }

        // Download the video
        const blob = await response.blob();
        downloadBlob(blob, file.name.replace(/\.[^/.]+$/, "_untertitelt.mp4"));
      }

      setBurnStatus("completed");
      setBurnProgress(100);
      setBurnProgressMessage("Fertig!");
    } catch (err) {
      setBurnStatus("error");
      setBurnError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten"
      );
    }
  }, [result, file, subtitleStyle, processingMode]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  };

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isVideoFile = file && (
    file.type.startsWith("video/") ||
    /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name)
  );

  return (
    <div className="max-w-4xl">
      {/* Upload */}
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">Video oder Audio hochladen</h2>

        <FileUpload
          label="Mediendatei auswählen"
          acceptedFormats={[".mp4", ".webm", ".mov", ".avi", ".mp3", ".wav", ".m4a", ".ogg"]}
          maxSizeMB={25}
          onFileSelect={handleFileSelect}
          helperText="Video: MP4, WebM, MOV, AVI | Audio: MP3, WAV, M4A, OGG (max. 25 MB)"
          disabled={status !== "idle" && status !== "completed" && status !== "error"}
        />

        {file && status === "idle" && (
          <div className="mt-6 space-y-4">
            {/* Sprachauswahl */}
            <div>
              <label
                htmlFor="language"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Sprache des Videos
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full max-w-xs px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-bund-blue/10 focus:border-bund-blue transition-all"
              >
                <option value="de">Deutsch</option>
                <option value="en">Englisch</option>
                <option value="fr">Französisch</option>
                <option value="es">Spanisch</option>
                <option value="it">Italienisch</option>
              </select>
            </div>

            {/* Datei-Info */}
            <div className="p-5 bg-slate-50 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bund-blue to-bund-blue-dark flex items-center justify-center">
                    <MediaIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button onClick={handleTranscribe} size="lg">
                  Untertitel erstellen
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Fortschritt */}
      {(status === "uploading" || status === "transcribing") && (
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">
            {status === "uploading"
              ? "Datei wird hochgeladen..."
              : "Sprache wird erkannt..."}
          </h2>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Fortschritt</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-bund-blue to-accent transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <LoadingSpinner />
            <span>
              {status === "transcribing"
                ? "KI analysiert die Audioinhalte..."
                : "Datei wird zum Server übertragen..."}
            </span>
          </div>
        </Card>
      )}

      {/* Ergebnis */}
      {status === "completed" && result && (
        <div className="space-y-6">
          {/* Statistik */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Transkription abgeschlossen</h2>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleExport("srt")}>
                  SRT
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport("vtt")}>
                  VTT
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport("ttml")}>
                  TTML
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Untertitel" value={result.subtitles.length} />
              <StatBox label="Wörter" value={result.wordCount} />
              <StatBox label="Dauer" value={formatDuration(result.duration)} />
              <StatBox label="Sprache" value={getLanguageName(result.language)} />
            </div>
          </Card>

          {/* Video-Vorschau mit Untertiteln */}
          {videoUrl && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Video-Vorschau mit Untertiteln</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? "Vorschau verbergen" : "Vorschau anzeigen"}
                </Button>
              </div>

              {showPreview && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-full"
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      crossOrigin="anonymous"
                    >
                      {vttBlobUrl && (
                        <track
                          kind="subtitles"
                          src={vttBlobUrl}
                          srcLang={result.language}
                          label={getLanguageName(result.language)}
                          default
                        />
                      )}
                      Ihr Browser unterstützt keine Video-Wiedergabe.
                    </video>
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <InfoIcon className="w-4 h-4" />
                    Die Untertitel werden automatisch im Video angezeigt. Klicken Sie auf CC im Player, falls sie nicht sichtbar sind.
                  </p>
                </div>
              )}

              {!showPreview && (
                <p className="text-sm text-slate-500">
                  Sehen Sie sich eine Vorschau des Videos mit eingeblendeten Untertiteln an.
                </p>
              )}
            </Card>
          )}

          {/* Video mit eingebrannten Untertiteln */}
          {isVideoFile && (ffmpegAvailable || ffmpegWasmSupported) && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Video mit Untertiteln exportieren</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Untertitel werden direkt ins Video eingebrannt (Hardcoded)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStyleOptions(!showStyleOptions)}
                >
                  {showStyleOptions ? "Optionen verbergen" : "Styling-Optionen"}
                </Button>
              </div>

              {/* Verarbeitungsmodus-Auswahl */}
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CpuIcon className="w-5 h-5" />
                  Verarbeitungsmodus
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Browser-Option */}
                  <label
                    className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      processingMode === "browser"
                        ? "border-bund-blue bg-bund-blue/5"
                        : "border-slate-200 hover:border-slate-300"
                    } ${!ffmpegWasmSupported ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="processingMode"
                      value="browser"
                      checked={processingMode === "browser"}
                      onChange={() => setProcessingMode("browser")}
                      disabled={!ffmpegWasmSupported}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <BrowserIcon className="w-5 h-5 text-bund-blue" />
                        <span className="font-semibold text-slate-900">Im Browser</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Empfohlen
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Verarbeitung mit FFmpeg.wasm direkt im Browser. Keine Daten werden an Server gesendet.
                      </p>
                      {!ffmpegWasmSupported && (
                        <p className="text-xs text-error mt-2">
                          WebAssembly wird in diesem Browser nicht unterstützt.
                        </p>
                      )}
                    </div>
                    {processingMode === "browser" && (
                      <CheckCircleIcon className="w-5 h-5 text-bund-blue flex-shrink-0" />
                    )}
                  </label>

                  {/* Server-Option */}
                  <label
                    className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      processingMode === "server"
                        ? "border-bund-blue bg-bund-blue/5"
                        : "border-slate-200 hover:border-slate-300"
                    } ${!ffmpegAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="processingMode"
                      value="server"
                      checked={processingMode === "server"}
                      onChange={() => setProcessingMode("server")}
                      disabled={!ffmpegAvailable}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="w-5 h-5 text-slate-600" />
                        <span className="font-semibold text-slate-900">Auf Server</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Verarbeitung auf dem Server. Schneller bei großen Dateien, aber Daten werden hochgeladen.
                      </p>
                      {!ffmpegAvailable && (
                        <p className="text-xs text-error mt-2">
                          FFmpeg ist auf dem Server nicht verfügbar.
                        </p>
                      )}
                    </div>
                    {processingMode === "server" && (
                      <CheckCircleIcon className="w-5 h-5 text-bund-blue flex-shrink-0" />
                    )}
                  </label>
                </div>
              </div>

              {/* Styling-Optionen */}
              {showStyleOptions && (
                <div className="mb-6 p-5 bg-slate-50 rounded-2xl">
                  <h3 className="font-semibold text-slate-900 mb-4">Untertitel-Styling</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Schriftgröße */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Schriftgröße
                      </label>
                      <select
                        value={subtitleStyle.fontSize}
                        onChange={(e) =>
                          setSubtitleStyle({ ...subtitleStyle, fontSize: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-4 focus:ring-bund-blue/10"
                      >
                        <option value={18}>Klein (18)</option>
                        <option value={24}>Mittel (24)</option>
                        <option value={32}>Groß (32)</option>
                        <option value={40}>Sehr groß (40)</option>
                      </select>
                    </div>

                    {/* Schriftart */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Schriftart
                      </label>
                      <select
                        value={subtitleStyle.fontName}
                        onChange={(e) =>
                          setSubtitleStyle({ ...subtitleStyle, fontName: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-4 focus:ring-bund-blue/10"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Tahoma">Tahoma</option>
                        <option value="Georgia">Georgia</option>
                      </select>
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Position
                      </label>
                      <select
                        value={subtitleStyle.position}
                        onChange={(e) =>
                          setSubtitleStyle({
                            ...subtitleStyle,
                            position: e.target.value as "bottom" | "top" | "center",
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-4 focus:ring-bund-blue/10"
                      >
                        <option value="bottom">Unten</option>
                        <option value="center">Mitte</option>
                        <option value="top">Oben</option>
                      </select>
                    </div>

                    {/* Textfarbe */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Textfarbe
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={subtitleStyle.primaryColor}
                          onChange={(e) =>
                            setSubtitleStyle({ ...subtitleStyle, primaryColor: e.target.value })
                          }
                          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                        />
                        <span className="text-sm font-mono text-slate-500">
                          {subtitleStyle.primaryColor.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Umrandungsfarbe */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Umrandung
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={subtitleStyle.outlineColor}
                          onChange={(e) =>
                            setSubtitleStyle({ ...subtitleStyle, outlineColor: e.target.value })
                          }
                          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                        />
                        <span className="text-sm font-mono text-slate-500">
                          {subtitleStyle.outlineColor.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Schatten */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Schatten
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={subtitleStyle.shadow}
                          onChange={(e) =>
                            setSubtitleStyle({ ...subtitleStyle, shadow: e.target.checked })
                          }
                          className="w-5 h-5 rounded border-slate-300 text-bund-blue focus:ring-bund-blue"
                        />
                        <span className="text-sm text-slate-600">Schatten anzeigen</span>
                      </label>
                    </div>
                  </div>

                  {/* Vorschau */}
                  <div className="mt-4 p-4 bg-slate-800 rounded-xl">
                    <p className="text-center text-sm text-slate-400 mb-2">Vorschau</p>
                    <p
                      className="text-center"
                      style={{
                        fontFamily: subtitleStyle.fontName,
                        fontSize: `${subtitleStyle.fontSize}px`,
                        color: subtitleStyle.primaryColor,
                        textShadow: subtitleStyle.shadow
                          ? `2px 2px 4px ${subtitleStyle.outlineColor}`
                          : "none",
                        WebkitTextStroke: `${subtitleStyle.outlineWidth}px ${subtitleStyle.outlineColor}`,
                      }}
                    >
                      Beispiel Untertitel
                    </p>
                  </div>
                </div>
              )}

              {/* Burn Status */}
              {burnStatus === "burning" && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                    <span>{burnProgressMessage || "Video wird erstellt..."}</span>
                    <span className="font-semibold">{burnProgress}%</span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-dark transition-all duration-300 rounded-full"
                      style={{ width: `${burnProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                    <LoadingSpinner />
                    {processingMode === "browser"
                      ? "FFmpeg.wasm verarbeitet das Video im Browser..."
                      : "FFmpeg verarbeitet das Video auf dem Server..."}
                  </p>
                </div>
              )}

              {burnStatus === "completed" && (
                <div className="mb-4 p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3">
                  <CheckIcon className="w-5 h-5 text-success" />
                  <span className="text-success font-medium">
                    Video wurde erfolgreich erstellt und heruntergeladen!
                  </span>
                </div>
              )}

              {burnError && (
                <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3">
                  <ErrorIcon className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <span className="text-error">{burnError}</span>
                </div>
              )}

              <Button
                variant="accent"
                size="lg"
                onClick={handleBurnSubtitles}
                disabled={burnStatus === "burning"}
                leftIcon={<VideoIcon className="w-5 h-5" />}
              >
                {burnStatus === "burning" ? "Video wird erstellt..." : "Video mit Untertiteln erstellen"}
              </Button>
            </Card>
          )}

          {/* FFmpeg nicht verfügbar Warnung */}
          {isVideoFile && ffmpegAvailable === false && (
            <Card className="p-6 border-warning/30 bg-warning/5">
              <div className="flex items-start gap-4">
                <WarningIcon className="w-6 h-6 text-warning flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900">FFmpeg nicht verfügbar</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Um Untertitel direkt ins Video einzubrennen, muss FFmpeg auf dem Server installiert sein.
                    Sie können die Untertitel dennoch als SRT/VTT/TTML-Datei exportieren.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Hidden audio element for audio-only files */}
          {mediaUrl && !videoUrl && (
            <audio
              ref={audioRef}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              className="hidden"
            />
          )}

          {/* Untertitel-Editor */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Untertitel bearbeiten</h2>
            <p className="text-sm text-slate-500 mb-4">
              {mediaUrl ? (
                <>
                  <SoundIcon className="w-4 h-4 inline mr-1" />
                  Klicken Sie auf einen Untertitel-Text, um die zugehörige Audio-Sequenz anzuhören.
                  Doppelklick zum Bearbeiten.
                </>
              ) : (
                "Klicken Sie auf einen Untertitel, um ihn zu bearbeiten."
              )}
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {result.subtitles.map((subtitle, index) => {
                const isActive = currentTime >= subtitle.startTime && currentTime < subtitle.endTime;
                const isPlaying = playingSubtitleIndex === index;
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      editingIndex === index
                        ? "border-bund-blue bg-bund-blue-light/30 shadow-sm"
                        : isPlaying
                        ? "border-accent bg-accent/20 ring-2 ring-accent/30"
                        : isActive
                        ? "border-accent bg-accent/10"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2">
                        {mediaUrl && (
                          <button
                            type="button"
                            onClick={() => handlePlaySubtitle(index, subtitle.startTime, subtitle.endTime)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isPlaying
                                ? "bg-accent text-white animate-pulse"
                                : "bg-slate-100 hover:bg-bund-blue hover:text-white"
                            }`}
                            title={isPlaying ? "Wird abgespielt..." : "Abschnitt anhören"}
                          >
                            {isPlaying ? (
                              <SoundWaveIcon className="w-4 h-4" />
                            ) : (
                              <PlayIcon className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <span className="text-xs text-slate-400 font-mono w-24 flex-shrink-0 pt-1">
                          {formatTime(subtitle.startTime)}
                        </span>
                      </div>
                      {editingIndex === index ? (
                        <div className="flex-1">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl resize-none focus:ring-4 focus:ring-bund-blue/10 focus:border-bund-blue"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={handleSaveEdit}>
                              Speichern
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingIndex(null)}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className={`flex-1 cursor-pointer transition-colors ${
                            isPlaying ? "text-accent font-medium" : "text-slate-800"
                          }`}
                          onClick={() => {
                            if (mediaUrl) {
                              handlePlaySubtitle(index, subtitle.startTime, subtitle.endTime);
                            }
                          }}
                          onDoubleClick={() => handleEditSubtitle(index)}
                          title={mediaUrl ? "Klicken zum Anhören, Doppelklick zum Bearbeiten" : "Klicken zum Bearbeiten"}
                        >
                          {subtitle.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Aktionen */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleReset}>
              Neue Datei
            </Button>
          </div>
        </div>
      )}

      {/* Fehler */}
      {status === "error" && error && (
        <Card className="border-error/30 bg-error/5 p-6">
          <div className="flex items-start gap-4">
            <ErrorIcon className="w-6 h-6 text-error flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-slate-900 mb-1">
                Transkription fehlgeschlagen
              </h2>
              <p className="text-slate-700">{error}</p>
              <Button variant="outline" className="mt-4" onClick={handleReset}>
                Erneut versuchen
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl text-center">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    de: "Deutsch",
    en: "Englisch",
    fr: "Französisch",
    es: "Spanisch",
    it: "Italienisch",
  };
  return languages[code] || code;
}

function exportToSrt(subtitles: Subtitle[]): string {
  return subtitles
    .map((sub, i) => {
      const start = formatSrtTime(sub.startTime);
      const end = formatSrtTime(sub.endTime);
      return `${i + 1}\n${start} --> ${end}\n${sub.text}\n`;
    })
    .join("\n");
}

function exportToVtt(subtitles: Subtitle[]): string {
  const header = "WEBVTT\n\n";
  const content = subtitles
    .map((sub) => {
      const start = formatVttTime(sub.startTime);
      const end = formatVttTime(sub.endTime);
      return `${start} --> ${end}\n${sub.text}\n`;
    })
    .join("\n");
  return header + content;
}

function exportToTtml(subtitles: Subtitle[], lang: string): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="${lang}">
  <body>
    <div>`;

  const content = subtitles
    .map((sub) => {
      const start = formatTtmlTime(sub.startTime);
      const end = formatTtmlTime(sub.endTime);
      return `      <p begin="${start}" end="${end}">${escapeXml(sub.text)}</p>`;
    })
    .join("\n");

  const footer = `
    </div>
  </body>
</tt>`;

  return header + "\n" + content + footer;
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function formatTtmlTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function MediaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-bund-blue" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function BrowserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SoundIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function SoundWaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h2v4H3v-4zm4-3h2v10H7V9zm4-4h2v18h-2V5zm4 4h2v10h-2V9zm4 3h2v4h-2v-4z" />
    </svg>
  );
}

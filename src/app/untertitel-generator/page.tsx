import { Metadata } from "next";
import { UntertitelGenerator } from "./UntertitelGenerator";

export const metadata: Metadata = {
  title: "Video-Untertitel Generator",
  description:
    "Erstellen Sie automatisch Untertitel für Videos mit KI-gestützter Spracherkennung. Export als SRT, VTT oder TTML für maximale Kompatibilität.",
};

export default function UntertitelPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm font-medium mb-6">
              <CaptionIcon className="w-4 h-4" />
              Video-Transkription
            </div>
            <h1 className="text-slate-900 mb-4">Untertitel Generator</h1>
            <p className="text-xl text-slate-500 leading-relaxed">
              Laden Sie ein Video oder eine Audiodatei hoch und erhalten Sie
              automatisch generierte Untertitel. Die KI erkennt gesprochene Sprache
              und erstellt zeitcodierte Untertitel in verschiedenen Formaten.
            </p>
          </div>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-16 md:pb-24">
        <div className="container">
          <UntertitelGenerator />
        </div>
      </section>

      {/* Formats Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-slate-900 mb-12 text-center">
              Unterstützte Formate
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <VideoIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Eingabeformate</h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-bund-blue rounded-full"></span>
                    <span><strong>Video:</strong> MP4, WebM, MOV, AVI</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-bund-blue rounded-full"></span>
                    <span><strong>Audio:</strong> MP3, WAV, M4A, OGG</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <FileIcon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Ausgabeformate</h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500" />
                    <span><strong>SRT</strong> - SubRip (universell kompatibel)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500" />
                    <span><strong>VTT</strong> - WebVTT (für Web-Videos)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500" />
                    <span><strong>TTML</strong> - Timed Text (für Broadcast)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-slate-900 mb-8 text-center">
              Tipps für beste Ergebnisse
            </h2>
            <div className="space-y-4">
              {[
                { title: "Klare Audioqualität", text: "Vermeiden Sie Hintergrundgeräusche und sorgen Sie für eine deutliche Aussprache." },
                { title: "Eine Sprache pro Video", text: "Wählen Sie die Hauptsprache des Videos für beste Erkennungsqualität." },
                { title: "Korrekturlesen", text: "Prüfen Sie die generierten Untertitel immer auf Fehler und passen Sie sie bei Bedarf an." },
                { title: "Fachbegriffe", text: "Spezielle Fachbegriffe oder Namen müssen möglicherweise manuell korrigiert werden." },
              ].map((tip, index) => (
                <div key={index} className="flex gap-4 p-5 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-bund-blue text-white rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{tip.title}</h3>
                    <p className="text-slate-600 mt-1">{tip.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Legal Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="p-8 bg-white rounded-2xl border border-slate-200/60">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ScaleIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Rechtlicher Hinweis</h3>
                  <p className="text-slate-600 mb-4">
                    Nach WCAG 2.1 (Erfolgskriterium 1.2.2) und BITV 2.0 müssen aufgezeichnete
                    Videos mit Untertiteln versehen werden. Dies gilt für alle öffentlichen
                    Stellen und ist wichtig für:
                  </p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Menschen mit Hörbehinderung
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Nicht-Muttersprachler
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Nutzer in lauten oder leisen Umgebungen
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Bessere Auffindbarkeit durch Suchmaschinen
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CaptionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
    </svg>
  );
}

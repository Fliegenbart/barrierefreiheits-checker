import { Metadata } from "next";
import { DokumentPruefer } from "./DokumentPruefer";

export const metadata: Metadata = {
  title: "Dokumenten-Barrierefreiheitsprüfer",
  description:
    "Prüfen Sie PDF- und Word-Dokumente auf Barrierefreiheit. Analyse nach WCAG 2.1, PDF/UA und BITV 2.0 mit detailliertem Prüfbericht.",
};

export default function DokumentPrueferPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-6">
              <CheckBadgeIcon className="w-4 h-4" />
              Dokumentenanalyse
            </div>
            <h1 className="text-slate-900 mb-4">Dokument-Prüfer</h1>
            <p className="text-xl text-slate-500 leading-relaxed">
              Laden Sie ein PDF- oder Word-Dokument hoch und erhalten Sie eine
              detaillierte Analyse der Barrierefreiheit. Die Prüfung basiert auf
              WCAG 2.1, PDF/UA-1 und BITV 2.0.
            </p>
          </div>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-16 md:pb-24">
        <div className="container">
          <DokumentPruefer />
        </div>
      </section>

      {/* What We Check Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-slate-900 mb-12 text-center">
              Was wird geprüft?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <DocumentIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-3">Struktur</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Dokumenttitel vorhanden
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Überschriftenhierarchie
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Lesezeichen/Outline
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Lesereihenfolge
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Tagged PDF/Struktur
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-3">Bilder & Grafiken</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Alternativtexte für Bilder
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Dekorative Bilder markiert
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Komplexe Grafiken beschrieben
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Diagramme zugänglich
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <TableIcon className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-3">Tabellen & Listen</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Tabellen-Header definiert
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Scope-Attribute gesetzt
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Einfache Tabellenstruktur
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Listen korrekt getaggt
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                  <LanguageIcon className="w-5 h-5 text-cyan-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-3">Sprache</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Dokumentsprache gesetzt
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Sprachwechsel markiert
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Abkürzungen erklärt
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <LinkIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-3">Links & Navigation</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Aussagekräftige Linktexte
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Funktionierende Links
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Interne Navigation
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                  <ColorIcon className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-3">Farben & Kontrast</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Textkontrast (4.5:1)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Nicht nur Farbe als Info
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Lesbare Schriftgrößen
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Standards Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-slate-900 mb-8 text-center">
              Geprüfte Standards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-bund-blue rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">WCAG 2.1</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Web Content Accessibility Guidelines - internationaler Standard
                  für barrierefreie Webinhalte, Stufe AA.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">PDF/UA-1</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  ISO 14289-1 - Standard für barrierefreie PDF-Dokumente mit
                  vollständiger Strukturierung.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">BITV 2.0</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Barrierefreie-Informationstechnik-Verordnung - verbindlich für
                  öffentliche Stellen in Deutschland.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  );
}

function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

function ColorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
    </svg>
  );
}

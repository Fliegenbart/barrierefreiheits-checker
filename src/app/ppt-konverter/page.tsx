import { Metadata } from "next";
import { PptConverterAdvanced } from "./PptConverterAdvanced";

export const metadata: Metadata = {
  title: "PPT zu barrierefreiem PDF/UA",
  description:
    "Konvertieren Sie PowerPoint-Präsentationen in PDF/UA-1 konforme Dokumente mit vollständigem Tagging, Leseordnung und Barrierefreiheitsprüfung. BITV 2.0 und WCAG 2.1 konform.",
};

export default function PptKonverterPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-6">
              <DocumentIcon className="w-4 h-4" />
              PDF/UA Konvertierung
            </div>
            <h1 className="text-slate-900 mb-4">PowerPoint zu PDF/UA</h1>
            <p className="text-xl text-slate-500 leading-relaxed">
              Konvertieren Sie PowerPoint-Präsentationen in barrierefreie PDF/UA-1
              konforme Dokumente. Mit integrierter Barrierefreiheitsprüfung,
              automatischem Tagging und detailliertem Prüfbericht.
            </p>
          </div>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-16 md:pb-24">
        <div className="container">
          <PptConverterAdvanced />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-slate-900 mb-12 text-center">
              Funktionen des PDF/UA Konverters
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <TagIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  PDF/UA-1 Konformität
                </h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Vollständiges semantisches Tagging (H1, H2, P, L, Table...)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Automatische Lesereihenfolge-Analyse</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Alt-Text-Erkennung und Decorative-Handling</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Tabellen-Header-Markierung</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <ClipboardCheckIcon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Integrierte Prüfung
                </h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>WCAG 2.1 und BITV 2.0 Konformitätsprüfung</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Detaillierter Prüfbericht mit Empfehlungen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Erkennung von Pseudo-Tabellen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Nur-Prüfen-Modus ohne Konvertierung</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Profile Cards */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-slate-600 font-semibold">S</span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Standard-Profil</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Empfohlen für die meisten Präsentationen mit optimaler Balance aus
                  Barrierefreiheit und Kompatibilität.
                </p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-blue-600 font-semibold">B</span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Strikt (BITV 2.0)</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Maximale Barrierefreiheit für öffentliche Stellen mit strengster
                  Prüfung aller Anforderungen.
                </p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-amber-600 font-semibold">Q</span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Schnell</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Basis-Tags für schnelle Konvertierung ohne erweiterte Prüfungen.
                </p>
              </div>
            </div>

            {/* Warning Box */}
            <div className="mt-12 p-6 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <WarningIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Wichtiger Hinweis</h4>
                  <p className="text-slate-600">
                    Die automatische Konvertierung kann nicht alle Barrierefreiheitsprobleme
                    lösen. Der Prüfbericht zeigt Ihnen, welche Punkte manuell nachgearbeitet
                    werden sollten. Fehlende Alt-Texte müssen in der Quell-PowerPoint ergänzt
                    werden.
                  </p>
                </div>
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
              Tipps für barrierefreie PowerPoint-Dateien
            </h2>
            <div className="space-y-4">
              {[
                { title: "Alt-Texte hinzufügen", text: "Beschreiben Sie alle Bilder und Grafiken in PowerPoint bevor Sie konvertieren." },
                { title: "Überschriften nutzen", text: "Verwenden Sie die Folientitel als Überschriften für eine klare Struktur." },
                { title: "Leseordnung prüfen", text: "Stellen Sie sicher, dass die Reihenfolge der Elemente auf jeder Folie logisch ist." },
                { title: "Kontrastreiche Farben", text: "Nutzen Sie den Kontrast-Prüfer, um Ihre Farbkombinationen zu testen." },
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
    </div>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
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

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

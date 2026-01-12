import { Metadata } from "next";
import { AltTextGenerator } from "./AltTextGenerator";

export const metadata: Metadata = {
  title: "Alt-Text Generator",
  description:
    "Erstellen Sie automatisch aussagekräftige Bildbeschreibungen für Screenreader mithilfe von KI. WCAG 2.1 und BITV 2.0 konform.",
};

export default function AltTextGeneratorPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
              <ImageIcon className="w-4 h-4" />
              KI-Bildbeschreibung
            </div>
            <h1 className="text-slate-900 mb-4">Alt-Text Generator</h1>
            <p className="text-xl text-slate-500 leading-relaxed">
              Laden Sie ein Bild hoch und erhalten Sie automatisch einen
              aussagekräftigen Alternativtext für Screenreader. Die KI analysiert
              den Bildinhalt und erstellt eine prägnante Beschreibung auf Deutsch.
            </p>
          </div>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-16 md:pb-24">
        <div className="container">
          <AltTextGenerator />
        </div>
      </section>

      {/* Guidelines Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-slate-900 mb-12 text-center">
              Was macht einen guten Alt-Text aus?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <CheckIcon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Dos</h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Beschreiben Sie den Inhalt und Zweck des Bildes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Halten Sie sich kurz (max. 125 Zeichen wenn möglich)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Berücksichtigen Sie den Kontext der Seite</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Beschreiben Sie Text im Bild vollständig</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                  <XIcon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Don&apos;ts</h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Vermeiden Sie &quot;Bild von&quot; oder &quot;Foto von&quot;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Keine Wiederholung von umgebendem Text</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Keine irrelevanten Details beschreiben</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Dekorative Bilder brauchen keinen Alt-Text</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* WCAG Info */}
            <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <InfoIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">WCAG 2.1 Anforderungen</h4>
                  <p className="text-slate-600">
                    <strong>Erfolgskriterium 1.1.1 (Nicht-Text-Inhalt):</strong> Alle
                    nicht-textlichen Inhalte müssen mit einer Textalternative versehen
                    werden, die den gleichen Zweck erfüllt. Dies ist eine Level A
                    Anforderung und damit für BITV 2.0 Konformität verpflichtend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Warning Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="p-8 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <WarningIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Wichtiger Hinweis</h3>
                  <p className="text-slate-600 mb-4">
                    Die KI-generierten Alt-Texte sind Vorschläge und sollten immer
                    überprüft und bei Bedarf angepasst werden. Nur Sie kennen den genauen
                    Kontext, in dem das Bild verwendet wird.
                  </p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Ist die Beschreibung im Kontext der Seite sinnvoll?
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Werden alle wichtigen Informationen vermittelt?
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Ist der Text verständlich und prägnant?
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

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
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

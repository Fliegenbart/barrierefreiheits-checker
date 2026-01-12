import { Metadata } from "next";
import { ContrastChecker } from "./ContrastChecker";

export const metadata: Metadata = {
  title: "Kontrast-Prüfer",
  description:
    "Prüfen Sie Farbkombinationen auf WCAG 2.1 Konformität. Testen Sie Text- und Hintergrundfarben für optimale Barrierefreiheit.",
};

export default function KontrastPrueferPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6">
              <ContrastIcon className="w-4 h-4" />
              Farb-Analyse
            </div>
            <h1 className="text-slate-900 mb-4">Kontrast-Prüfer</h1>
            <p className="text-xl text-slate-500 leading-relaxed">
              Prüfen Sie Farbkombinationen auf Einhaltung der WCAG 2.1
              Kontrastanforderungen. Geben Sie Vordergrund- und Hintergrundfarbe ein,
              um das Kontrastverhältnis zu berechnen.
            </p>
          </div>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-16 md:pb-24">
        <div className="container">
          <ContrastChecker />
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-slate-900 mb-12 text-center">
              WCAG 2.1 Kontrastanforderungen
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                  <span className="text-amber-600 font-bold text-lg">AA</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Level AA (Mindestanforderung)
                </h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Normaler Text:</strong> Mindestens 4.5:1</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Großer Text</strong> (ab 18pt oder 14pt fett): Mindestens 3:1</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>UI-Komponenten:</strong> Mindestens 3:1</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200/60">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                  <span className="text-emerald-600 font-bold text-lg">AAA</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Level AAA (Erweiterte Anforderung)
                </h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Normaler Text:</strong> Mindestens 7:1</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Großer Text:</strong> Mindestens 4.5:1</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <InfoIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Hinweis zur BITV 2.0</h4>
                  <p className="text-slate-600">
                    Die BITV 2.0 fordert die Einhaltung von WCAG 2.1 Level AA
                    für alle öffentlichen Stellen in Deutschland. Level AAA wird empfohlen, ist
                    aber nicht verpflichtend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContrastIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

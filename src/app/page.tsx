import Link from "next/link";

const tools = [
  {
    title: "Kontrast-Prüfer",
    description: "Farbkontraste nach WCAG 2.1 prüfen und optimieren.",
    href: "/kontrast-pruefer",
    icon: ContrastIcon,
    color: "bg-orange-500",
  },
  {
    title: "PPT zu PDF/UA",
    description: "PowerPoint-Präsentationen in barrierefreie PDFs konvertieren.",
    href: "/ppt-konverter",
    icon: DocumentIcon,
    color: "bg-red-500",
  },
  {
    title: "Alt-Text Generator",
    description: "KI-gestützte Alternativtexte für Bilder erstellen.",
    href: "/alt-text-generator",
    icon: ImageIcon,
    color: "bg-purple-500",
  },
  {
    title: "Leichte Sprache",
    description: "Texte in Leichte Sprache übersetzen.",
    href: "/leichte-sprache",
    icon: TextIcon,
    color: "bg-blue-500",
  },
  {
    title: "Dokument-Prüfer",
    description: "Dokumente auf Barrierefreiheit analysieren.",
    href: "/dokument-pruefer",
    icon: CheckIcon,
    color: "bg-green-500",
  },
  {
    title: "Untertitel Generator",
    description: "Automatische Untertitel für Videos erstellen.",
    href: "/untertitel-generator",
    icon: CaptionIcon,
    color: "bg-pink-500",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-slate-900 mb-6 animate-fade-in-up">
              Barrierefreiheit.
              <br />
              <span className="text-slate-400">Einfach gemacht.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-500 leading-relaxed mb-10 animate-fade-in-up stagger-1">
              Professionelle Online-Tools zur Erstellung und Prüfung
              barrierefreier digitaler Inhalte.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-2">
              <Link
                href="#tools"
                className="btn-apple btn-apple-primary"
              >
                Tools entdecken
              </Link>
              <Link
                href="/hilfe"
                className="btn-apple btn-apple-secondary"
              >
                Mehr erfahren
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-slate-900 mb-4">Alle Werkzeuge</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Sechs spezialisierte Tools für verschiedene Aspekte der digitalen Barrierefreiheit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool, index) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`
                  group block p-8 bg-white rounded-2xl
                  border border-slate-200/60
                  card-interactive
                  animate-fade-in-up stagger-${index + 1}
                `}
              >
                <div className={`feature-icon ${tool.color}`}>
                  <tool.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-bund-blue transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {tool.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-slate-900 mb-4">Warum unsere Plattform?</h2>
              <p className="text-lg text-slate-500">
                Entwickelt für Effizienz, Zuverlässigkeit und Konformität.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <ShieldIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  WCAG 2.1 AA
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Alle Tools erfüllen die internationalen Web-Accessibility-Richtlinien.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <LockIcon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  DSGVO-konform
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Ihre Daten werden nach europäischen Datenschutzstandards verarbeitet.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <SparkleIcon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  KI-gestützt
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Moderne KI-Modelle für präzise und effiziente Ergebnisse.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-slate-900">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-white mb-4">Bereit loszulegen?</h2>
            <p className="text-lg text-slate-400 mb-10">
              Wählen Sie ein Tool und starten Sie sofort mit der Optimierung Ihrer Inhalte.
            </p>
            <Link
              href="#tools"
              className="btn-apple bg-white text-slate-900 hover:bg-slate-100"
            >
              Jetzt starten
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Icons
function ContrastIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
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

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function CaptionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Barrierefreiheit",
    template: "%s | Barrierefreiheit",
  },
  description:
    "Online-Tools zur Erstellung und Prüfung barrierefreier Inhalte. BITV 2.0 und WCAG 2.1 konform.",
  keywords: [
    "Barrierefreiheit",
    "BITV",
    "WCAG",
    "Accessibility",
    "PDF",
    "Alt-Text",
    "Leichte Sprache",
  ],
};

const navLinks = [
  { href: "/kontrast-pruefer", label: "Kontrast" },
  { href: "/ppt-konverter", label: "PPT zu PDF" },
  { href: "/alt-text-generator", label: "Alt-Text" },
  { href: "/leichte-sprache", label: "Leichte Sprache" },
  { href: "/dokument-pruefer", label: "Dokumente" },
  { href: "/untertitel-generator", label: "Untertitel" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col bg-white">
        {/* Skip Link */}
        <a href="#hauptinhalt" className="skip-link">
          Zum Hauptinhalt springen
        </a>

        {/* Header - Apple Style */}
        <header
          className="sticky top-0 z-50 glass border-b border-slate-200/80"
          role="banner"
        >
          <div className="container">
            <nav className="flex items-center justify-between h-12" aria-label="Hauptnavigation">
              {/* Logo */}
              <Link
                href="/"
                className="text-slate-900 font-semibold text-sm tracking-tight hover:opacity-100"
              >
                Barrierefreiheit
              </Link>

              {/* Desktop Navigation */}
              <ul className="hidden md:flex items-center gap-7 list-none m-0 p-0">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="md:hidden p-2 -mr-2 text-slate-600 hover:text-slate-900"
                aria-label="Menü öffnen"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main id="hauptinhalt" className="flex-1" tabIndex={-1}>
          {children}
        </main>

        {/* Footer - Minimal Apple Style */}
        <footer className="border-t border-slate-200" role="contentinfo">
          <div className="container py-8">
            {/* Links Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h2 className="text-xs font-semibold text-slate-900 mb-4">Werkzeuge</h2>
                <ul className="space-y-3 list-none p-0">
                  {navLinks.slice(0, 3).map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs text-slate-500 hover:text-slate-900"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 mb-4">Weitere Tools</h2>
                <ul className="space-y-3 list-none p-0">
                  {navLinks.slice(3).map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs text-slate-500 hover:text-slate-900"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 mb-4">Rechtliches</h2>
                <ul className="space-y-3 list-none p-0">
                  <li>
                    <Link href="/impressum" className="text-xs text-slate-500 hover:text-slate-900">
                      Impressum
                    </Link>
                  </li>
                  <li>
                    <Link href="/datenschutz" className="text-xs text-slate-500 hover:text-slate-900">
                      Datenschutz
                    </Link>
                  </li>
                  <li>
                    <Link href="/barrierefreiheit" className="text-xs text-slate-500 hover:text-slate-900">
                      Barrierefreiheit
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 mb-4">Support</h2>
                <ul className="space-y-3 list-none p-0">
                  <li>
                    <Link href="/kontakt" className="text-xs text-slate-500 hover:text-slate-900">
                      Kontakt
                    </Link>
                  </li>
                  <li>
                    <Link href="/hilfe" className="text-xs text-slate-500 hover:text-slate-900">
                      Hilfe
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Divider */}
            <div className="divider mb-6" />

            {/* Bottom */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-slate-500">
                WCAG 2.1 AA · BITV 2.0 · DSGVO-konform
              </p>
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} Barrierefreiheit-Plattform
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_API_BASE_URL } from '../../utils/backendConfig';
import SEO from '../seo/SEO';

const Impressum: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcf9] text-[#1a1a1a] font-['Outfit',sans-serif]">
      <SEO
        title="Impressum"
        description="Impressum und Anbieterinformationen zu Lanis UI und dem zugehörigen Backend."
        path="/impressum"
        noindex
      />
      <div className="max-w-2xl mx-auto px-6 py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-[#555] transition-colors mb-12">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück zur Startseite
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#111] mb-2">Impressum</h1>
        <p className="text-sm text-[#999] mb-16">Anbieter- und Kontaktinformationen</p>

        <section className="space-y-12 text-[14px] leading-relaxed text-[#555]">
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Diensteanbieter</h2>
            <p>Bennet Joan Wegener</p>
            <p>63150 Heusenstamm</p>
            <p>Deutschland</p>
            <p className="mt-3">
              E-Mail:{' '}
              <a href="mailto:lanis-impressum@joancode.dev" className="text-[#00a0c0] underline underline-offset-2 hover:text-[#00c0e0] transition-colors">
                lanis-impressum@joancode.dev
              </a>
            </p>
            <p className="mt-3 text-xs text-[#aaa]">
              Privates, nicht kommerzielles Projekt. Es besteht keine Eintragung in einem Handels-,
              Vereins- oder Partnerschaftsregister und keine Umsatzsteuer-Identifikationsnummer.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Geltungsbereich</h2>
            <p>
              Dieses Impressum gilt für Lanis UI sowie für das bereitgestellte Standard-Backend unter{' '}
              <span className="text-[#333] break-all">{DEFAULT_API_BASE_URL}</span>.
              Die Benutzeroberfläche (Lanis UI) und das Backend (lanis_api) sind getrennte
              Softwareprojekte des oben genannten Diensteanbieters.
            </p>
            <p className="mt-2">
              Dieses Impressum gilt nicht für Backends anderer Betreiber.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Projektstatus und Abgrenzung</h2>
            <p>
              Lanis UI ist eine inoffizielle Benutzeroberfläche für das Schulportal Hessen. Das Projekt
              ist kein Angebot des Landes Hessen, des Hessischen Ministeriums für Kultus, Bildung und
              Chancen oder des Schulportals Hessen. Es besteht keine organisatorische, wirtschaftliche
              oder rechtliche Verbindung zu diesen Stellen.
            </p>
            <p className="mt-2">
              Bezeichnungen, Marken und Inhalte des Schulportals Hessen bleiben ihren jeweiligen
              Rechteinhabern zugeordnet. Ihre Nennung dient ausschließlich der Beschreibung der
              Kompatibilität und Funktion dieses unabhängigen Projekts.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Inhalte und Verfügbarkeit</h2>
            <p>
              Die angezeigten schulischen Inhalte stammen aus dem Schulportal Hessen. Ihre Aktualität
              und die Verfügbarkeit der zugehörigen Funktionen hängen auch vom Schulportal und den
              angebundenen Diensten ab.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Externe Dienste und Links</h2>
            <p>
              Das Angebot bindet externe Dienste ein und enthält Links zu Angeboten Dritter.
              Informationen zu den eingebundenen Diensten und zur Datenverarbeitung stehen in der
              unten verlinkten Datenschutzerklärung.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Urheberrecht</h2>
            <p>
              Die vom Diensteanbieter selbst erstellten Inhalte und Werke unterliegen dem deutschen
              Urheberrecht. Rechte an eingebundenen Inhalten, Marken, Logos und sonstigen Werken Dritter
              verbleiben bei den jeweiligen Rechteinhabern. Gesetzlich erlaubte Nutzungen und die jeweils
              anwendbaren Open-Source-Lizenzen bleiben unberührt.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Datenschutz</h2>
            <p>
              Informationen zur Verarbeitung personenbezogener Daten, zur Speicherung von Zugangsdaten
              und zur Einbindung externer Dienste stehen in der{' '}
              <Link to="/privacy-policy" className="text-[#00a0c0] underline underline-offset-2 hover:text-[#00c0e0] transition-colors">
                Datenschutzerklärung
              </Link>.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Hinweise und Beanstandungen</h2>
            <p>
              Hinweise auf technische Fehler, rechtswidrige Inhalte oder mögliche Rechtsverletzungen
              können an{' '}
              <a href="mailto:lanis-impressum@joancode.dev" className="text-[#00a0c0] underline underline-offset-2 hover:text-[#00c0e0] transition-colors">
                lanis-impressum@joancode.dev
              </a>{' '}
              gesendet werden.
            </p>
          </div>

          <hr className="border-black/[0.06]" />

          <p className="text-xs text-[#bbb] pt-2">Stand: 17. Oktober 2026</p>
        </section>
      </div>
    </div>
  );
};

export default Impressum;

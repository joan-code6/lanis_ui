import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api';
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
        <p className="text-sm text-[#999] mb-16">Anbieterinformationen gemäß § 5 DDG</p>

        <section className="space-y-12 text-[14px] leading-relaxed text-[#555]">
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Diensteanbieter</h2>
            <p>Bennet Joan Wegener</p>
            <p>60599 Heusenstamm</p>
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
              Dieses Impressum gilt für Lanis UI sowie für das dazugehörige, aktuell unter{' '}
              <span className="text-[#333] break-all">{API_BASE_URL}</span> konfigurierte Backend.
              Benutzeroberfläche und Backend sind eigenständige Softwareprojekte, werden auf getrennter
              Infrastruktur betrieben und haben denselben oben genannten Diensteanbieter.
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
              Eigene Inhalte werden mit angemessener Sorgfalt erstellt und gepflegt. Eine Gewähr für
              jederzeitige Verfügbarkeit sowie für die Vollständigkeit, Aktualität oder Fehlerfreiheit
              angezeigter Informationen wird nicht übernommen, soweit dies gesetzlich zulässig ist. Dies
              gilt insbesondere für Daten und Funktionen, die vom Schulportal Hessen oder anderen externen
              Systemen abhängen.
            </p>
            <p className="mt-2">
              Die Haftung des Diensteanbieters richtet sich nach den gesetzlichen Vorschriften. Zwingende
              gesetzliche Haftung, insbesondere bei Vorsatz, grober Fahrlässigkeit sowie bei Verletzung von
              Leben, Körper oder Gesundheit, bleibt unberührt.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Externe Dienste und Links</h2>
            <p>
              Das Angebot kommuniziert funktionsbedingt mit externen Diensten und kann Links zu Angeboten
              Dritter enthalten. Auf deren Inhalte, Verfügbarkeit und Datenverarbeitung hat der
              Diensteanbieter keinen unmittelbaren Einfluss. Für externe Inhalte ist der jeweilige
              Anbieter verantwortlich. Erlangt der Diensteanbieter Kenntnis von einer konkreten
              Rechtsverletzung, werden zumutbare Maßnahmen zur Entfernung oder Sperrung des betreffenden
              Verweises ergriffen.
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
              Informationen zur Verarbeitung personenbezogener Daten durch die getrennten UI- und
              Backend-Systeme stehen in der{' '}
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
              gesendet werden. Berechtigte Beanstandungen werden geprüft und erforderliche Maßnahmen
              zeitnah veranlasst.
            </p>
          </div>

          <hr className="border-black/[0.06]" />

          <p className="text-xs text-[#bbb] pt-2">Stand: August 2026</p>
        </section>
      </div>
    </div>
  );
};

export default Impressum;

import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api';
import { DEFAULT_API_BASE_URL, getCustomBackendUrl } from '../../utils/backendConfig';
import SEO from '../seo/SEO';

const PrivacyPolicy: React.FC = () => {
  const usesCustomBackend = getCustomBackendUrl() !== null;

  return (
    <div className="min-h-screen bg-[#fcfcf9] text-[#1a1a1a] font-['Outfit',sans-serif]">
      <SEO
        title="Datenschutzerklärung"
        description="Informationen zur Verarbeitung personenbezogener Daten bei der Nutzung von Lanis UI."
        path="/privacy-policy"
        noindex
      />
      <div className="max-w-2xl mx-auto px-6 py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-[#555] transition-colors mb-12">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück zur Startseite
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#111] mb-2">Datenschutzerklärung</h1>
        <p className="text-sm text-[#999] mb-16">Informationen zur Datenverarbeitung durch Lanis UI</p>

        <section className="space-y-12 text-[14px] leading-relaxed text-[#555]">
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">1. Verantwortlicher und Kontakt</h2>
            <p>Bennet Joan Wegener</p>
            <p>60599 Heusenstamm</p>
            <p>Deutschland</p>
            <p className="mt-3">
              E-Mail:{' '}
              <a href="mailto:lanis-impressum@joancode.dev" className="text-[#00a0c0] underline underline-offset-2 hover:text-[#00c0e0] transition-colors">
                lanis-impressum@joancode.dev
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">2. Worum es bei diesem Angebot geht</h2>
            <p>
              Lanis UI ist eine inoffizielle Benutzeroberfläche für das Schulportal Hessen. Sie stellt
              Inhalte und Funktionen bereit, die über ein gesondertes Backend vom Schulportal abgerufen
              werden. Benutzeroberfläche und Backend sind zwei eigenständige Softwareprojekte und werden
              auf voneinander getrennter Infrastruktur betrieben. Für die Benutzeroberfläche und das
              bereitgestellte Standard-Backend ist die unter Abschnitt 1 genannte Person verantwortlich.
              Bei einem selbst eingestellten Backend ist dessen jeweiliger Betreiber verantwortlich. Lanis
              UI ist weder ein Angebot des Landes Hessen noch des Schulportals Hessen.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">3. Anmeldung und Kommunikation mit dem Backend</h2>
            <p>
              Bei der Anmeldung werden die ausgewählte Schule, der Benutzername und das Passwort an das
              aktuell für diese Installation konfigurierte Backend übermittelt. Auch spätere Anfragen,
              etwa zu Nachrichten, Kursen, Stundenplan, Kalender, Profil oder Einstellungen, werden an
              dieses Backend gesendet. Das aktuell konfigurierte Backend ist{' '}
              <span className="text-[#333] break-all">{API_BASE_URL}</span>.
            </p>
            <p className="mt-2">
              Aufgrund dieser technischen Trennung hat die im Browser ausgeführte Benutzeroberfläche
              keinen Zugriff auf serverseitige Protokolle, Datenbanken oder Speicherfristen des Backends
              und kann dessen Verarbeitung weder einsehen noch steuern. Die konkrete serverseitige
              Verarbeitung wird ausschließlich durch die Implementierung und Konfiguration des separaten
              Backend-Projekts bestimmt. Für das bereitgestellte Standard-Backend unter{' '}
              <span className="text-[#333] break-all">{DEFAULT_API_BASE_URL}</span> ist ebenfalls die in
              Abschnitt 1 genannte Person verantwortlich. Bei einem selbst eingestellten Backend ist
              dessen jeweiliger Betreiber für die dortige Verarbeitung verantwortlich.
            </p>
            <p className="mt-2">
              Mit dem Start der Anmeldung veranlasst du die Übermittlung deiner Eingaben an diese Adresse.
              Das Backend verwendet die erforderlichen Angaben, um die von dir angeforderten Funktionen
              gegenüber dem Schulportal Hessen auszuführen. Diese Beschreibung ist keine Aussage darüber,
              dass UI und Backend auf demselben Server laufen oder Daten gemeinsam speichern.
            </p>
            {usesCustomBackend && (
              <p className="mt-2">
                Auf diesem Gerät ist ein eigenes Backend eingestellt. Informiere dich vor der Anmeldung
                beim Betreiber dieser Adresse über dessen Datenschutz und Datenverarbeitung.
              </p>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">4. Lokale Speicherung auf deinem Gerät</h2>
            <p>
              Die Anwendung speichert für Anmeldung, Funktionen und Bedienkomfort Daten im Browser. Dazu
              gehören insbesondere
              Zugangs- und Aktualisierungstoken, Informationen zum angemeldeten Konto, die zuletzt gewählte
              Schule, Darstellungs- und Theme-Einstellungen sowie zwischengespeicherte Schul-, Profil-,
              Nachrichten-, Kurs-, Modul- und Plandaten. Diese Daten dienen der Anmeldung, Bedienbarkeit
              und schnelleren Darstellung der Anwendung.
            </p>
            <p className="mt-2">
              Die zuletzt gewählte Schule wird in funktionalen Cookies gespeichert. Weitere
              Daten werden im lokalen Browserspeicher und, bei installierter Web-App, gegebenenfalls im
              Cache des Service Workers abgelegt. Du kannst diese Daten über die Browser- oder
              Website-Einstellungen löschen. Dadurch wirst du möglicherweise abgemeldet und lokale
              Einstellungen gehen verloren.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">5. Push-Benachrichtigungen</h2>
            <p>
              Push-Benachrichtigungen sind freiwillig und werden erst nach deiner Aktivierung und der
              Berechtigung durch den Browser eingerichtet. Dabei werden eine gerätebezogene Push-Adresse
              und die dazugehörigen Schlüssel an das Backend übermittelt. Die Zustellung erfolgt über den
              Push-Dienst des verwendeten Browsers oder Betriebssystems. Du kannst die Berechtigung in den
              Browser- oder Systemeinstellungen widerrufen.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">6. Zwecke und Rechtsgrundlagen</h2>
            <p>
              Soweit ein Nutzungsverhältnis besteht, erfolgt die für die angeforderten Funktionen
              erforderliche Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Im Übrigen stützt
              sie sich auf Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in der sicheren und
              funktionsfähigen Bereitstellung der Anwendung. Freiwillige Push-Benachrichtigungen werden nur
              nach deiner ausdrücklichen Aktivierung eingerichtet; soweit eine Einwilligung erforderlich
              ist, gilt Art. 6 Abs. 1 lit. a DSGVO.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">7. Empfänger und Speicherdauer</h2>
            <p>
              {usesCustomBackend
                ? 'Das oben angezeigte Backend ist ein getrennt betriebenes System des von dir ausgewählten Betreibers.'
                : 'Das oben angezeigte Backend ist ein getrennt betriebenes System desselben Verantwortlichen.'}{' '}
              Zur Bereitstellung der angeforderten schulischen Funktionen kommuniziert es mit dem
              Schulportal Hessen. Bei Nutzung von Push-Benachrichtigungen wird außerdem der Push-Dienst des
              Browsers oder Betriebssystems einbezogen. Lokal gespeicherte Daten bleiben grundsätzlich
              erhalten, bis du dich abmeldest, sie durch die Anwendung ersetzt werden, eine vorgesehene
              Cache-Frist abläuft oder du die Website-Daten im Browser löschst. Die Speicherfristen des
              technisch getrennten Backends ergeben sich aus dessen jeweiliger Implementierung und
              Konfiguration; sie lassen sich nicht aus dieser Benutzeroberfläche auslesen.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">8. Deine Rechte</h2>
            <p>
              Du hast im Rahmen der gesetzlichen Voraussetzungen insbesondere das Recht auf Auskunft,
              Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.
              Eine erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Du hast
              außerdem das Recht, dich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">9. Sicherheit und Änderungen</h2>
            <p>
              Die Anwendung soll nur über eine verschlüsselte HTTPS-Verbindung bereitgestellt werden.
              Eine Datenübertragung im Internet kann dennoch nie vollständig gegen alle Risiken abgesichert
              werden. Diese Datenschutzerklärung kann angepasst werden, wenn sich Funktionen,
              Datenverarbeitungen oder rechtliche Anforderungen ändern.
            </p>
          </div>

          <hr className="border-black/[0.06]" />

          <p className="text-xs text-[#bbb] pt-2">
            Stand: August 2026
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

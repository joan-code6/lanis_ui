import { AnalyticsControls } from '../../analytics/Analytics';
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
        <p className="text-sm text-[#999] mb-16">Informationen zur Datenverarbeitung durch Lanis UI und lanis_api</p>

        <section className="space-y-12 text-[14px] leading-relaxed text-[#555]">
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">Das Wichtigste vor der Anmeldung</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Lanis UI und das Standard-Backend sind ein privates, inoffizielles Angebot desselben Betreibers. Sie gehören nicht zum Schulportal Hessen oder zum Land Hessen.</li>
              <li>Bei Nutzung des Standard-Backends erhält dieses dein Schulportal-Passwort und speichert es verschlüsselt, aber wieder entschlüsselbar, für erneute Anmeldungen beim Schulportal.</li>
              <li>Das Standard-Backend speichert auch Profil- und kontobezogene Nutzungsdaten. Der Betreiber kann auf serverseitig verarbeitete Daten zugreifen; die Verschlüsselung schließt diesen Zugriff nicht aus.</li>
              <li>Die Schriftarten werden von unseren eigenen Servern geladen. Externe Symbol-Stylesheets werden bereits beim Seitenaufruf geladen; weitere externe Dienste kommen je nach Funktion hinzu.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">1. Verantwortlicher und Kontakt</h2>
            <p>Bennet Joan Wegener</p>
            <p>63150 Heusenstamm</p>
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
              werden. Die Benutzeroberfläche (Lanis UI) und das Backend (lanis_api) sind getrennte
              Softwareprojekte. Für beide Dienste, einschließlich der serverseitigen Verarbeitung im
              bereitgestellten Standard-Backend, ist die unter Abschnitt 1 genannte Person verantwortlich.
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
              Das Standard-Backend unter{' '}
              <span className="text-[#333] break-all">{DEFAULT_API_BASE_URL}</span> verwendet deine
              Zugangsdaten zur Anmeldung beim Schulportal. Es speichert das Passwort serverseitig
              verschlüsselt und kann es wieder entschlüsseln, um deine Schulportal-Sitzung erneut
              herzustellen. Es handelt sich damit nicht um eine reine Weiterleitung ohne Speicherung
              und nicht um eine Ende-zu-Ende-Verschlüsselung gegenüber dem Betreiber. Die
              Sitzungsgültigkeit und die weiteren Speicherfristen stehen in Abschnitt 9.
            </p>
            <p className="mt-2">
              Das Backend verarbeitet außerdem die von dir abgerufenen schulischen Inhalte, etwa
              Nachrichten, Kurse, Aufgaben und Pläne, und hält je nach Funktion Zwischenspeicher vor.
              Die technische Trennung von UI und Backend begrenzt nicht die Verantwortung des gemeinsamen
              Betreibers. Bei einem selbst eingestellten Backend erhält dessen Betreiber deine
              Zugangsdaten und Anfragen; für seine Verarbeitung gelten seine eigenen Angaben.
            </p>
            <p className="mt-2">
              Unabhängig von einem selbst eingestellten Backend ruft die Startseite beim Öffnen öffentliche,
              zusammengefasste Konto- und Schulzahlen sowie bekannte Schulstandorte vom
              bereitgestellten Standard-Backend unter{' '}
              <span className="text-[#333] break-all">{DEFAULT_API_BASE_URL}</span> ab. Diese Anfrage
              enthält keine von Lanis UI gespeicherten Zugriffs- oder Aktualisierungstoken. Technisch
              erforderliche Verbindungsdaten wie IP-Adresse, Zeitpunkt, Browserinformationen und die
              Adresse der aufrufenden Seite werden dabei an das Standard-Backend übermittelt.
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
            <h2 className="text-base font-semibold text-[#111] mb-3">5. Seitenaufruf und externe Ressourcen</h2>
            <p>
              Beim Aufruf der Website erhalten die Server, die Benutzeroberfläche und Backend
              bereitstellen, technisch erforderliche Verbindungsdaten wie IP-Adresse, Zeitpunkt,
              angeforderte Adresse und Browserinformationen.
              Die Schriftarten Outfit, JetBrains Mono, Syne und Fraunces werden von unseren eigenen
              Servern bereitgestellt. Zum Laden dieser Schriftarten wird keine Verbindung zu Google
              hergestellt. Die Website bindet Symbol-Stylesheets von cdnjs (cdnjs.cloudflare.com) ein.
              Die Anfragen an cdnjs erfolgen automatisch beim Seitenaufruf, auch ohne Anmeldung und ohne
              Aktivierung der Schulkarte. Der Anbieter erhält dabei insbesondere deine IP-Adresse und
              die technischen Anfragedaten; die Herkunftsseite wird bei diesen Stylesheet-Anfragen durch
              die Einstellung „no-referrer“ unterdrückt.
            </p>
            <p className="mt-2">
              Die Startseite enthält eine Schulkarte, die erst nach einem Klick auf „Karte laden“
              Kartenbilder direkt von OpenStreetMap abruft. Dabei stellt dein Browser eine Verbindung
              zu Servern der OpenStreetMap Foundation her und übermittelt technisch erforderliche Daten,
              insbesondere die IP-Adresse, Browserinformationen, den Zeitpunkt, den angeforderten
              Kartenausschnitt und die Adresse der aufrufenden Seite. Weitere Informationen findest du in
              der{' '}
              <a
                href="https://osmfoundation.org/wiki/Privacy_Policy"
                target="_blank"
                rel="noreferrer"
                className="text-[#00a0c0] underline underline-offset-2 hover:text-[#00c0e0] transition-colors"
              >
                Datenschutzerklärung der OpenStreetMap Foundation
              </a>.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">6. Push-Benachrichtigungen</h2>
            <p>
              Push-Benachrichtigungen sind freiwillig und werden erst nach deiner Aktivierung und der
              Berechtigung durch den Browser eingerichtet. Dabei werden eine gerätebezogene Push-Adresse
              und die dazugehörigen Schlüssel an das Backend übermittelt. Die Zustellung erfolgt über den
              Push-Dienst des verwendeten Browsers oder Betriebssystems. Du kannst die Berechtigung in den
              Browser- oder Systemeinstellungen widerrufen.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">7. WhatsApp-Assistent</h2>
            <p>
              Wenn du den optionalen WhatsApp-Assistenten aktiv mit deinem Konto verbindest, verarbeitet
              das Backend eine abgeleitete Kennung deiner WhatsApp-Nummer, die letzten vier Ziffern zur
              Anzeige, den Zeitpunkt der Verknüpfung und deine Einstellung zu Nachrichtenvorschauen. Ein
              kurzzeitig gültiger Einmalcode stellt die Verbindung her. Dein Schulportal-Passwort wird
              dabei nicht an WhatsApp übermittelt.
            </p>
            <p className="mt-2">
              Nachrichten, die du an den Assistenten sendest, und seine Antworten werden über die
              WhatsApp Business Platform von Meta verarbeitet. Wenn ein KI-Anbieter eingerichtet ist,
              erhält dieser deine Frage, den zur Verarbeitung verwendeten Gesprächsverlauf und die
              Ergebnisse der vom Assistenten abgerufenen LANIS-Funktionen. Darin können personenbezogene
              schulische Inhalte enthalten sein. Gespeicherte Schulportal-Zugangsdaten und die
              WhatsApp-Nummer werden nicht automatisch als Kontodaten an den KI-Anbieter übergeben.
              Angaben, die du selbst in eine Nachricht schreibst, sind jedoch Teil dieser Nachricht.
              Beim bereitgestellten Standard-Backend wird der begrenzte Gesprächsverlauf verschlüsselt
              gespeichert. Seine Frist läuft 24 Stunden nach der letzten Aktualisierung ab und beginnt
              bei weiteren Nachrichten erneut. Beim Trennen der Verbindung wird er gelöscht. Bei einem selbst eingestellten Backend richten sich Schutzmaßnahmen
              und Speicherfristen nach den Angaben seines Betreibers.
              Antworten können von dir angeforderte
              schulische Angaben enthalten, etwa Stundenplan, Vertretungen, Aufgaben, Termine oder – nur
              nach gesonderter Aktivierung – Absender und Betreff ungelesener Nachrichten. Änderungen im
              Schulportal werden erst nach einer zusätzlichen ausdrücklichen Bestätigung ausgeführt. Du kannst die
              Verbindung jederzeit in den Einstellungen oder mit dem Befehl „STOP“ trennen.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">7a. Externe Agenten</h2>
            <p>
              Wenn du einen externen Agenten wie ChatGPT oder Claude mit LANIS verbindest, bestätigst du
              den Zugriff auf einer LANIS-Freigabeseite. Du wählst die Berechtigungen für jede Verbindung
              einzeln. Eingeschränkter Zugriff erlaubt gewöhnliche Lesefunktionen ohne persönliche Profildaten, Noten, Fehlzeiten, persönliche Videokonferenzlinks oder Schreibaktionen. Vollzugriff
              umfasst auch Änderungen und sensible Daten; unter Benutzerdefiniert wählst du einzelne
              Berechtigungen. Das Backend speichert den Namen der Verbindung, den angefragten App-Namen, die
              Rückkehradresse des Anbieters, Berechtigungen sowie Verbindungs- und Nutzungszeitpunkte.
              Zugangstokens werden nur als Hash gespeichert. Dein Schulportal-Passwort wird nicht an
              den Agenten übermittelt.
            </p>
            <p className="mt-2">
              Bei einem Abruf erhält der Anbieter des Agenten die angeforderten, freigegebenen Schuldaten, etwa Aufgaben, Pläne, Nachrichten oder Dateien und bei gesonderter Freigabe persönliche Profildaten, Noten, Fehlzeiten und persönliche Videokonferenzlinks. Schreibfreigaben ermöglichen zusätzlich die ausdrücklich beauftragten Änderungen, etwa Nachrichtenversand, Abgaben oder Schulwahlen. Für die
              weitere Verarbeitung dort gelten dessen Datenschutzbestimmungen. Unter Einstellungen →
              Agents kannst du Berechtigungen reduzieren oder eine Verbindung trennen. Das beendet
              weitere Abrufe; bereits beim Anbieter gespeicherte Inhalte werden dadurch nicht gelöscht.
              Verbindungsmetadaten bleiben bis zur Löschung deines LANIS-Kontos erhalten. Eine
              Freigabeanfrage gilt zehn Minuten, ein einmaliger Autorisierungscode zwei Minuten.
              Zugriffstokens gelten höchstens eine Stunde; die erneuerbare Verbindung gilt höchstens
              90 Tage und kann vorher widerrufen werden.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">8. Zwecke und Rechtsgrundlagen</h2>
            <p>
              Das Backend erfasst nach der Anmeldung Profildaten aus dem Schulportal, darunter die dort
              verfügbaren Angaben zu Name, Login, Schule, E-Mail-Adresse und Klasse. Es protokolliert
              außerdem kontobezogen Anmeldungen, letzte Aktivität, Sitzungsanzahl, geschätzte aktive
              Nutzungszeit und das Öffnen von Modulen. Diese Daten dienen der Kontoverwaltung,
              Betriebsübersicht und der Ermittlung der Größe der Nutzerbasis. Kontobezogene Sitzungs-
              und Aktivitätsdaten unterstützen außerdem die Fehleranalyse bei gemeldeten Problemen;
              Benutzername und Schulkennung ermöglichen die Zuordnung zum betroffenen Konto.
              Die Daten sind dem jeweiligen Konto zugeordnet und
              können von berechtigten Administratoren im privaten Verwaltungsportal eingesehen werden.
              Öffentlich angezeigte Konto- und Schulzahlen sind dagegen zusammengefasste Angaben.
            </p>
            <p className="mt-2">
              Wenn der Betreiber einen Discord-Webhook für neue Konten konfiguriert hat, übermittelt
              das Backend bei der ersten erfassten Anmeldung den Benutzernamen und die Schulkennung
              an Discord. Die Benachrichtigungen ermöglichen unter anderem die Überprüfung, ob eine
              bestimmte eingeladene Testperson erfolgreich auf LANIS zugreifen konnte. Sie werden für
              jedes erstmals erfasste Konto ausgelöst und enthalten personenbezogene Kennungen.
            </p>
            <p className="mt-2">
              Soweit ein Nutzungsverhältnis besteht, erfolgt die für die angeforderten Funktionen
              erforderliche Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Im Übrigen stützt
              sie sich auf Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in der sicheren und
              funktionsfähigen Bereitstellung der Anwendung, der Ermittlung der Größe der Nutzerbasis,
              der Fehleranalyse bei Supportanfragen sowie der Überprüfung des erfolgreichen Zugangs
              eingeladener Testpersonen. Freiwillige Push-Benachrichtigungen und die
              WhatsApp-Verknüpfung werden nur nach deiner ausdrücklichen Aktivierung eingerichtet; soweit
              eine Einwilligung erforderlich ist, gilt Art. 6 Abs. 1 lit. a DSGVO.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">9. Empfänger und Speicherdauer</h2>
            <p>
              {usesCustomBackend
                ? 'Das oben angezeigte Backend ist ein getrennt betriebenes System des von dir ausgewählten Betreibers.'
                : 'Das oben angezeigte Backend ist ein getrennt betriebenes System desselben Verantwortlichen.'}{' '}
              Zur Bereitstellung der angeforderten schulischen Funktionen kommuniziert es mit dem
              Schulportal Hessen. cdnjs erhält bereits beim Seitenaufruf die in
              Abschnitt 5 beschriebenen Anfragedaten. Nach dem Laden der Schulkarte empfängt die OpenStreetMap Foundation die
              in Abschnitt 5 beschriebenen Verbindungsdaten. Bei Nutzung von Push-Benachrichtigungen wird außerdem der Push-Dienst des
              Browsers oder Betriebssystems einbezogen. Beim freiwilligen WhatsApp-Assistenten wird
              außerdem die WhatsApp Business Platform von Meta und gegebenenfalls der konfigurierte
              KI-Anbieter einbezogen. Bei konfigurierten Betreiberbenachrichtigungen wird Discord wie in
              Abschnitt 8 beschrieben einbezogen. Lokal gespeicherte Daten bleiben erhalten, bis sie
              durch die Anwendung entfernt oder ersetzt werden oder du die Website-Daten im Browser
              löschst. Eine Abmeldung entfernt nicht automatisch sämtliche lokalen Einstellungen und Caches.
            </p>
            <div className="mt-3 space-y-2">
                <p>Beim bereitgestellten Standard-Backend gelten derzeit folgende Kategorien und Fristen:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Schulportal-Zugangsdaten werden wieder entschlüsselbar gespeichert; LANIS-Aktualisierungssitzungen sind bis zu 90 Tage nach der Anmeldung gültig. Abgelaufene Sitzungen und zugehörige Zugangsdaten werden bei der serverseitigen Bereinigung entfernt;</li>
                  <li>Profil, Einstellungen, eigene Stunden, Klassenverknüpfungen, Push-Abos sowie Login- und Aktivitätsdaten: bis zur Löschung des LANIS-Kontos;</li>
                  <li>gewöhnliche Antwort-Caches: regelmäßig 10 Minuten; Profil-, App- und Moduldaten höchstens 30 Tage;</li>
                  <li>private Ausfall-Snapshots: höchstens 24 Stunden; gemeinsam genutzte heruntergeladene Unterrichtsdateien: höchstens 30 Tage;</li>
                  <li>WhatsApp-Gesprächsverlauf: 24 Stunden nach der letzten Aktualisierung; Einmalcodes und ausstehende Bestätigungen: 10 Minuten;</li>
                  <li>externe WhatsApp-Nachrichten-IDs zur Verhinderung doppelter Verarbeitung: 7 Tage.</li>
                </ul>
                <p>
                  Technische Zugriffs- und Betriebsprotokolle des Standard-Backends dienen der
                  Fehleranalyse und dem sicheren Betrieb. Sie können Verbindungsadressen, Zeitpunkte,
                  angeforderte Pfade einschließlich Abfrageparametern, HTTP-Statuscodes sowie
                  Fehlermeldungen und in Anwendungsmeldungen auch Benutzer- und Schulkennungen enthalten.
                  Diese Protokolle liegen auf dem Backend-Server derzeit in einem flüchtigen
                  Systemprotokoll im Arbeitsspeicher. Es gibt keine feste Aufbewahrungsfrist in Tagen:
                  Ältere Einträge werden bei der speicherplatzabhängigen Rotation entfernt; spätestens
                  mit einem Neustart des Servers gehen die verbleibenden Einträge verloren. Ein Neustart
                  nur der Backend-Anwendung löscht das Systemprotokoll nicht. Die LANIS-Anwendung legt
                  keine eigenen Sicherungskopien dieser Systemprotokolle an. Die hier beschriebene
                  Speicherung ist von den kontobezogenen Login- und Aktivitätsdaten getrennt.
                </p>
                <p>Die Fristen für Caches und kurzlebige Daten beschreiben deren vorgesehene Gültigkeit. Die physische Entfernung erfolgt durch die jeweilige Bereinigung und kann zeitlich nachgelagert sein.</p>
                <p>Beim Löschen des LANIS-Kontos werden die kontobezogenen Daten und Sitzungen in den aktiven Kontodatenbanken und kontobezogenen Zwischenspeichern beim Standard-Backend entfernt. Daten im Schulportal Hessen selbst werden dadurch nicht gelöscht. Gemeinsam genutzte Unterrichtsdateien werden nicht einem einzelnen Konto zugeordnet und deshalb erst nach Ablauf ihrer Cache-Frist entfernt.</p>
            </div>
            {usesCustomBackend && (
              <p className="mt-2">Bei einem selbst eingestellten Backend richten sich Speicherkategorien und Löschfristen nach den Angaben und der Konfiguration seines Betreibers.</p>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">10. Deine Rechte</h2>
            <p>
              Du hast im Rahmen der gesetzlichen Voraussetzungen insbesondere das Recht auf Auskunft,
              Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.
              Eine erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Du hast
              außerdem das Recht, dich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren.
            </p>
            <p className="mt-2">
              Beim bereitgestellten Standard-Backend kannst du in den Einstellungen unter „Datenschutz und
              Konto“ deine von LANIS gespeicherten Daten als JSON exportieren oder alle kontobezogenen
              LANIS-Daten in den aktiven Kontodatenbanken und kontobezogenen Zwischenspeichern löschen.
              Diese Funktion löscht keine bereits an externe Anbieter übermittelten Daten und keine
              Betriebsprotokolle. Für Auskunft oder Löschanfragen darüber hinaus nutze den Kontakt in
              Abschnitt 1. Sicherheitsgeheimnisse wie Passwörter, Tokens, Cookies und
              kryptografische Schlüssel sind nicht Bestandteil des Exports.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">11. Sicherheit und Änderungen</h2>
            <p>
              Die Anwendung soll nur über eine verschlüsselte HTTPS-Verbindung bereitgestellt werden.
              Eine Datenübertragung im Internet kann dennoch nie vollständig gegen alle Risiken abgesichert
              werden. Diese Datenschutzerklärung kann angepasst werden, wenn sich Funktionen,
              Datenverarbeitungen oder rechtliche Anforderungen ändern.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">12. Optionale Nutzungsanalyse mit PostHog</h2>
            <p>Wenn du zustimmst, verwenden wir PostHog mit dem EU-Erfassungsdienst über unseren Proxy t.lanis.arg-server.de. Wir erfassen, welche Funktionen du nutzt, welche Schritte gelingen oder fehlschlagen und wie lange Seiten und API-Anfragen brauchen. Wir messen auch Web Vitals und unterscheiden zwischengespeicherte von frisch geladenen Ansichten. Dazu gehören bereinigte Seitennamen, fest definierte Aktionen, technische Statuswerte sowie Browser- und Sitzungskennungen. Nach der Anmeldung verknüpfen wir diese Ereignisse über eine zufällige Kontokennung mit deinem LANIS-Konto. Nur unser Backend kann diese Kennung deinem Konto zuordnen. So können wir wiederkehrende Probleme und die Nutzung über mehrere Geräte hinweg untersuchen.</p>
            <p className="mt-2">PostHog erhält keine Zugangsdaten, Schulportal-Inhalte, Suchtexte oder ursprünglichen Fehlertexte. Bei Fehlern übertragen wir bereinigte Stackframes und eine Diagnosekennung an PostHog. Zusätzlich speichern wir im Backend bis zu sieben Tage technische Anfragekennungen, bereinigte Endpunktnamen, Statuswerte und Laufzeiten, damit berechtigte Administratoren Fehler einem Konto zuordnen können. Die ursprüngliche Fehlermeldung und der Stacktrace können Angaben aus dem aktuellen Anwendungskontext enthalten. Sie werden ausschließlich an unser authentifiziertes Backend gesendet, dort mit einem serverseitigen Schlüssel verschlüsselt und nach spätestens sieben Tagen gelöscht. Berechtigte Administratoren können diese Diagnose über die Kennung abrufen; der Zugriff wird protokolliert. Passwörter und Sitzungstoken werden nicht als Verschlüsselungsschlüssel verwendet.</p>
            <p className="mt-2">Sitzungsaufzeichnungen, automatisches Erfassen von Formularinhalten und Konsolenaufzeichnungen sind deaktiviert. Die IP-Adresse wird für die Netzwerkverbindung technisch verarbeitet; ihre Speicherung als Ereigniseigenschaft und die Standortanreicherung sind deaktiviert. Deine Entscheidung und die Analysekennung werden lokal gespeichert.</p>
            <p className="mt-2">Du kannst die Analyse ohne Einschränkung der App ablehnen oder hier jederzeit für die Zukunft widerrufen. Dabei löschen wir die lokale Analysekennung und stoppen weitere Analyseübertragungen. Bereits übermittelte Ereignisse werden dadurch nicht gelöscht. Bei einer Kontolöschung entfernen wir die Kontozuordnung und die Diagnosen in unserem Backend. Daten, die bereits bei PostHog liegen, werden dadurch nicht automatisch gelöscht. Die Analyse umfasst nur Nutzende mit Einwilligung und bildet deshalb nicht die gesamte Nutzung ab.</p>
            <a href="https://posthog.com/privacy" className="underline">Datenschutzhinweise von PostHog</a>
            <div className="mt-4"><AnalyticsControls /></div>
          </div>

          <hr className="border-black/[0.06]" />

          <p className="text-xs text-[#bbb] pt-2">
            Stand: 26. Oktober 2026
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

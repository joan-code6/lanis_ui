import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../seo/SEO';

const sections = [
  ['1. Anbieter und Geltungsbereich', 'LANIS wird von Bennet Joan Wegener, 63150 Heusenstamm, Deutschland, angeboten. Kontakt: lanis-impressum@joancode.dev. Diese Bedingungen beschreiben die Nutzung der LANIS-Weboberfläche, des bereitgestellten Standard-Backends und der Verbindung zu externen Agenten. Für selbst betriebene Backends ist deren jeweiliger Betreiber verantwortlich.'],
  ['2. Kostenloses, unabhängiges Angebot', 'LANIS ist kostenlos und ein privates, inoffizielles Angebot. Es gehört weder zum Land Hessen noch zum Schulportal Hessen. Voraussetzung für schulische Funktionen ist ein berechtigter Zugang zu einer unterstützten Schule. Die Regeln deiner Schule, des Schulportals und des verwendeten Agentenanbieters gelten zusätzlich. Nutze nur Konten und Inhalte, auf die du zugreifen darfst.'],
  ['3. Verbindung mit ChatGPT und anderen Agenten', 'Du startest die Verbindung beim Agentenanbieter und meldest dich auf der LANIS-Seite an. Gib Schulportal-Passwörter und Zugangstokens ausschließlich in den vorgesehenen Anmeldeoberflächen ein. Auf der Freigabeseite wählst du den Zugriff für jede Verbindung. Der angezeigte App-Name kann vom anfragenden Client selbst stammen; prüfe auch die angezeigte Rückleitungsadresse.'],
  ['4. Berechtigungen und Änderungen', 'Eingeschränkter Zugriff umfasst gewöhnliche Lesefunktionen. Persönliche Profildaten, Noten, Fehlzeiten, persönliche Videokonferenzlinks und Schreibaktionen benötigen gesonderte Freigaben. Vollzugriff umfasst alle unterstützten Berechtigungen; unter Benutzerdefiniert wählst du einzelne Funktionen. Nachrichtenversand, Abgaben und verbindliche Wahlen können Folgen im Schulportal haben. Prüfe Ziel und Inhalt, bevor du einen Agenten mit einer solchen Aktion beauftragst. Persönliche Stundenplananpassungen gelten wöchentlich wiederkehrend und ändern den offiziellen Schulplan nicht.'],
  ['5. Schuldaten und Antworten', 'Die verfügbaren Funktionen richten sich nach Schule, Konto und Berechtigungen. Schulportal-Störungen, unvollständige Einträge und verzögerte Daten können Ergebnisse beeinflussen. KI-Antworten können Fehler enthalten. Vergleiche wichtige Fristen, Prüfungstermine und verbindliche Angaben mit den offiziellen Informationen deiner Schule. LANIS kann keine bestimmte Verfügbarkeit oder fehlerfreie KI-Antworten zusagen. Gesetzliche Ansprüche bleiben unberührt.'],
  ['6. Verantwortlicher Umgang', 'Verwende LANIS nur für berechtigte schulische Zwecke. Veröffentliche keine vertraulichen Schuldaten oder persönlichen Videokonferenzlinks. Lade nur Dateien hoch, die du verwenden und weitergeben darfst. Versuche nicht, Zugriffskontrollen zu umgehen, fremde Konten auszulesen oder den Dienst zu stören.'],
  ['7. Trennen und Löschen', 'Du kannst eine Agentenverbindung in LANIS unter Einstellungen → Agents widerrufen oder ihre Berechtigungen reduzieren. Ein Widerruf verhindert weitere Abrufe mit dieser Verbindung. Bereits beim Agentenanbieter gespeicherte Inhalte werden dadurch nicht gelöscht; verwende dafür dessen Einstellungen. In LANIS kannst du deine Kontodaten exportieren oder dein LANIS-Konto löschen. Dein Schulportal-Konto wird dadurch nicht gelöscht.'],
  ['8. Datenschutz und Kontakt', 'Die Datenschutzerklärung erläutert die Verarbeitung, Empfänger und Speicherfristen deiner Daten. Für Fragen oder Probleme erreichst du den Betreiber unter lanis-impressum@joancode.dev. Sende keine Passwörter, Tokens oder vertraulichen Schuldaten in öffentliche Fehlerberichte.'],
];

const TermsOfService: React.FC = () => (
  <div className="min-h-screen bg-[#fcfcf9] text-[#1a1a1a] font-['Outfit',sans-serif]">
    <SEO title="Nutzungsbedingungen" description="Nutzungsbedingungen für LANIS und die Verbindung mit externen Agenten." path="/terms-of-service" noindex />
    <main className="max-w-2xl mx-auto px-6 py-24">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-[#555] transition-colors mb-12">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück zur Startseite
        </Link>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#111] mb-2">Nutzungsbedingungen</h1>
      <p className="text-sm text-[#777] mb-16">LANIS und externe Agenten · Stand: 25. Oktober 2026</p>
      <div className="space-y-10 text-[14px] leading-relaxed text-[#555]">
        {sections.map(([title, text]) => <section key={title}><h2 className="text-base font-semibold text-[#111] mb-3">{title}</h2><p>{text}</p></section>)}
        <nav aria-label="Rechtliche Informationen" className="flex flex-wrap gap-6 border-t border-black/[0.06] pt-6">
          <Link to="/privacy-policy" className="underline underline-offset-2">Datenschutzerklärung</Link>
          <Link to="/impressum" className="underline underline-offset-2">Impressum</Link>
        </nav>
      </div>
    </main>
  </div>
);

export default TermsOfService;

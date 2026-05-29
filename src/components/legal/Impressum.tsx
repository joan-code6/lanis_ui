import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../seo/SEO';

const Impressum: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcf9] text-[#1a1a1a] font-['Outfit',sans-serif]">
      <SEO
        title="Impressum"
        description="Impressum und rechtliche Hinweise zu Lanis — der modernen Benutzeroberfläche für das Schulportal Hessen."
        path="/impressum"
        noindex
      />
      <div className="max-w-2xl mx-auto px-6 py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-[#555] transition-colors mb-12">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Zurück zur Startseite
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#111] mb-2">Impressum</h1>
        <p className="text-sm text-[#999] mb-16">Angaben gemäß § 5 TMG sowie weitere rechtliche Hinweise</p>

        <section className="space-y-12 text-[14px] leading-relaxed text-[#555]">

          {/* ─── Anbieterkennzeichnung ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 1 Diensteanbieter</h2>
            <p>Bennet Joan Wegener</p>
            <p>60599 Heusenstamm</p>
            <p>Deutschland</p>
            <div className="mt-3">
              <p>
                E-Mail:{' '}
                <a href="mailto:lanis-impressum@joancode.dev" className="text-[#00a0c0] underline underline-offset-2 hover:text-[#00c0e0] transition-colors">
                  lanis-impressum@joancode.dev
                </a>
              </p>
            </div>
            <p className="mt-3 text-xs text-[#aaa]">
              Bei diesem Angebot handelt es sich um ein privates, nicht-kommerzielles Projekt.
              Eine Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz ist nicht vorhanden.
              Das Projekt wird nicht gewerblich betrieben und unterliegt keinen berufsrechtlichen
              Regelungen.
            </p>
          </div>

          {/* ─── Haftung ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 2 Haftung für Inhalte</h2>
            <p>
              Die Inhalte dieser Anwendung wurden mit größtmöglicher Sorgfalt und nach bestem Wissen
              und Gewissen erstellt. Dennoch kann der Anbieter dieser Webseite keine Gewähr für die
              Aktualität, Vollständigkeit, Richtigkeit und Genauigkeit der bereitgestellten Inhalte
              und Informationen übernehmen.
            </p>
            <p className="mt-2">
              Als Diensteanbieter ist der Betreiber dieser Webseite gemäß § 7 Abs. 1 TMG für eigene
              Inhalte und bereitgestellte Informationen auf diesen Seiten nach den allgemeinen Gesetzen
              verantwortlich. Eine Verpflichtung zur Überwachung übermittelter oder gespeicherter
              fremder Informationen besteht jedoch gemäß den §§ 8 bis 10 TMG nicht. Eine unverzügliche
              Entfernung oder Sperrung dieser Inhalte erfolgt ab dem Zeitpunkt der Kenntnis einer
              konkreten Rechtsverletzung. Eine Haftung ist erst ab dem Zeitpunkt der Kenntniserlangung
              möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden diese Inhalte
              umgehend entfernt.
            </p>
          </div>

          {/* ─── Links ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 3 Haftung für Links</h2>
            <p>
              Das Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte der Anbieter
              keinen Einfluss hat. Aus diesem Grund kann der Anbieter für diese fremden Inhalte auch
              keine Gewähr übernehmen. Für die Inhalte und die Richtigkeit der Informationen der
              verlinkten Seiten ist stets der jeweilige Informationsanbieter oder Betreiber der
              verlinkten Webseite verantwortlich.
            </p>
            <p className="mt-2">
              Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße und
              erkennbare Rechtsverletzungen überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
              Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten
              ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
              Bekanntwerden von Rechtsverletzungen werden derartige Links umgehend entfernt.
            </p>
          </div>

          {/* ─── Urheberrecht ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 4 Urheberrecht</h2>
            <p>
              Die durch den Betreiber erstellten Inhalte und Werke auf dieser Webseite unterliegen dem
              deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
              Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der vorherigen schriftlichen
              Zustimmung des jeweiligen Autors beziehungsweise Erstellers. Downloads und Kopien der
              Seite sind ausschließlich für den privaten, nicht-kommerziellen Gebrauch gestattet.
            </p>
            <p className="mt-2">
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
              Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
              gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden,
              bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
              werden derartige Inhalte umgehend entfernt.
            </p>
            <p className="mt-2">
              Die auf dieser Webseite verwendeten Markennamen, Logos und geschäftlichen Bezeichnungen
              unterliegen den Rechten ihrer jeweiligen Eigentümer. Die bloße Nennung stellt keine
              Verletzung von Schutzrechten dar und impliziert keine Zugehörigkeit oder Unterstützung
              durch die jeweiligen Rechteinhaber.
            </p>
          </div>

          {/* ─── Keine Abmahnung ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 5 Keine Abmahnung ohne vorherigen Kontakt</h2>
            <p>
              Sollten Inhalte oder die Aufmachung dieser Webseite Rechte Dritter oder gesetzliche
              Bestimmungen verletzen, wird um eine entsprechende Nachricht ohne Kostennote gebeten.
              Der Anbieter garantiert, dass zu Recht beanstandete Passagen unverzüglich entfernt oder
              angepasst werden, ohne dass die Einschaltung eines Rechtsbeistandes erforderlich ist.
              Dennoch vom Anbieter ohne vorherige Kontaktaufnahme ausgelöste Kosten werden vollumfänglich
              zurückgewiesen und lösen gegebenenfalls eine Gegenklage wegen Verletzung vorgenannter
              Bestimmungen aus.
            </p>
            <p className="mt-2">
              Die Einschaltung eines Rechtsanwaltes zur kostenpflichtigen Abmahnung oder
              Unterlassungserklärung entspricht nicht dem wirklichen oder mutmaßlichen Willen des
              Anbieters und stellt einen Verstoß gegen § 8 Abs. 4 UWG dar, da eine missbräuchliche
              Geltendmachung von Ansprüchen vorliegt.
            </p>
          </div>

          {/* ─── Datenschutz ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 6 Datenschutz</h2>
            <p>
              Der Schutz Ihrer persönlichen Daten ist dem Anbieter ein wichtiges Anliegen. Die Nutzung
              dieser Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf
              diesen Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder
              E-Mail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger
              Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte
              weitergegeben.
            </p>
            <p className="mt-2">
              Der Anbieter weist ausdrücklich darauf hin, dass die Datenübertragung im Internet —
              insbesondere bei der Kommunikation per E-Mail — Sicherheitslücken aufweisen und nicht
              vollständig vor dem Zugriff durch Dritte geschützt werden kann. Eine lückenlose
              Schutzdaten vor dem Zugriff durch Dritte ist technisch nicht realisierbar.
            </p>
            <p className="mt-2">
              Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten durch
              Dritte zur Übersendung von nicht ausdrücklich angeforderter Werbung und
              Informationsmaterialien wird hiermit ausdrücklich widersprochen. Der Betreiber der
              Seiten behält sich ausdrücklich rechtliche Schritte im Falle der unverlangten Zusendung
              von Werbeinformationen, etwa durch Spam-Mails, vor.
            </p>

            <h3 className="text-sm font-semibold text-[#333] mt-6 mb-2">Datenverarbeitung bei Nutzung der Plattform</h3>
            <p>
              Lanis UI fungiert als alternative Benutzeroberfläche für das offizielle Schulportal
              Hessen. Die Plattform erhebt und verarbeitet keinerlei personenbezogene Daten
              eigenständig. Eine Registrierung oder ein separates Nutzerkonto bei Lanis UI ist nicht
              erforderlich und technisch nicht vorgesehen. Der Zugang erfolgt ausschließlich über die
              Anmeldedaten des offiziellen Schulportal-Zugangs des Landes Hessen.
            </p>
            <p className="mt-2">
              Sämtliche Kommunikation zwischen Ihrem Endgerät und den Backend-Servern von Lanis UI
              erfolgt ausschließlich über verschlüsselte Verbindungen mittels moderner
              Transportverschlüsselung (TLS 1.3). Die von Ihnen eingegebenen Zugangsdaten werden
              ausschließlich serverseitig entschlüsselt und unmittelbar sowie zweckgebunden für die
              Authentifizierung gegenüber dem offiziellen Schulportal Hessen verwendet. Eine
              dauerhafte Speicherung, Protokollierung, Zwischenspeicherung oder sonstige
              Weiterverarbeitung Ihrer Zugangsdaten, Ihrer schulbezogenen Inhalte oder Ihrer
              personenbezogenen Daten findet auf den Servern von Lanis UI zu keinem Zeitpunkt statt.
              Die Datenverarbeitung beschränkt sich auf die technisch zwingend erforderliche
              Durchleitung der Daten an das Zielsystem.
            </p>
            <p className="mt-2">
              Lanis UI setzt keine Cookies zu Tracking- oder Analysezwecken ein. Es werden
              ausschließlich technisch notwendige Sitzungsdaten im flüchtigen Arbeitsspeicher
              verarbeitet, die mit Beendigung der Sitzung unwiderruflich gelöscht werden. Eine
              Weitergabe von Daten an Dritte, insbesondere zu Werbe- oder Analysezwecken, erfolgt
              nicht.
            </p>
          </div>

          {/* ─── Salvatorische Klausel ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 7 Salvatorische Klausel</h2>
            <p>
              Sollten einzelne Bestimmungen dieses Impressums ganz oder teilweise unwirksam oder
              undurchführbar sein oder werden, so wird hiervon die Wirksamkeit der übrigen
              Bestimmungen nicht berührt. Anstelle der unwirksamen oder undurchführbaren Bestimmung
              gilt eine angemessene Regelung, die dem am nächsten kommt, was die Vertragsparteien
              nach dem Sinn und Zweck des Impressums gewollt haben würden, sofern sie den Punkt
              bedacht hätten. Gleiches gilt für den Fall einer Regelungslücke.
            </p>
          </div>

          {/* ─── Gerichtsstand ─── */}
          <div>
            <h2 className="text-base font-semibold text-[#111] mb-3">§ 8 Gerichtsstand und anwendbares Recht</h2>
            <p>
              Für sämtliche Rechtsbeziehungen zwischen dem Anbieter und den Nutzern dieses Angebots
              gilt ausschließlich das Recht der Bundesrepublik Deutschland. Gerichtsstand ist — soweit
              gesetzlich zulässig — Offenbach am Main. Das UN-Kaufrecht (CISG) findet keine Anwendung.
            </p>
            <p className="mt-2">
              Sofern der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder
              öffentlich-rechtliches Sondervermögen ist, ist ausschließlicher Gerichtsstand für alle
              sich aus diesem Vertragsverhältnis ergebenden Streitigkeiten der Geschäftssitz des
              Anbieters. Dasselbe gilt, wenn der Nutzer keinen allgemeinen Gerichtsstand in
              Deutschland hat oder Wohnsitz oder gewöhnlicher Aufenthalt im Zeitpunkt der
              Klageerhebung nicht bekannt sind.
            </p>
          </div>

          <hr className="border-black/[0.06]" />

          <p className="text-xs text-[#bbb] pt-2">
            Stand: Mai 2026 — Dieses Impressum gilt auch für die Präsenzen von Lanis UI auf
            sämtlichen Plattformen und in sämtlichen sozialen Netzwerken.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Impressum;

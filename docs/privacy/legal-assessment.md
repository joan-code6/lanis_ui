# Rechtsgrundlagen und Informationen über andere Personen

Stand 20.10.2026. Diese fallbezogene Arbeitsbewertung dokumentiert Argumente und
offene Voraussetzungen; sie erfindet keine behördliche Genehmigung und ersetzt
keinen tatsächlich abgeschlossenen Vertrag. Der Betreiber wünscht keine
Kontaktaufnahme zu Schulen/Behörden. Es wurde niemand kontaktiert.

## Rolle und Minderjährige

Die bestätigte unabhängige Standardinstanz bestimmt eigene Speicher-, Analyse-
und Anbieterentscheidungen. Für diese Zwecke ist eine eigene Verantwortlichkeit
der naheliegende Ausgangspunkt. Eine bloße Auftragsverarbeitung für die Schule
wird mangels Auftrag/Weisung nicht behauptet. Die Rollen folgen den tatsächlichen
Entscheidungen, nicht der Open-Source-Lizenz. [EDPB zu
Rollen](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en)

Zielgruppe sind auch Sechsjährige. Ein SPH-Login belegt weder Vertragsfähigkeit
noch elterliche Erlaubnis. Art. 6(1)(b) ist daher keine pauschale Grundlage für
alle Kinder. Die zivilrechtliche Einordnung des Nutzungsverhältnisses muss
insbesondere §§ 104, 106, 107 BGB berücksichtigen. Bei einwilligungsbasierten,
direkt an Kinder gerichteten Diensten ist Art. 8 DSGVO zu prüfen; soweit er
anwendbar ist, gilt in Deutschland grundsätzlich die Schwelle 16. Daraus folgt
kein allgemeines Verbot sämtlicher Datenverarbeitung unter 16. Zustimmung für
optionale Funktionen darf nicht mit der Kernnutzung vermischt werden.

Quellen: [BGB § 104](https://www.gesetze-im-internet.de/bgb/__104.html),
[§ 106](https://www.gesetze-im-internet.de/bgb/__106.html),
[§ 107](https://www.gesetze-im-internet.de/bgb/__107.html),
[EDPB Einwilligung](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en).

## Bewertung der Zwecke

Die Zuordnung muss pro Zweck erfolgen. Vertragserfüllung deckt nur objektiv
erforderliche Verarbeitung für die betroffene Vertragspartei; ein Nutzungsvertrag
mit einem Schüler erstreckt sich nicht automatisch auf Angaben über Lehrer oder
Mitschüler. Bei Art. 6(1)(f) sind Interesse, Erforderlichkeit und Abwägung zu
begründen. Die folgende Anwendung ist eine eigene Bewertung des untersuchten
LANIS-Designs. [EDPB zu
Rechtsgrundlagen](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en),
[EDPB zur Vertragsgrundlage](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines-art_6-1-b-adopted_after_public_consultation_en.pdf)

### A. Angeforderte Kernfunktionen und unvermeidbare Angaben über Dritte

**Interesse:** Nutzern eine bedienbare alternative Darstellung ihrer bereits
berechtigt zugänglichen SPH-Inhalte ermöglichen. Das Interesse ist konkret und
deckt Anzeige/Bearbeitung auf Nutzeranforderung, nicht beliebige Weiterverwendung.

**Erforderlichkeit:** Nur mit dem Konto tatsächlich zugängliche Inhalte abrufen;
keine zusätzliche Schulsuche nach Personen, keine dauerhaften vollständigen
Profilkopien allein für Zählstatistiken. Namen von Nachrichtenabsendern können für
die Darstellung erforderlich sein. Ganze Klassen-/Kontaktlisten oder
jahrzehntelange Historien sind dadurch nicht automatisch erforderlich.

**Abwägung:** Betroffene können die übliche Anzeige einer an den Nutzer
adressierten Nachricht erwarten, aber weniger die Speicherung bei einem
unabhängigen Betreiber. Kinder, Kommunikationsvertraulichkeit und möglicher
sozialer Schaden erhöhen das Gewicht ihrer Interessen. Kurze Caches,
kontogebundene Berechtigungen und fehlende Veröffentlichung mindern Risiken.
Entschlüsselbarkeit auf dem Server, der bestätigte Browsercachefehler und
unbegrenzte Nebendaten sprechen gegen eine pauschale positive Bewertung.

**Ergebnis:** Art. 6(1)(f) ist ein zu prüfender Ansatz, keine abgeschlossene
Freigabe. Vor positiver Entscheidung den Cachefehler beheben, Datenminimierung
festlegen und Nichtnutzerinformation sowie besondere Inhaltsarten klären. Eine
allgemeine Schulgenehmigung wird hier weder als vorhanden noch automatisch als
einzig möglicher Weg behauptet. Etwaige SPH-Nutzungsbedingungen sind zusätzlich
zu prüfen; funktionierende Zugangsdaten beantworten diese Frage nicht.

### B. Betriebssicherheit und angeforderter Support

**Interesse:** Fehler eingrenzen und Missbrauch erkennen. **Erforderlichkeit:**
Kurzzeitige technische Logs und die Zuordnung eines konkret gemeldeten Fehlers
können nützlich sein. **Abwägung:** Zugriff auf wenige zuständige Personen
begrenzen; keine Passwörter, Tokens oder Nachrichteninhalte protokollieren.
Kurze begründete Fristen und gezielte Fallbezüge sind milder als unbegrenzte
Modul-/Zeitprofile sämtlicher Kinder. **Ergebnis:** begrenzte Betriebsdaten sind
plausibel begründbar; die jetzige unbegrenzte personenbezogene Ereignishistorie
ist damit nicht abschließend gerechtfertigt. Empfohlener Entwurf: Ereignisse nach
30 Tagen löschen/aggregieren und ruhende Konten nach 12 Monaten prüfen; Fristen
erst nach Entscheidung und Umsetzung öffentlich zusagen.

### C. Nutzerzahl und identifizierende Discord-Neukontomeldungen

**Interesse:** Projektgröße verstehen und Einladungszugang prüfen.
**Erforderlichkeit:** Aggregierte Kontozahlen bzw. gezielte private Supportprüfung
erreichen diese Ziele mit weniger Offenlegung. Automatische externe Meldungen
jedes neuen Kinderkontos sind weitergehend. **Abwägung:** Nichtnutzer des
Betreiber-Discords erwarten diese Weitergabe weniger; Kontolöschung beseitigt
die externe Kopie nicht. **Ergebnis:** anhand der vorhandenen Zwecke keine
positive Erforderlichkeitsentscheidung für die umfassende Discord-Weitergabe.
Empfehlung: Identifikatoren aus Neukontomeldungen entfernen und konkrete
Supportfälle ausschließlich im privaten Adminportal zuordnen. Keine Behauptung,
dass ein bloßer Datenschutzhinweis diese Notwendigkeitsprüfung ersetzt.

### D. Feedback

Bearbeitung einer freiwillig eingereichten Fehlermeldung ist von allgemeiner
Produktanalyse zu trennen. Text/Konto können zur Rückfrage nötig sein; Weitergabe
des Volltexts an Discord ist vermeidbar, wenn das Adminportal genügt. Empfehlung:
externe Meldung auf nichtpersonenbezogene Ereignismeldung beschränken und lokale
Frist nach Abschluss festlegen. Keine ausdrückliche zusätzliche Einwilligung
allein durch einen allgemeinen „Senden“-Klick behaupten.

## Art. 14: Lehrkräfte, Mitschüler und weitere Nichtnutzer

Quelle ist das SPH über das authentifizierte Konto; zusätzlich können Nutzer
Angaben in eigene Stunden, Dateien und Feedback eingeben. Die öffentliche
Erklärung muss diese Quellen, Kategorien, Zwecke und Rechte verständlich nennen.
Ein bloßer Link für angemeldete Nutzer beweist nicht, dass Nichtnutzer die
Information erhalten haben.

Für den Informationsweg gibt es noch keinen belegten Abschluss. Mögliche Wege
sind eine tatsächlich nachweisbare vorhandene Information oder individuelle
Information, soweit erforderlich. Eine Ausnahme nach Art. 14(5) darf nicht
pauschal wegen Aufwand oder „inoffiziell“ angenommen werden. Für Art. 14(5)(b)
müssten insbesondere betroffene Zahl, Erreichbarkeit, Aufwand, Auswirkungen und
Ausgleichsmaßnahmen im konkreten Fall dokumentiert sein; dafür fehlen derzeit
ausreichende Fakten. Öffentliche Information wäre eine Maßnahme, aber kein
automatischer Ersatz. Regelfristen: spätestens ein Monat, ggf. früher bei erster
Kommunikation/Weitergabe. [EDPB Transparenzleitlinien, Abschnitt
Art. 14](https://www.edpb.europa.eu/system/files/2023-09/wp260rev01_en.pdf)

**Konkrete juristische Prüfvorlage:** Ist die ausschließlich nutzerinitiierte
Anzeige kurzzeitig zwischengespeicherter, bereits zugänglicher SPH-Inhalte durch
den unabhängigen Betreiber für Nutzer ab sechs Jahren auf Art. 6(1)(f) stützbar,
welche Art.-14-Unterrichtung ist verhältnismäßig und welche Inhaltsarten müssen
ausgenommen werden? Die Datenflüsse und Schutzlücken dieses Pakets liegen der
Frage zugrunde. Dies verlangt keine pauschale Identitätsprüfung aller Nutzer.

## Besondere Kategorien, Endgerätespeicher, Anbieteranschrift

Schuldaten sind nicht insgesamt besondere Kategorien. Freitext, Fehlzeiten oder
Dateien können aber z. B. Gesundheit oder Religion offenbaren. Solche tatsächlichen
Inhalte benötigen eine zusätzliche Voraussetzung nach Art. 9(2), nicht nur ein
Interesse nach Art. 6. Eine Einwilligung des Lesers ist nicht automatisch die der
genannten Person. Im Zweifel betroffene Verarbeitung begrenzen, statt eine
Rechtsgrundlage zu erfinden. [DSGVO](https://eur-lex.europa.eu/legal-content/DE-EN/TXT/?uri=CELEX%3A32016R0679)

Lokalen Speicher separat nach § 25 TDDDG bewerten: notwendige Authentifizierung
und ausdrücklich gewünschte Funktionen von bloßer Komfortpersistenz/Statistik
trennen. „localStorage statt Cookie“ ist keine Ausnahme. Noch keine pauschale
Cookiebannerpflicht oder pauschale Befreiung festgestellt.
[§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)

Das Impressum enthält derzeit keine Straße/Hausnummer. Prüfen, ob § 5 DDG und
ggf. weitere Anbieterpflichten anwendbar sind; „kostenlos/Open Source“ ist keine
ausreichende Einzelfallprüfung. Wo eine Anschrift erforderlich ist, reicht
Ort/Postleitzahl allein nicht. Keine Anschrift erfunden oder ungefragt aus
privaten Dateien übernommen. [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)

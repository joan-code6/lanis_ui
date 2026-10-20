# Verzeichnis der Verarbeitungstätigkeiten – Arbeitsfassung

Stand 20.10.2026. Betreiberbestätigung: unabhängiges Open-Source-Projekt ohne
Schulauftrag/-vereinbarung, eigenes Standard-Backend auf Raspberry Pi, UI bei
Cloudflare. Zielgruppe: SPH-Nutzer ab etwa sechs Jahren, einschließlich
Erwachsener. Selbsthosting durch Dritte ist möglich; diese Betreiber sind für
ihre eigenen Verarbeitungen gesondert verantwortlich. Open Source beseitigt
nicht die Verantwortung für die eigene öffentliche Instanz.

Verantwortlicher/Kontakt: Bennet Joan Wegener,
`lanis-impressum@joancode.dev`. Zustellfähige vollständige Anschrift: intern
nachzuweisen; öffentliche Angabe enthält derzeit Ort/Postleitzahl und Land.
Datenschutzbeauftragter: Bestellung/Pflicht noch nicht abschließend beurteilt.
Anbieter, Transfers und Vertragsnachweise: [providers.md](providers.md).
Technische und organisatorische Maßnahmen: [verification.md](verification.md),
[risk-assessment.md](risk-assessment.md). Die Verarbeitung erfolgt wiederkehrend;
eine Befreiung allein wegen geringer Projektgröße wird nicht unterstellt.

| ID / Zweck | Betroffene / Daten / Quelle | Zugriff und Empfänger | Tatsächliche Aufbewahrung / Rechtsbasisstatus |
| --- | --- | --- | --- |
| V1 Website ausliefern | Besucher, auch Kinder; IP, Zeit, Pfad, technische Anfragedaten aus Browser | Betreiber, Cloudflare für UI; cdnjs erhält Iconanfragen | Providerfristen offen; Backendjournal flüchtig/platzabhängig. Art. 6(1)(f) für notwendigen Betrieb als Bewertungsansatz; externe Icons separat minimieren |
| V2 Authentifizierung und SPH-Funktionen | Nutzer; Schule, Login, Passwort, Tokens und SPH-Sitzungen aus Eingabe/SPH | Standard-Backend, Schulportal, technisch beteiligte Proxyanbieter soweit vorhanden | Refresh-Sitzungen bis 90 Tage; Bereinigung kann später erfolgen. Art. 6(1)(b) nur bei wirksamem Nutzungsverhältnis und Erforderlichkeit, gerade bei Kindern nicht pauschal; siehe legal-assessment.md |
| V3 Inhalte anzeigen und bearbeiten | Nutzer und in SPH-Inhalten genannte Lehrkräfte, Mitschüler, Eltern, andere Personen; Nachrichten, Kontakte, Stunden, Termine, Aufgaben, Abgaben, Dateien, Anwesenheitsangaben | Berechtigter Nutzer, Backendbetrieb; SPH als Quelle/Ziel. Kein automatischer Anspruch auf Nutzung für beliebige weitere Zwecke | Gewöhnliche Antwortcaches ca. 10 Minuten, Profil/App/Modulcaches bis 30 Tage; private Ausfallsnapshots 24 Stunden. Rechte an Angaben über Nichtnutzer und mögliche Art.-9-Inhalte gesondert offen |
| V4 Dateien zwischenspeichern | Personen in Unterrichtsdateien; Dateien/Metadaten und kontobezogene Dateireferenzen aus SPH | Backend; Zugriffskontrolle anhand Konto/Dateireferenz | Bis 30 Tage Cache; nach Löschung letzter Kontoreferenz vorzeitige Entfernung, gemeinsam referenzierte Dateien bleiben. Gleiche Zweckbindung wie V3 |
| V5 Einstellungen und lokale Bedienung | Nutzer; Tokens, Profil-/Nachrichten-/Kurscaches, ausgewählte Schule, Darstellung, eigene Stunden, Verknüpfungen | Browser des Nutzers; serverseitige Einstellungen beim Backend | Lokal bis Ersetzung/Entfernung, aktuell keine vollständige Logoutbereinigung; serverseitig grundsätzlich bis Kontolöschung. TDDDG-Speicherung getrennt bewerten |
| V6 Betriebsübersicht/Support | Nutzer; Profilkopie, Loginzeiten, Schule/Login, Modulereignisse, aktive Zeit und Sitzungen aus SPH/Benutzung | Betreiber und zugelassene Admins; öffentlich nur zusammengefasste Zählwerte | Identifizierende Daten bis Kontolöschung; kein belegtes Inaktivitätslimit. Art. 6(1)(f)-Abwägung nicht für alle Felder/Dauern positiv abgeschlossen |
| V7 Betreiberbenachrichtigungen | Neue Nutzer; Benutzername und Schule beim ersten erfassten Login | Betreiberkanal bei Discord, dessen Anbieter und Kanalberechtigte | Externe Dauer und Löschung nicht verifiziert; entfällt nicht durch LANIS-Kontolöschung. Notwendigkeit gegenüber privatem Adminportal kritisch, siehe Interessenabwägung |
| V8 Feedback bearbeiten | Einreichende und ggf. im Text genannte Dritte; Titel, Kategorie, Text, Seitenpfad, Kontokennung, Zeit, Status/Bearbeitung | Betreiber im Adminportal; Discord bei konfiguriertem Feedbackwebhook | Lokal bis Kontolöschung, keine eigene automatische Abschlussfrist gefunden; externe Kopien separat. Supportzweck und weitergehende Produktideen getrennt bewerten |
| V9 Web Push und Benachrichtigungs-Inbox | Aktivierende Nutzer; Endpoint, Schlüssel, Präferenzen, Benachrichtigungsinhalt und Status | Backend, Browser-/Betriebssystem-Pushdienst, Gerät des Nutzers | Abos bis Entfernung/Widerruf, Sessionbereinigung/Kontolöschung; Inbox nach implementierter Status-/Ablaufbereinigung. Aktivierung belegt, rechtliche Einwilligungsfähigkeit und Informationsumfang offen |
| V10 Schulkarte | Besucher nach „Karte laden“; IP, Kachelausschnitt, Anfragedaten | OpenStreetMap Foundation | Externe Dauer laut Anbieter prüfen. Klick technisch vorgeschaltet; Klick allein ist kein vollständiger rechtlicher Einwilligungsnachweis |
| V11 Administration und Sicherheit | Admins und betroffene Konten; Allowlist, Admin-Sitzungen, Aktionen, Kontoziele, Fehler-/Zugriffslogs | Autorisierte Admins und Serveradministration | Admin-Sitzungen 30 Minuten; Audit grundsätzlich bis Löschung/Anonymisierung, Journal ohne feste Tagesfrist. Erforderlichkeits- und Zugriffskontrolle separat dokumentieren |
| V12 Betroffenenrechte/Löschsicherung | Antragsteller; Identität, Anfrage, Antwort, betroffene Daten; temporärer kontobezogener Löschmarker | Nur bearbeitende berechtigte Personen | Marker bis 1 Stunde; Verfahrensakte und Backups haben noch keine bestätigte Frist. Datenschutzrechtliche Pflichten von frei gewählter Dokumentationsdauer trennen |

**WhatsApp/KI:** Betreiber plant Entfernung und hat diesen Datenfluss aus der
weiteren Bewertung ausgenommen. Er ist deshalb nicht zur künftigen Nutzung
freigegeben. In der untersuchten Produktionskonfiguration ist er noch vorhanden.
Vor Abschluss V13 als entfallen bestätigen und vorhandene Verknüpfungen,
Verläufe sowie externe Kopien behandeln; nicht vorzeitig aus der aktuellen
öffentlichen Erklärung entfernen.

Die Tabellenfristen sind Istbeobachtungen, keine rechtliche Rechtfertigung. Eine
Änderung des Hostings erfordert vor Umstellung Aktualisierung von V1–V4 und der
Anbieterakte. Allgemeiner Rahmen: [EDPB zur Dokumentation von
Verarbeitungen](https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en).

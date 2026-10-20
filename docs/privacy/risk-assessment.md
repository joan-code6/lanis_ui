# DSFA-Vorprüfung und technische Maßnahmen

Stand 20.10.2026. Betrachtet wird der unabhängige Kerndienst für Schüler ab sechs
Jahren sowie erwachsene SPH-Nutzer, **ohne** die künftig zu entfernende
WhatsApp-/KI-Funktion. Das ist eine ausgefüllte Vorprüfung und Risikoanalyse,
keine abgeschlossene DSFA mit akzeptiertem Restrisiko.

## Vorprüfung

| Kriterium | LANIS-Befund |
| --- | --- |
| Schutzbedürftige Betroffene | Ja: ausdrücklich Kinder ab sechs Jahren |
| Systematische Beobachtung | Kontobezogene Login-, Modul-, Sitzungs- und aktive-Zeit-Erfassung; Ausmaß und Erforderlichkeit problematisch, auch ohne Werbetracking |
| Vertrauliche/besonders sensible Inhalte | Schulnachrichten, Kontaktbeziehungen, Fehlzeiten, Abgaben und Freitext. Art.-9-Inhalte möglich, nicht für alle Schuldaten pauschal behauptet |
| Großer Umfang | Nicht festgestellt. Schulübergreifende Zielgruppe ist nicht identisch mit tatsächlicher Nutzerzahl; Kategorien, Datenmenge, Dauer und Verbreitung erheben |
| Datensatzverknüpfung | Profil und Aktivität werden kontobezogen verknüpft; keine beliebige Verknüpfung fremder Plattformprofile festgestellt |
| Ausschließlich automatisierte bedeutsame Entscheidung | Für den untersuchten Kerndienst nicht belegt; normale SPH-Aktionen und Anzeige sind nicht allein deshalb Art.-22-Entscheidungen |
| Biometrie, Genetik, öffentliche Videoüberwachung | Für diese Prüfung nicht belegt |

**Entscheidung:** Eine Freistellung von der DSFA ist derzeit nicht tragfähig
dokumentiert. Kinder, vertrauliche Inhalte und systematische Kontoaktivität
rechtfertigen eine vollständige DSFA als nächsten fachlichen Schritt; eine
definitive gesetzliche Pflicht wird ohne Umfang/Fallabgrenzung nicht allein aus
einer Kriterienzahl abgeleitet. Die veröffentlichte HBDI/DSK-Mussliste wurde
berücksichtigt; die dortige KI-Fallgruppe wird nicht als Grundlage für den künftig
KI-freien Kerndienst verwendet.

Quellen: [HBDI DSFA und Mussliste](https://datenschutz.hessen.de/datenschutz/it-und-datenschutz/datenschutz-folgenabschaetzung),
[DSK-Liste](https://datenschutz.hessen.de/sites/datenschutz.hessen.de/files/2022-11/dsfa_muss_liste_dsk_de.pdf).

## Eigene Risikoanalyse des festgestellten Designs

„Hoch/mittel“ ist eine qualitative Priorisierung von Eintrittsmöglichkeit und
Schadensschwere, keine gemessene Wahrscheinlichkeit und keine Freigabe.

| Risiko / Auswirkung für Menschen | Vorhandene Maßnahmen | Restrisiko / konkrete Ergänzung |
| --- | --- | --- |
| Fremdes Profil/Nachrichten nach Kontowechsel auf gemeinsamem Gerät; Bloßstellung, Offenlegung von Kontakten | Authentifizierte Routen, Tokenentfernung bei Logout | Hoch: ungebundene Browsercaches bleiben. Persönliche Daten bei Logout entfernen, Kontobindung und Schutz gegen späte Antworten/andere Tabs umsetzen |
| Serverzugriff erschließt entschlüsselbare SPH-Zugangsdaten und Nachrichten | AES-GCM für Credentials, getrennt konfigurierter Schlüssel, data 700/DBs 600 | Hoch bei Serverkompromittierung; Administratoren, physischer Zugang, Updates, Schlüsselzugriff und Datenträger/Backupverschlüsselung nachweisen; Wiederanmeldebedarf minimieren |
| Externe Identifikatoren/Text bei Discord verbleiben nach Kontolöschung | Offenlegung in Erklärung teilweise vorhanden; Adminportal verfügbar | Mittel bis hoch bei sensiblen Feedbacktexten: Inhalte/Kennungen nicht extern senden, vorhandene Kopien und Kanalzugriffe behandeln |
| Dauerhafte Aktivitätsprofile von Kindern | Privates Adminportal und Allowlist | Mittel bis hoch: kurze Rohdatenfrist/Aggregation, begründete Feldauswahl, Zugriffskontrolle und Widerspruchsprozess |
| Veröffentlichung vertraulicher Angaben in Logs, Screenshots oder CI | Flüchtiges Journal; diese Prüfung verwendet nur synthetische Daten | Mittel: Query-/Identitätslogging minimieren, nachvollziehbare Maximalfrist, sichere Fehlermeldungen und Redaktionsregeln für Support |
| Löschanfrage wird als vollständig beantwortet, obwohl Historie/externe Kopien verbleiben | Self-Service-Export/Löschung, temporärer Wiederanlageschutz; 81 Tests bestanden | Mittel: manueller Auskunftsweg für WhatsApp-Altverlauf/Anbieter/Logs, keine Restlosigkeitszusage; Löschung nach Restore erneut anwenden |
| Verlust/Defekt des Raspberry Pi; persönliche Einstellungen/Supportdaten gehen verloren | SPH-Original bleibt außerhalb LANIS; flüchtiger Betriebspuffer | Umfang echter Backups unbekannt. Wiederherstellungsbedarf, verschlüsselte Sicherung, Frist und Restoretest festlegen; dabei keine unbegrenzten alten Kontokopien schaffen |
| Unzulässige Verarbeitung von Gesundheits-/Religionsangaben oder unwirksame Kindereinwilligung | Noch kein abschließend nachgewiesenes Konzept | Hoch rechtlich/sozial: Inhaltsgrenzen und zusätzliche Rechtsvoraussetzungen klären; kindgerechte Information, optionale Funktionen gesondert |

## Abschluss einer vollständigen DSFA

Die Systembeschreibung und Zweck-/Notwendigkeitsprüfung stehen bereits in den
anderen Dokumenten. Ergänzen: tatsächliche Reichweite/Altersgruppen, betroffene
Inhaltsarten, Anbieternachweise, getestete Maßnahmen, Datum/Entscheider und
Restrisiko je Zeile. Soweit angemessen Perspektive der Betroffenen einbeziehen,
ohne dafür reale Schulnachrichten zu sammeln. Bei weiterhin hohem Restrisiko
ist die gesetzliche Frage einer vorherigen Konsultation zu klären; dieses Paket
kontaktiert niemanden. [EDPB zum
DSFA-Ablauf](https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en)

## Datenschutzbeauftragter

„Einzelperson, daher nie DSB“ wäre zu pauschal. Neben Art. 37 DSGVO ist § 38 BDSG
zu prüfen, insbesondere dessen unabhängige Anknüpfung an DSFA-pflichtige
Verarbeitungen. Nutzerzahl ist nicht Beschäftigtenzahl. Bestellungspflicht noch
nicht entschieden; bei positiver DSFA-Pflicht die Folgefrage ausdrücklich
abschließen. [§ 38 BDSG](https://www.gesetze-im-internet.de/bdsg_2018/__38.html)

Keine der vorgeschlagenen Änderungen wurde auf Produktion angewendet. Ein
Datenschutztext ersetzt die Behebung bestätigter technischer Schutzlücken nicht.

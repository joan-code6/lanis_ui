# LANIS Datenschutzprüfung – 20. Oktober 2026

Verantwortlich laut veröffentlichter Erklärung: Bennet Joan Wegener,
`lanis-impressum@joancode.dev`. Dieses Paket betrifft das Standardangebot aus
Lanis UI, lanis_api und privatem Adminportal. Fremde Backends sind getrennt zu
bewerten. Keine Zugangsdaten oder personenbezogenen Nutzerbeispiele ablegen.

## Ergebnis und Verwendung

Die technische Bestandsaufnahme und die unten verlinkten Arbeitsunterlagen sind
erstellt. Eine pauschale Konformitätsfreigabe ergibt sich daraus nicht. Insbesondere
Verträge, Einwilligungsfähigkeit und die Rechtsgrundlage für Informationen über
Nichtnutzer lassen sich nicht allein aus Quellcode feststellen. „Offen“ bedeutet
fehlender Nachweis in dieser Prüfung, nicht automatisch einen Rechtsverstoß.

- [Technische Nachweise und Abweichungen](verification.md)
- [Verzeichnis der Verarbeitungstätigkeiten](processing-register.md)
- [Rechtsgrundlagen, Interessenabwägungen und Art. 14](legal-assessment.md)
- [Dienstleister und Drittlandübermittlungen](providers.md)
- [DSFA-Vorprüfung und Maßnahmen](risk-assessment.md)
- [Betroffenenrechte und Vorfälle](operations.md)
- [Bisheriger Nachweis zur Protokollierung](../legal-log-retention.md)

Die Unterlagen unterscheiden **belegt**, **Entwurf/Empfehlung** und **offen**.
Empfohlene Fristen und Schutzmaßnahmen sind keine bereits umgesetzten Zusagen.
Die öffentliche Datenschutzerklärung beschreibt den tatsächlichen Istzustand;
interne Freigabeentscheidungen werden hier dokumentiert.

## Konkrete nächste Entscheidungen

Bestätigt am 20.10.2026: unabhängiger Betrieb ohne Schulauftrag, Zielgruppe ab
etwa sechs Jahren, Backend auf eigenem Raspberry Pi, UI bei Cloudflare.
WhatsApp/KI soll entfernt werden und wird nicht für weitere Nutzung bewertet.

| ID | Noch erforderlich | Wer / Abschlussnachweis |
| --- | --- | --- |
| O1 | Tatsächlich berechtigte Administratoren und physische/Backup-Zugriffe dokumentieren | Betreiber; keine Nutzerliste ins Repository |
| O2 | Vertragspartner und AVV/DPA für weitergenutzte Hosting-/Proxydienste zuordnen, Transfers und externe Löschung klären | Betreiber mit Anbieterunterlagen; Details in providers.md |
| O3 | Rechtsgrundlage und Art.-14-Informationsweg für Angaben über Lehrkräfte/Mitschüler festlegen; mögliche Gesundheits-/Religionsdaten gesondert prüfen | Datenschutzrechtliche Prüfung anhand legal-assessment.md |
| O4 | Browsercache-Isolation bei Logout/Kontowechsel beheben und mit verzögerten Antworten/mehreren Tabs testen | UI-Änderung plus Regressionstest; diese Dokumentationsänderung behebt den Fehler nicht |
| O5 | Identifizierende Discord-Meldungen und unbegrenzte Aktivitätshistorie auf Erforderlichkeit prüfen; bevorzugt minimieren | Betreiberentscheidung plus Umsetzung; keine erfundene Löschfrist veröffentlichen |
| O6 | DSFA-Screening mit Nutzerzahl, Altersgruppen, Inhaltsarten und KI-Anbieterbedingungen abschließen; daraus DSB-Pflicht prüfen | Verantwortlicher, ggf. unabhängige fachkundige Unterstützung |
| O7 | Vollständige zustellfähige Anbieteranschrift und Anwendbarkeit der Impressumspflichten prüfen | Betreiber; Anschrift nicht in Chat, Testausgaben oder interne Prüfbeispiele kopieren |

Die rechtliche Prüfung kann diese ausgefüllten Unterlagen verwenden. Es braucht
keine pauschale Zustimmung jedes Lehrers als automatisch vorausgesetzte Lösung.
Zunächst sind Zweck, Datenumfang, Rolle und passende Rechtsgrundlage festzulegen.
Verträge werden durch diese Unterlagen weder abgeschlossen noch fingiert.

## Pflege

Bei neuen Datenflüssen, Anbietern, Altersgruppen oder Speicherfristen alle
betroffenen Einträge und die öffentliche Erklärung zusammen aktualisieren.
Erneute technische Prüfung nach Behebung von O4; monatlich offene Punkte und
Anbieteränderungen durchsehen (empfohlener Ablauf, noch kein bestehender Prozess).
Entscheidungen mit Datum, Verantwortlichem und Nachweis dokumentieren. Ein echtes
Ereignisprotokoll mit Nutzerdaten gehört in geschützten Betriebsspeicher, nicht Git.

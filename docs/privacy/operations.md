# Betriebsverfahren für Datenschutzanfragen und Vorfälle

Stand 20.10.2026. **Vorbereiteter Ablauf zur Übernahme durch den Betreiber**;
keine Behauptung, er sei bislang praktiziert worden. Zuständig: Betreiber über
`lanis-impressum@joancode.dev`; Stellvertretung/Zugriff bei Ausfall noch festzulegen.
Reale Anfragen und Vorfälle in geschützter Ablage führen, niemals im öffentlichen
Repository. Keine Passwörter, Tokens oder vollständigen Ausweiskopien anfordern.

## Betroffenenanfrage

1. Eingang, Frist, begehrtes Recht, Datenfluss und zuständige Person vermerken.
   Zeitnah bestätigen. Regulär innerhalb eines Monats antworten; bei begründeter
   Verlängerung um bis zu zwei weitere Monate bereits innerhalb des ersten Monats
   informieren. Nicht auf einen Self-Service-Link beschränken.
2. Identität verhältnismäßig prüfen: vorhandene authentifizierte Zuordnung nutzen;
   zusätzliche Informationen nur bei begründeten Zweifeln. Auch Nichtnutzer
   können Rechte an ihren Angaben haben; kein zwingendes LANIS-Konto verlangen.
   Vertretung von Kindern anhand der konkreten Anfrage angemessen behandeln.
3. Bestände anhand des Verarbeitungsregisters ermitteln: Auth/Profile/Aktivität,
   Einstellungen, Inbox/Push, Dateien, Feedback, zulässige Logs, Anbieter und
   Altbestände. Nur befugte Administratoren beauftragen.
4. Bei Auskunft Self-Service-JSON als Start verwenden. Nicht enthaltenen
   personenbezogenen Inhalt ergänzen, insbesondere gespeicherten Chatverlauf,
   soweit noch vorhanden; Schutz fremder Personen berücksichtigen. Passwörter
   und Sicherheitsschlüssel nicht als Auskunftsinhalt verteilen.
5. Berichtigung, Löschung, Einschränkung oder Widerspruch anhand der jeweiligen
   Voraussetzungen bearbeiten; Nutzerwunsch und Originaldaten im SPH auseinanderhalten.
   Nicht jede Anfrage nach einem fremden Datum erfordert Löschen aller Kopien,
   über die andere Personen berechtigt verfügen. Ablehnung begründen.
6. Bei betroffenen Empfängern notwendige Mitteilungen/Weiterbearbeitung veranlassen.
   Externe Discord-Kopie und LANIS-Zeile separat behandeln. Nach Restore dürfen
   erledigte Löschungen nicht unbemerkt rückgängig werden.
7. Sichere Antwort, Umfang, noch verbleibende Daten/Gründe und Abschlussdatum
   dokumentieren. Beschwerde-/Rechtsbehelfsinformationen bei Ablehnung nennen.

Rechtlicher Rahmen: [EDPB Betroffenenrechte](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en).

### Antwortvorlage – Eingang

> Wir haben deine Datenschutzanfrage am [Datum] erhalten. Sie betrifft [Umfang].
> Wir prüfen die Daten bei LANIS und antworten grundsätzlich bis [Monatsfrist].
> Falls wir zur sicheren Zuordnung noch Angaben brauchen, melden wir uns gezielt.
> Bitte sende uns keine Passwörter oder Zugangstokens.

### Antwortvorlage – Löschung

> Wir haben am [Datum] die folgenden LANIS-Daten entfernt: [tatsächlich geprüfter
> Umfang]. Verbleibende Daten: [Kategorie, Grund und Frist oder keine nach Prüfung].
> [Empfängermaßnahmen und deren Status]. Originaldaten im Schulportal Hessen
> wurden dadurch nicht gelöscht. Für weitere Fragen erreichst du uns unter
> [Kontakt].

Klammern vor Verwendung ausfüllen; keine ungeprüfte vollständige Löschung zusagen.
Frist für die minimale Verfahrensdokumentation ist noch festzulegen; Rohdaten
nicht allein zur Beweisvorsorge unbegrenzt aufbewahren.

## Sicherheitsvorfall / mögliche Datenschutzverletzung

1. Zeitpunkt der Entdeckung und den Zeitpunkt hinreichender Gewissheit eines
   tatsächlichen Datenvorfalls festhalten. Ein Quellcodefehler allein belegt
   noch keine historische Offenlegung. Beweise sichern, ohne neue unnötige Kopien
   von Schulnachrichten anzulegen.
2. Betroffene Funktionen/Sitzungen gezielt sichern, Risiko eingrenzen und Ursache
   beheben. Produktionsänderungen nur durch befugte Betreiber; diese Dokumentation
   führt keine automatischen Abschaltungen aus.
3. Betroffene Kategorien/Zahlen, Alter, Inhalt, Dauer, Empfänger, mögliche Folgen
   und vorhandene Schutzmaßnahmen bestimmen. Beim Logoutcache insbesondere
   gemeinsame Geräte, Kontowechsel, fremde Anzeige und gemeldete Fälle prüfen.
4. Betreiber bewertet Meldepflicht: grundsätzlich Aufsicht binnen 72 Stunden nach
   Bekanntwerden, außer wenn Risiko für Menschen unwahrscheinlich ist. Fehlende
   Details können nachgereicht werden; Verzögerungen begründen. Bei voraussichtlich
   hohem Risiko Betroffene ohne unangemessene Verzögerung informieren, soweit
   keine gesetzliche Ausnahme greift.
5. Entscheidung und Gründe auch bei Nichtmeldung dokumentieren; Ursache,
   Maßnahmen und Wirksamkeitsprüfung ergänzen. Keine automatische Meldung nur
   deshalb, weil ein Test eine Schwachstelle zeigt.

Quelle: [EDPB Datenschutzverletzungen](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en).
Für den in Hessen ansässigen unabhängigen Betreiber ist der HBDI der örtliche
Ausgangspunkt; Zuständigkeit für den konkreten Fall prüfen:
[HBDI Service/Meldewege](https://datenschutz.hessen.de/service).
Keine Meldung oder externe Nachricht wurde im Rahmen dieser Arbeit versendet.

### Interne Fallakte

Geschützt erfassen: interne ID, Entdeckung/Bekanntwerden, Fakten/Unsicherheiten,
betroffene Daten/Menschen, Risikoentscheidung, Meldefrist, Entscheidungsträger,
Meldung/Information (falls erfolgt), technische Maßnahmen und Nachprüfung.
Nur erforderliche Identifikatoren speichern; Zugriff auf zuständige Personen.

## Wiederkehrende Betreiberaufgaben – vorgeschlagen

Monatlich offene Maßnahmen, Adminberechtigungen und fehlgeschlagene Löschjobs
prüfen. Bei Anbieter-/Hostingwechsel Verträge, Länder, Datenfluss und Erklärung
vor Umstellung aktualisieren. Wiederherstellung mit synthetischen Daten testen;
Lösch-/Sperrentscheidungen beim Restore berücksichtigen. Fristen für Datenbanken,
Providerlogs, eigene Backups und abgeschlossene Supportfälle getrennt festlegen.

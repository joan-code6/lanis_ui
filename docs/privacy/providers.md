# Anbieter- und Transferakte

Stand 20.10.2026. Keine Verträge in fremdem Namen abgeschlossen, keine Anbieter
kontaktiert. Vertragskopien, Rechnungen und personenbezogene Ansprechpartner
gehören in privaten Betriebsspeicher. In Git genügt ein nicht geheimer
Nachweisverweis mit Version/Datum. Eine öffentliche Datenschutzerklärung eines
Anbieters ist nicht automatisch ein AVV für LANIS-Inhalte.

## Bestand ohne den zur Entfernung vorgesehenen WhatsApp-/KI-Dienst

| Dienst | Belegter Einsatz / Daten | Vertrags- und Transferbewertung / noch fehlender Nachweis |
| --- | --- | --- |
| Eigener Raspberry Pi | Betreiber bestätigt Eigenhosting des Standard-Backends; Dienst-/Dateirechte read-only geprüft | Kein AVV mit sich selbst nötig. Physischer Standort, weitere Serveradministratoren, Datenträgerverschlüsselung und Backups noch nicht belegt. Router/ISP nicht pauschal als Inhalts-Auftragsverarbeiter einstufen |
| Cloudflare UI-Hosting | Betreiberbestätigung, Workers-Konfiguration und Live-Website; Besucher-IP und technische Anfragen, ausgelieferte UI-Dateien | Cloudflare veröffentlicht DPA, SCC und Unteranbieter. Konkretes Vertragskonto, anwendbare Fassung und einbezogene Produkte dokumentieren. Nicht behaupten, wegen „Free Plan“ müsse zwingend ein individueller Papiervertrag unterzeichnet werden |
| Cloudflare als möglicher Backendproxy/Tunnel | Vom UI-Hosting zu unterscheiden | Tatsächlichen Netzpfad/TLS-Endpunkt separat belegen. Wenn Proxy das Backend terminiert, können auch Anfragen mit Schulzugangsdaten/Inhalten betroffen sein; Eigenhosting allein schließt das nicht aus. Keine Schlussfolgerung nur aus DNS/Serverheadern |
| cdnjs / Cloudflare | Live automatisch geladene Icon-Stylesheets; Besucher-IP/Anfragedaten | Produktrolle und Bedingungen nicht automatisch vom eigenen Workers-Vertrag ableiten. Empfehlung: Icons lokal bereitstellen und diese zusätzliche Verbindung entfernen |
| Discord | Neukonto-Benachrichtigungen: Login/Schule; Feedback: Text/Kontokennung; Produktions-Webhookkonfiguration vorhanden | Vertragsrolle, Empfängerkreis des Kanals, internationale Verarbeitung und Löschweg nicht belegt. Nicht ungeprüft als Auftragsverarbeiter behandeln. Empfehlung: identifizierende Meldungen vermeiden; Nutzungsbedingungen/Privacy Policy ersetzen keine passende Rechtsgrundlage |
| OpenStreetMap Foundation | Kartenkacheln nach Nutzerklick; Verbindungsdaten/Kachelausschnitt | Öffentliche Kartenbereitstellung gesondert bewerten, kein pauschales LANIS-AVV behaupten. Anbieterinformation, Rechtsgrundlage und mögliche Nicht-EWR-Verarbeitung klären |
| Browser-/OS-Pushdienste | Vom jeweiligen Gerät abhängiger Dienst; Endpoint und verschlüsselte Zustellung | Anbieter/Produkt kann je Browser variieren. Angaben und Rolle für tatsächlich unterstützte Browser festhalten. Ende-zu-Ende-Inhaltsverschlüsselung ersetzt keine Prüfung der Metadatenverarbeitung |
| Schulportal Hessen / zuständige schulische Stelle | Quelle und Ziel nutzerinitiierter Schulhandlungen | Kein Hosting-Auftragsverarbeiter des unabhängigen LANIS-Betreibers. Keine Schulbeauftragung oder Genehmigung behauptet. SPH-Zugriffsbedingungen und eigene Rechtsgrundlage getrennt prüfen |
| Kontakt-E-Mail/Supportanbieter | Öffentliche Kontaktadresse vorhanden; tatsächlicher Mailprovider nicht ermittelt | Wenn Datenschutzanfragen über diesen Provider laufen, Zugriff, AVV soweit erforderlich und Aufbewahrung in die Akte aufnehmen |
| GitHub/CI | UI-Quellcode, Artefakte und öffentliche PR-Previews; keine produktiven Nutzerinhalte für diese Prüfung verwendet | Keine echten Schulnachrichten, Exporte, Tokens oder unverpixelte Screenshots in PRs/CI. Previews nutzen laut Deploymentdoku die echte API; deshalb ausschließlich synthetisch oder ausdrücklich mit Testkonto prüfen |

## Cloudflare: vorhandene rechtliche Unterlagen

Geprüfte öffentliche Primärquellen:

- [Self-Serve Agreement](https://www.cloudflare.com/terms/)
- [Customer DPA, veröffentlichte Version 6.4 vom 03.04.2026](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [SCC](https://www.cloudflare.com/cloudflare-customer-scc/)

Das DPA beschreibt Cloudflare als Auftrags-/Unterauftragsverarbeiter im jeweiligen
Leistungsumfang und enthält Transferregelungen. Ziffer 6.1 des Self-Serve
Agreements bezieht das DPA für einschlägige personenbezogene Customer-Content-Daten
ausdrücklich ein. Der allgemeine Einbeziehungsmechanismus ist damit belegt.
Verbleibend sind die Zuordnung des konkreten Kontos und der Produkte sowie deren
Verarbeitungsumfang; nicht automatisch ein neuer individueller Vertrag.

Für die internationale Verarbeitung Empfänger und Länder zuerst ermitteln;
dann passenden Mechanismus dokumentieren, z. B. einschlägigen Angemessenheitsbeschluss
oder SCC mit erforderlicher Bewertung/Zusatzmaßnahmen. Bei DPF nicht pauschal
„USA erlaubt“ annehmen, sondern Empfänger und Zertifizierungsumfang prüfen.
Art. 6-Rechtsgrundlage und Transfermechanismus beantworten unterschiedliche
Fragen. [EDPB internationale
Übermittlungen](https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en)

## Auszufüllender Nachweis je weitergenutztem Anbieter

1. Vertragspartner/Produkt, Datenfluss-ID aus processing-register.md.
2. Rolle für genau diese Daten, ggf. AVV-Version und Datum der Einbeziehung.
3. Zugriffsorte/Länder, Unteranbieter, tatsächliche Einstellungen und Transfergrundlage.
4. Inhalt/Metadaten, Zweck, eigene und fremde Fristen, Auskunft-/Löschkontakt.
5. Zugriffsberechtigte beim Betreiber und dokumentierte Nachprüfung bei Änderungen.

Entfernte Anbieter zusätzlich mit Abschaltdatum und Behandlung vorhandener Kopien
abschließen. Der geplante Wegfall von WhatsApp/KI ist noch kein Abschaltnachweis;
der Datenfluss bleibt bis dahin in der aktuellen öffentlichen Erklärung genannt.

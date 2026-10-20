# Technische Verifikation

Stand: 20.10.2026. Keine Produktionsänderungen, Neustarts oder Löschungen. Keine
Produktionskonten exportiert, keine Nachrichten/DB-Inhalte ausgelesen, keine
Webhook-Nachrichten versendet. Automatisierte Funktionstests verwenden synthetische
Daten und temporäre Datenbanken.

## Prüfbasis

- UI: `b78dfd8ebe9fbf13ebd4d109da1525864f6ba817` (`origin/main` nach Fetch).
- lanis_api: `3a9932a877566759eea8845f13ae2e1cc5ddbefe` (`origin/main`).
- Produktionscheckout des Backends: identischer Commit; keine Änderungen an
  versionierten Dateien festgestellt. Das beweist nicht, dass der laufende
  Prozess seit dem letzten Start sämtliche Dateien neu geladen hat.
- Öffentliche UI: `https://lanis.arg-server.de/privacy-policy`, im Browser geprüft.
  Die ausgelieferte UI-Version wurde nicht auf einen Git-Commit zurückgeführt.
- Der Hauptcheckout ist älter und enthält lokale Änderungen. Er ist nicht die
  Grundlage dieser Bewertung. Das erklärt die vorherige falsche Font-Aussage.
- Betreiber bestätigt am 20.10.2026: unabhängig, kein Schulauftrag, Zielgruppe
  ab sechs Jahren, eigener Raspberry Pi und UI bei Cloudflare. WhatsApp/KI soll
  entfernt werden; weitere Anbieter-/Rechtsprüfung dafür auf Wunsch ausgenommen.

## Nachweise

| Gegenstand | Ergebnis / Grenze | Nachweis |
| --- | --- | --- |
| Schriftarten | Belegt: Live-Seite lädt `/fonts/fonts.css` und lokale Outfit-WOFF2; keine Google-Fonts-Requests in dieser Sitzung | Browser Resource Timing und Stylesheet-Links; UI `index.html`, `public/fonts/` |
| Externe Icons | Belegt: zwei Font-Awesome-Stylesheets von `cdnjs.cloudflare.com` | Live-Browser und `index.html`; aktuelle Erklärung nennt sie bereits |
| Öffentliche Erklärung | Belegt: nennt entschlüsselbar gespeicherte Passwörter, Aktivitätsdaten, Discord-Neukontomeldungen, Logout-Caches und tatsächliche Journalbedingungen | Live-Seite; `src/components/legal/PrivacyPolicy.tsx` |
| Backenddienst | Aktiv als **Benutzerdienst**, WorkingDirectory `~/production/lanis`, Ausgabe ins Journal | `systemctl --user show lanis-api.service` mit ausschließlich ausgewählten nicht geheimen Eigenschaften |
| DB-Zugriff lokal | Verzeichnis `data` Modus 700; `auth.db` und `user_metrics.db` Modus 600 | `stat`; kein Beweis für Verschlüsselung aller Datenträger/Backups oder Schutz vor Serveradministratoren |
| Protokolle | `Storage=volatile`, keine explizite Tagesfrist; `ForwardToSyslog=yes`, rsyslog inaktiv | `systemd-analyze cat-config systemd/journald.conf`, `systemctl is-active rsyslog`; ergänzend ../legal-log-retention.md |
| Zugangsdaten | AES-GCM im Anwendungscode; getrennte Credential- und JWT-Schlüssel in Produktions-`.env` konfiguriert | lanis_api `api/auth_db.py`; nur Vorhandensein geprüft, keine Schlüssel ausgegeben |
| Anbieter-Konfiguration | `.env` nennt `ai.hackclub.com`, Modell `openai/gpt-5.6-luna`; WhatsApp-, Neukonto-, Feedback- und Uptime-Webhooks konfiguriert | Ausschließlich Host/Modell und boolesche Präsenz ausgegeben; Prozess-Overrides und tatsächliche Auslieferung nicht nachgewiesen |
| Export/Löschung | 81 fokussierte Backendtests bestanden; darunter Geheimnisausschluss, Datenlöschung, Dateireferenzen, Recovery und Session-Widerruf | untenstehender Befehl; kein destruktiver Live-Test |
| WhatsApp | Explizites `consent: true` bei Pairing erforderlich; Vorschauen separat; Verlauf verschlüsselt und begrenzt; STOP/Trennen implementiert | `api/api.py`, `api/auth_db.py`, `tests/test_whatsapp.py`; keine Aussage über Speicherdauer bei Meta/KI-Anbietern |
| KI-Routing | Anfrage setzt `data_collection: deny` und `zdr: true` | `api/ai_agent.py`; diese Parameter beweisen nicht, dass Proxy/Unteranbieter sie durchsetzen oder nicht selbst protokollieren |
| Adminzugriff | Allowlist-basierte Authentifizierung, eigene Admin-Sitzungen und Auditdaten im Code | `api/admin.py`; tatsächliche berechtigte Personen, MFA und regelmäßige Zugriffsprüfung nicht verifiziert |

## Festgestellte Abweichungen

1. **Clientcache nach Logout:** `AuthContext.logout` entfernt nur Auth-Einträge.
   Profil-, Nachrichten- und Kurscache werden ohne Kontobindung gelesen. Auch der
   Login löscht diese Einträge nicht. Das betrifft Offenlegung im selben Browser,
   keine kontoübergreifende Backendberechtigung. Ein reproduzierbarer, isolierter
   Nachweis liegt in `scripts/check-logout-cache.cjs`. Kein Live-Nutzer betroffen
   gemacht. Historische tatsächliche Offenlegung ist damit nicht nachgewiesen.
2. **Feedback:** `api/feedback_db.py` speichert Kategorie, Titel, Text, Seite,
   Kontokennung, Status und Bearbeitungsdaten. `api/discord.py` kann Text und
   Kontokennung an Discord senden. Diese Verarbeitung fehlt in der bisherigen
   Erklärung; die begleitende Textänderung ergänzt sie. Lokale Löschung ist
   implementiert, externe Discord-Kopien werden dadurch nicht gelöscht.
3. **Export ist kein vollständiger Art.-15-Prozess:** Der Self-Service lässt
   WhatsApp-Verlauf ausdrücklich aus; Chatinhalt ist nicht schon deshalb ein
   Geheimnis, weil er verschlüsselt gespeichert wird. Ein manueller Auskunftsweg
   muss ihn und weitere nicht enthaltene personenbezogene Daten abdecken.
4. **Aufbewahrung:** Profile/Aktivität/Feedback bleiben grundsätzlich bis zur
   Kontolöschung. Eine separate automatische Frist für ruhende Konten oder
   identifizierende Aktivitätsereignisse wurde nicht gefunden. Das wird als
   Istzustand erfasst, nicht als rechtlich gerechtfertigt freigegeben.
5. **Dateien:** Neuere Backendreferenzen erlauben Entfernung nach letzter
   Kontoreferenz; die bisherige pauschale Aussage, Dateien würden keinem Konto
   zugeordnet, ist überholt. Gemeinsame Dateien anderer berechtigter Konten bleiben.
6. **Löschmarker:** Bis zu eine Stunde gültige kontobezogene Sperrmarker verhindern
   Wiederanlage durch laufende Aufgaben. „Alles sofort restlos gelöscht“ wäre
   deshalb unzutreffend. Datenbankzeilenlöschung belegt keine forensische Löschung
   freier SQLite-Seiten, Snapshots oder Anbieterbackups.

## Reproduzieren

Aus einem isolierten lanis_api-Checkout, mit installierten Testabhängigkeiten:

```sh
python -m pytest -q tests/test_account_data.py tests/test_account_deletion_routes.py tests/test_account_session_revocation.py tests/test_outage_cache.py tests/test_ai_agent.py tests/test_whatsapp.py
```

Ergebnis dieser Prüfung: **81 passed**, 434 Deprecation-Warnungen, 2,25 Sekunden.
Das ist eine fokussierte Funktionsprüfung, kein vollständiger Sicherheits- oder
Penetrationstest. Keine Produktionseinstellungen für Testzwecke verwenden.

Im UI-Checkout mit installierten Node-Abhängigkeiten:

```sh
node scripts/check-logout-cache.cjs
node scripts/test-account-data.cjs
```

Der erste Befehl dokumentiert absichtlich das fehlerhafte Istverhalten. Nach einer
Behebung muss er durch einen Regressionstest für Nichtoffenlegung ersetzt werden.
Ausgeführt: Baseline reproduziert, bestehende Account-Lifecycle-Tests bestanden,
TypeScript-Prüfung `tsc --noEmit` bestanden. Kein Build ausgeführt (lokale
Repositoryanweisung). Diese Checks belegen keine Produktionsbehebung.

Die geänderte Datenschutzerklärung wurde im lokalen Vite-Server im Browser
gerendert: neue Kurzfassung, Feedbackhinweis, Dateireferenzen, Löschmarker und
HBDI-Link vorhanden; kein horizontaler Überlauf bei 1280 Pixeln. Ein erster
Ladevorgang meldete `net::ERR_NETWORK_CHANGED`; erneute Navigation funktionierte.
Der neue Feedbackhinweis wurde typgeprüft, aber nicht durch echtes Absenden von
Feedback geprüft, um keine externe Discord-Nachricht auszulösen.

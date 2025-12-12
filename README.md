# Schulportal Hessen - Unofficial Modern UI

Eine moderne, benutzerfreundliche Oberfläche für das Schulportal Hessen, gebaut mit React und TypeScript.

## ✨ Features

- **Moderne Benutzeroberfläche**: Schlankes, responsives Design mit Tailwind CSS
- **Dashboard**: Übersichtliche Darstellung aller Apps und Module
- **Nachrichten**: Vollständiges Nachrichtensystem mit Suche und Komposition
- **Mein Unterricht**: Kursverwaltung, Wochenansicht und Abgaben
- **Benutzerprofil**: Anzeige der Benutzerinformationen und Sicherheitsstatus
- **Session Management**: Sichere Authentifizierung mit automatischer Token-Verwaltung
- **Responsive Design**: Funktioniert perfekt auf Desktop und Mobile

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18+ und npm/yarn
- Eine laufende Instanz der Schulportal Hessen API

### Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd lanis_ui
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Umgebungsvariablen konfigurieren:
```bash
cp .env.example .env
```

Bearbeiten Sie die `.env` Datei und setzen Sie die API-URL:
```
REACT_APP_API_URL=http://localhost:8000
```

4. Entwicklungsserver starten:
```bash
npm run dev
```

Die Anwendung ist dann unter `http://localhost:3000` verfügbar.

## 🏗️ Projektstruktur

```
src/
├── components/           # React-Komponenten
│   ├── auth/            # Authentifizierungs-Komponenten
│   ├── dashboard/       # Dashboard-Komponenten
│   ├── messages/        # Nachrichten-Komponenten
│   ├── courses/         # Kurs-Komponenten
│   ├── profile/         # Profil-Komponenten
│   └── layout/          # Layout-Komponenten
├── contexts/            # React Contexts (Auth, etc.)
├── services/            # API Services
├── types/              # TypeScript Type-Definitionen
├── pages/              # Page-Komponenten (falls erweitert)
└── styles/             # Globale Styles
```

## 📱 Komponenten-Übersicht

### Dashboard
- **AppGrid**: Anzeige aller verfügbaren Apps und Module
- **Search & Filter**: Suche und Filterung nach Ordnern
- **View Modes**: Grid- und Listen-Ansicht

### Nachrichten
- **MessageList**: Liste aller Nachrichten mit Filter (Alle/Ungelesen/Gesendet)
- **ConversationView**: Anzeige einzelner Unterhaltungen
- **ComposeMessage**: Neue Nachrichten verfassen mit Empfänger-Suche

### Mein Unterricht
- **CourseOverview**: Übersicht aller Kurse
- **CourseDetails**: Detailansicht mit allen Einträgen
- **WeeklyView**: Wochenansicht der Unterrichtseinträge
- **Submissions**: Übersicht aller Abgaben und deren Status

### Profil
- **UserInfo**: Anzeige aller Benutzerinformationen
- **SecurityStatus**: Sicherheitsstatus und Session-Informationen
- **APIStatus**: Status der API-Verbindung

## 🛠️ Verfügbare Scripts

- `npm run dev` - Startet den Entwicklungsserver
- `npm run build` - Erstellt die Produktions-Version
- `npm run preview` - Vorschau der Produktions-Version
- `npm run lint` - Führt ESLint aus

## 🎨 Styling

Das Projekt verwendet Tailwind CSS für das Styling mit einem benutzerdefinierten Design-System:

### Farbschema
- **Primary**: Blau-Töne für Hauptelemente
- **Secondary**: Graue Töne für sekundäre Elemente
- **Success**: Grün für positive Aktionen
- **Warning**: Gelb für Warnungen
- **Error**: Rot für Fehler

### Komponenten
Das Projekt enthält vorgefertigte CSS-Klassen für häufig verwendete Komponenten:
- `.btn`, `.btn-primary`, `.btn-secondary`
- `.input`, `.card`, `.card-hover`

## 🔧 Konfiguration

### API-Konfiguration
Die API-URL kann über Umgebungsvariablen konfiguriert werden:

```env
REACT_APP_API_URL=https://ihre-api-domain.com
```

### Entwicklungseinstellungen
Das Vite-Konfiguration ermöglicht:
- Hot Module Replacement
- TypeScript-Support
- Automatische Browser-Aktualisierung

## 📡 API-Integration

Die Anwendung integriert vollständig mit der Schulportal Hessen API:

- **Authentifizierung**: Login/Logout mit Session-Token
- **Apps & Module**: Laden aller verfügbaren Anwendungen
- **Nachrichten**: Vollständige Nachrichtenverwaltung
- **Kurse**: Zugriff auf alle Unterrichtsdaten
- **Benutzer**: Profilinformationen und Einstellungen

### Session-Management
- Automatische Token-Speicherung im LocalStorage
- Automatische Weiterleitung bei abgelaufenen Sessions
- Sichere Logout-Funktionalität

## 🔒 Sicherheit

- **Token-basierte Authentifizierung**: Sichere Session-Verwaltung
- **Automatische Session-Bereinigung**: Abgelaufene Tokens werden automatisch entfernt
- **HTTPS-Unterstützung**: Sichere Datenübertragung
- **Input-Validierung**: Schutz vor XSS und anderen Angriffen

## 📱 Responsive Design

Die Anwendung ist vollständig responsive und funktioniert auf:
- **Desktop** (1024px+)
- **Tablet** (768px - 1023px)
- **Mobile** (320px - 767px)

### Mobile Features
- Collapsible Sidebar
- Touch-optimierte Navigation
- Optimierte Formulare für mobile Eingabe

## 🚀 Deployment

### Produktions-Build erstellen
```bash
npm run build
```

### Deployment-Optionen
- **Vercel**: Einfaches Deployment mit Git-Integration
- **Netlify**: Automatische Builds und CDN
- **Docker**: Containerisierte Deployment
- **Statische Hosting**: Jeder HTTP-Server kann die Build-Dateien hosten

### Beispiel Dockerfile
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🤝 Entwicklung

### Mitwirkung
1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/neue-funktion`)
3. Committe deine Änderungen (`git commit -m 'Neue Funktion hinzufügen'`)
4. Push auf den Branch (`git push origin feature/neue-funktion`)
5. Erstelle einen Pull Request

### Code-Standards
- TypeScript für Type-Safety
- ESLint für Code-Qualität
- Prettier für Code-Formatierung
- Funktionale Komponenten mit Hooks

## ⚠️ Hinweise

**Wichtig**: Dies ist eine **inoffizielle** Benutzeroberfläche für das Schulportal Hessen. 

- Alle Daten werden sicher über die offiziellen APIs abgerufen
- Die Anwendung speichert keine Passwörter oder sensiblen Daten
- Session-Tokens werden lokal gespeichert und automatisch verwaltet
- Die Anwendung ist nicht mit der offiziellen Schulportal-Seite verbunden

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.

## 🐛 Probleme melden

Wenn Sie Probleme finden oder Features vorschlagen möchten:
1. Überprüfen Sie die [Issues](../../issues) auf bereits bekannte Probleme
2. Erstellen Sie ein neues Issue mit einer detaillierten Beschreibung
3. Fügen Sie Screenshots oder Logs hinzu, falls relevant

## 🙏 Danksagungen

- Das offizielle Schulportal Hessen Team für die API
- Die React und TypeScript Communities
- Tailwind CSS für das großartige CSS-Framework
- Heroicons für die schönen Icons
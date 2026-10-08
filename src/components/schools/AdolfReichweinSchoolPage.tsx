import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import SEO from '../seo/SEO';
import './adolf-reichwein-school.css';

const BASE_PATH = '/schulen/adolf-reichwein-gymnasium';
const LOGIN_URL = 'https://login.schulportal.hessen.de/?i=5201';
const SCHOOL_NAME = 'Adolf-Reichwein-Gymnasium';
const SCHOOL_CITY = 'Heusenstamm';
const LOGO = '/schools/5201/logo.png';
const CAMPUS = '/schools/5201/background-lg.jpg';

const Arrow = () => <span aria-hidden="true">↗</span>;

const LoginLink: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children = 'Zum Schulportal' }) => (
  <a className={className} href={LOGIN_URL} target="_blank" rel="noreferrer"><span>{children}</span><Arrow /></a>
);

const VersionPicker: React.FC<{ active: string }> = ({ active }) => (
  <nav className="school-picker" aria-label="Designversion wählen">
    <span>Entwurf</span>
    {[1, 2, 3, 4].map((version) => <a key={version} href={`${BASE_PATH}/${version}`} aria-current={active === String(version) ? 'page' : undefined}>{version}</a>)}
  </nav>
);

const LanisBrand = ({ inverse = false }: { inverse?: boolean }) => (
  <a className={`lanis-brand ${inverse ? 'is-inverse' : ''}`} href="/" aria-label="Lanis Startseite">
    <img src="/favicon/themes/cyan/android-chrome-192x192.png" alt="" /><strong>Lanis</strong>
  </a>
);

const SchoolBrand = ({ compact = false }: { compact?: boolean }) => (
  <div className={`school-brand ${compact ? 'is-compact' : ''}`}>
    <img src={LOGO} alt="Logo des Adolf-Reichwein-Gymnasiums" />
    <div><strong>{SCHOOL_NAME}</strong><span>{SCHOOL_CITY} · Schulnummer 5201</span></div>
  </div>
);

const PortalApp = ({ compact = false }: { compact?: boolean }) => (
  <div className={`portal-app ${compact ? 'is-compact' : ''}`} aria-label="Beispielansicht des Lanis Schulportals">
    <div className="portal-app__top"><div className="portal-app__mini-brand"><img src="/favicon/themes/cyan/favicon-32x32.png" alt="" /><b>Lanis</b></div><div className="portal-app__search">⌕&nbsp;&nbsp; Module durchsuchen …</div><span>BW</span></div>
    <div className="portal-app__body">
      <aside><b>Übersicht</b>{['Nachrichten', 'Vertretungsplan', 'Mein Unterricht', 'Kalender'].map((item) => <span key={item}>{item}</span>)}</aside>
      <main><small>Donnerstag, 8. Oktober</small><h3>Guten Morgen, Bennet.</h3><div className="portal-app__notice"><i>↻</i><div><b>Eine Änderung für heute</b><span>Biologie findet in Raum 308 statt.</span></div><em>11:30</em></div><p>Deine Module</p><div className="portal-app__modules">{[['✉', 'Nachrichten'], ['↻', 'Vertretung'], ['▦', 'Unterricht'], ['◷', 'Kalender']].map(([icon, name]) => <article key={name}><i>{icon}</i><b>{name}</b><span>Öffnen →</span></article>)}</div></main>
    </div>
  </div>
);

const Seo = ({ version, title }: { version: string; title: string }) => (
  <SEO title={`${SCHOOL_NAME} – ${title}`} description={`Direkter Zugang zum Schulportal des ${SCHOOL_NAME} in ${SCHOOL_CITY}.`} path={`${BASE_PATH}/${version}`} image={CAMPUS} />
);

const VersionOne = () => (
  <div className="school-page school-v1">
    <Seo version="1" title="Schulportal Login" /><VersionPicker active="1" />
    <header className="v1-nav"><LanisBrand /><div><a href="#vorteile">Was dich erwartet</a><LoginLink className="button button--dark">Anmelden</LoginLink></div></header>
    <main>
      <section className="v1-hero">
        <div className="v1-copy"><div className="eyebrow"><img src={LOGO} alt="" />Dein Schulportal für das ARG</div><h1>Deine Schule.<br />Dein Tag. <span>Ein Login.</span></h1><p>Alles, was du am Adolf-Reichwein-Gymnasium brauchst – schneller gefunden und angenehm organisiert.</p><div className="hero-actions"><LoginLink className="button button--cyan">Jetzt anmelden</LoginLink><a href="#vorteile" className="text-link">Kurz ansehen <span>↓</span></a></div><small>Du wirst sicher zum Schulportal Hessen weitergeleitet.</small></div>
        <div className="v1-visual"><div className="v1-photo"><picture><img src={CAMPUS} srcSet="/schools/5201/background-xs.jpg 768w, /schools/5201/background-sm.jpg 990w, /schools/5201/background-md.jpg 1200w, /schools/5201/background-lg.jpg 1600w" sizes="(max-width: 800px) 100vw, 55vw" alt="Schulhof des Adolf-Reichwein-Gymnasiums" /></picture><span><i /> Adolf-Reichwein-Gymnasium · Heusenstamm</span></div><div className="v1-app"><PortalApp compact /></div></div>
      </section>
      <section className="v1-stats" aria-label="Vorteile"><article><strong>1</strong><span>Zugang für deinen Schulalltag</span></article><article><strong>4</strong><span>zentrale Bereiche auf einen Blick</span></article><article><strong>24/7</strong><span>bereits geladene Inhalte verfügbar</span></article><article><strong>5201</strong><span>direkt für das ARG vorausgewählt</span></article></section>
      <section className="v1-benefits" id="vorteile"><div><p className="section-label">Einfach entspannter</p><h2>Weniger klicken.<br /><span>Mehr mitbekommen.</span></h2></div><div className="benefit-grid">{[['↻', 'Änderungen direkt sehen', 'Vertretungen und Raumwechsel stehen dort, wo du sie erwartest.'], ['✉', 'Nachrichten im Blick', 'Wichtige Infos von Lehrkräften und Kursen gehen nicht unter.'], ['▦', 'Alles für den Unterricht', 'Aufgaben, Dateien und Termine bleiben sinnvoll zusammen.']].map(([icon, title, text]) => <article key={title}><i>{icon}</i><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="simple-cta"><div><SchoolBrand /><h2>Bereit für deinen Schultag?</h2><p>Mit deinen bekannten Schulportal-Zugangsdaten anmelden.</p></div><LoginLink className="button button--dark">Schulportal öffnen</LoginLink></section>
    </main>
  </div>
);

const VersionTwo = () => (
  <div className="school-page school-v2">
    <Seo version="2" title="Willkommen am ARG" /><VersionPicker active="2" />
    <header className="v2-top"><LanisBrand /><span>Schulportal · ARG Heusenstamm</span></header>
    <main>
      <section className="v2-campus">
        <img src={CAMPUS} alt="Adolf-Reichwein-Gymnasium in Heusenstamm" />
        <div className="v2-overlay" />
        <div className="v2-school"><SchoolBrand /><h1>Willkommen<br />am <span>ARG.</span></h1><p>Dein direkter Weg zu Stundenplan, Vertretungen, Nachrichten und Unterricht.</p></div>
        <aside className="v2-login-card"><div className="v2-login-icon">→</div><p>Schulportal Hessen</p><h2>Schön, dass du da bist.</h2><span>Deine Schule ist bereits ausgewählt.</span><div className="v2-school-chip"><img src={LOGO} alt="" /><div><b>Adolf-Reichwein-Gymnasium</b><small>Heusenstamm · 5201</small></div><i>✓</i></div><LoginLink className="button button--cyan">Weiter zur Anmeldung</LoginLink><small>Der Login erfolgt sicher beim Schulportal Hessen.</small></aside>
      </section>
      <section className="v2-quick"><header><p className="section-label">Nach dem Login</p><h2>Alles da, wo du es brauchst.</h2></header><div>{[['08:00', 'Dein Stundenplan', 'Unterricht und Raumänderungen für heute.'], ['Jetzt', 'Neue Nachrichten', 'Infos aus Kursen und von Lehrkräften.'], ['1 Ort', 'Dateien & Aufgaben', 'Materialien passend zum Unterricht.']].map(([tag, title, text]) => <article key={title}><span>{tag}</span><h3>{title}</h3><p>{text}</p><i>↗</i></article>)}</div></section>
      <section className="v2-help"><div><h2>Login klappt nicht?</h2><p>Prüfe zuerst Schule, Benutzername und Passwort. Schülerinnen und Schüler wenden sich bei Fragen an ihre Klassenleitung.</p></div><a href="https://support.schulportal.hessen.de" target="_blank" rel="noreferrer">Hilfe zum Schulportal <Arrow /></a></section>
    </main>
    <footer className="school-footer"><LanisBrand /><span>Inoffizielle Vorschauseite · Login über Schulportal Hessen</span></footer>
  </div>
);

const VersionThree = () => (
  <div className="school-page school-v3">
    <Seo version="3" title="Das ARG in Lanis" /><VersionPicker active="3" />
    <header className="v3-nav"><LanisBrand /><SchoolBrand compact /><LoginLink className="button button--dark">Login</LoginLink></header>
    <main>
      <section className="v3-hero"><p className="pill">Für Schülerinnen, Schüler und Lehrkräfte am ARG</p><h1>Schulportal fürs ARG.<br /><span>Nur übersichtlicher.</span></h1><p>Deine vertrauten Schulportal-Daten – in einer Oberfläche, die sich leicht anfühlt.</p><div className="hero-actions"><LoginLink className="button button--cyan">Lanis fürs ARG öffnen</LoginLink><a href="#demo" className="button button--soft">So sieht es aus <span>↓</span></a></div></section>
      <section className="v3-demo" id="demo"><div className="v3-backdrop"><img src={CAMPUS} alt="ARG Heusenstamm" /><span>Adolf-Reichwein-Gymnasium</span></div><div className="v3-browser"><div className="v3-browser-bar"><i /><i /><i /><span>lanis · Adolf-Reichwein-Gymnasium</span></div><PortalApp /></div><div className="v3-floating v3-floating--one"><i>✓</i><div><b>Alles aktuell</b><span>Zuletzt vor 2 Min.</span></div></div><div className="v3-floating v3-floating--two"><b>47 ms</b><span>aus dem Cache geladen</span></div></section>
      <section className="v3-features"><header><p className="section-label">Das macht den Unterschied</p><h2>Für den echten<br />Schulalltag gemacht.</h2></header><div>{[['Hausaufgaben am richtigen Ort', 'Direkt bei der nächsten Stunde statt irgendwo in einer langen Liste.'], ['Wichtige Änderungen zuerst', 'Vertretungen und neue Nachrichten springen sofort ins Auge.'], ['Auch bei Störungen entspannt', 'Bereits geladene Inhalte bleiben zeitweise auf deinem Gerät verfügbar.'], ['Deine Schule bleibt erkennbar', 'Name, Logo und Campus des ARG begleiten dich bis zum Login.']].map(([title, text], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
      <section className="v3-bottom"><h2>Bereit? Deine Schule ist schon ausgewählt.</h2><LoginLink className="button button--cyan">Zum Schulportal</LoginLink></section>
    </main>
  </div>
);

const VersionFour = () => (
  <div className="school-page school-v4">
    <Seo version="4" title="Heute am ARG" /><VersionPicker active="4" />
    <header className="v4-nav"><div><LanisBrand /><span>für</span><SchoolBrand compact /></div><LoginLink className="button button--dark">Anmelden</LoginLink></header>
    <main>
      <section className="v4-hero"><div className="v4-copy"><p className="pill"><i /> Donnerstag, 8. Oktober</p><h1>Guten Morgen,<br /><span>ARG.</span></h1><p>Alles Wichtige für deinen Tag – bevor die erste Stunde beginnt.</p><LoginLink className="button button--cyan">Meinen Tag öffnen</LoginLink></div><div className="v4-photo"><img src={CAMPUS} alt="Schulhof des Adolf-Reichwein-Gymnasiums" /><div className="v4-weather"><span>Heusenstamm</span><b>18°</b><small>Leicht bewölkt</small></div><div className="v4-message"><i>✉</i><div><small>Neue Nachricht</small><b>Exkursion bestätigt</b><span>vor 4 Min.</span></div></div></div></section>
      <section className="v4-briefing"><header><div><p className="section-label">Beispiel für heute</p><h2>Dein Vormittag auf einen Blick.</h2></div><span>Persönliche Daten siehst du nach dem Login.</span></header><div className="v4-day"><div className="v4-timeline">{[['08:00', 'Mathematik', 'Raum 204 · Frau Weber', 'normal'], ['09:45', 'Englisch', 'Raum 115 · Herr Klein', 'normal'], ['11:30', 'Biologie', 'Vertretung · Raum 308', 'changed'], ['13:15', 'Sport', 'Sporthalle', 'normal']].map(([time, title, info, state]) => <article className={state === 'changed' ? 'is-changed' : ''} key={time}><time>{time}</time><i /><div><b>{title}</b><span>{info}</span></div>{state === 'changed' && <em>Geändert</em>}</article>)}</div><aside><span>Als Nächstes</span><b>Mathematik</b><p>Beginnt in 18 Minuten<br />Raum 204</p><div><i>▦</i><span><b>Hausaufgabe</b>Seite 34, Aufgabe 3–5</span></div></aside></div></section>
      <section className="v4-cards">{[['↻', 'Vertretungsplan', 'Änderungen sofort sehen'], ['✉', 'Nachrichten', 'Nichts Wichtiges verpassen'], ['▦', 'Unterricht', 'Aufgaben & Dateien finden']].map(([icon, title, text]) => <article key={title}><i>{icon}</i><div><h3>{title}</h3><p>{text}</p></div><span>↗</span></article>)}</section>
      <section className="simple-cta v4-cta"><div><p className="section-label">Das war nur die Vorschau</p><h2>Dein echter Tag wartet.</h2></div><LoginLink className="button button--dark">Jetzt anmelden</LoginLink></section>
    </main>
    <footer className="school-footer"><SchoolBrand compact /><span>Schulportal Hessen · Schulnummer 5201</span></footer>
  </div>
);

const AdolfReichweinSchoolPage: React.FC = () => {
  const { version } = useParams();
  if (!version) return <Navigate to={`${BASE_PATH}/1`} replace />;
  if (version === '1') return <VersionOne />;
  if (version === '2') return <VersionTwo />;
  if (version === '3') return <VersionThree />;
  if (version === '4') return <VersionFour />;
  return <Navigate to={`${BASE_PATH}/1`} replace />;
};

export default AdolfReichweinSchoolPage;

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

const PortalLink: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children = 'Zum Schulportal' }) => (
  <a className={className} href={LOGIN_URL} target="_blank" rel="noreferrer">
    <span>{children}</span><Arrow />
  </a>
);

const VersionPicker: React.FC<{ active: string }> = ({ active }) => (
  <nav className="arg-version-picker" aria-label="Designversion wählen">
    <span>Entwurf</span>
    {[1, 2, 3, 4].map((version) => (
      <a key={version} href={`${BASE_PATH}/${version}`} aria-current={active === String(version) ? 'page' : undefined}>
        {version}
      </a>
    ))}
  </nav>
);

const SchoolMark: React.FC<{ light?: boolean }> = ({ light = false }) => (
  <div className={`arg-mark ${light ? 'arg-mark--light' : ''}`}>
    <img src={LOGO} alt="Logo des Adolf-Reichwein-Gymnasiums" />
    <div><strong>{SCHOOL_NAME}</strong><span>{SCHOOL_CITY}</span></div>
  </div>
);

const PortalPreview = () => (
  <div className="arg-portal-preview" aria-label="Vorschau des Schulportals">
    <div className="arg-preview-bar"><i /><i /><i /><span>portal.arg-heusenstamm.de</span></div>
    <div className="arg-preview-body">
      <aside><b>AR</b>{['Übersicht', 'Stundenplan', 'Nachrichten', 'Dateien'].map((item, index) => <span className={index === 0 ? 'is-active' : ''} key={item}>{item}</span>)}</aside>
      <main>
        <small>Guten Morgen, Mia</small><h3>Dein Schultag</h3>
        <div className="arg-preview-grid">
          <article><em>08:00</em><b>Mathematik</b><span>Raum 204 · Frau Weber</span></article>
          <article><em>09:45</em><b>Englisch</b><span>Raum 115 · Herr Klein</span></article>
          <article className="is-cyan"><em>11:30</em><b>Biologie</b><span>Vertretung · Raum 308</span></article>
        </div>
      </main>
    </div>
  </div>
);

const VersionOne = () => (
  <div className="arg-page arg-v1">
    <SEO title={`${SCHOOL_NAME} – Schulportal Login`} description={`Direkter Zugang zum Schulportal des ${SCHOOL_NAME} in ${SCHOOL_CITY}.`} path={`${BASE_PATH}/1`} image={CAMPUS} />
    <VersionPicker active="1" />
    <header className="arg-v1-nav"><SchoolMark light /><PortalLink className="arg-v1-nav-link">Portal öffnen</PortalLink></header>
    <main>
      <section className="arg-v1-hero">
        <picture><img src={CAMPUS} srcSet="/schools/5201/background-xs.jpg 768w, /schools/5201/background-sm.jpg 990w, /schools/5201/background-md.jpg 1200w, /schools/5201/background-lg.jpg 1600w" sizes="100vw" alt="Schulhof des Adolf-Reichwein-Gymnasiums in Heusenstamm" /></picture>
        <div className="arg-v1-shade" />
        <div className="arg-v1-copy">
          <p className="arg-kicker">Schulportal Hessen · Schulnummer 5201</p>
          <h1>Alles für deinen<br /><em>Schultag.</em></h1>
          <p>Der direkte, sichere Einstieg in den digitalen Schulalltag am Adolf-Reichwein-Gymnasium.</p>
          <PortalLink className="arg-v1-cta">Jetzt anmelden</PortalLink>
        </div>
        <div className="arg-v1-today">
          <div><small>Heute am ARG</small><strong>Donnerstag, 8. Oktober</strong></div>
          <div className="arg-v1-event"><time>08:00</time><span><b>Unterrichtsbeginn</b>Alle Änderungen im Portal</span></div>
          <div className="arg-v1-event"><time>14:10</time><span><b>AG-Zeit</b>Aktuelle Räume beachten</span></div>
          <a href="#mehr">Tagesübersicht ansehen <span>↓</span></a>
        </div>
        <div className="arg-v1-scroll">Entdecken <span /></div>
      </section>
      <section className="arg-v1-intro" id="mehr">
        <p>Ein Ort für</p><h2>Stundenplan, Nachrichten<br />und gemeinsames Lernen.</h2>
        <div className="arg-v1-facts">
          <article><span>01</span><h3>Immer aktuell</h3><p>Vertretungen und Änderungen dort, wo du sie brauchst.</p></article>
          <article><span>02</span><h3>Alles gebündelt</h3><p>Unterricht, Dateien und Nachrichten in einem Zugang.</p></article>
          <article><span>03</span><h3>Für das ARG</h3><p>Direkt mit der Schulnummer 5201 verbunden.</p></article>
        </div>
      </section>
      <section className="arg-v1-final"><div><p>Bereit für den nächsten Schultag?</p><h2>Dein Portal wartet.</h2></div><PortalLink className="arg-v1-cta arg-v1-cta--dark">Anmelden</PortalLink></section>
    </main>
  </div>
);

const VersionTwo = () => (
  <div className="arg-page arg-v2">
    <SEO title={`${SCHOOL_NAME} – Dein Schultag`} description={`Stundenplan, Vertretungen und Nachrichten für das ${SCHOOL_NAME} in ${SCHOOL_CITY}.`} path={`${BASE_PATH}/2`} image={CAMPUS} />
    <VersionPicker active="2" />
    <aside className="arg-v2-rail"><img src={LOGO} alt="ARG" /><span>Heusenstamm</span><b>5201</b></aside>
    <div className="arg-v2-shell">
      <header className="arg-v2-nav"><span>Dein Schulportal</span><nav><a href="#heute">Heute</a><a href="#module">Module</a><a href="#fragen">Fragen</a></nav><PortalLink className="arg-v2-login">Einloggen</PortalLink></header>
      <main>
        <section className="arg-v2-hero" id="heute">
          <div className="arg-v2-headline"><p>Adolf-Reichwein-Gymnasium · Heusenstamm</p><h1>Heute ist ein<br /><span>guter Schultag.</span></h1><div className="arg-v2-hero-actions"><PortalLink className="arg-v2-primary">Schulportal öffnen</PortalLink><a href="#module">Was finde ich dort? <span>↓</span></a></div></div>
          <div className="arg-v2-photo"><img src={CAMPUS} alt="Das ARG in Heusenstamm" /><span>Deine Schule.<br />Dein Portal.</span></div>
          <div className="arg-v2-daycard"><header><span>DO</span><div><b>08. Oktober</b><small>Deine Vorschau</small></div><i>● live</i></header><ol><li><time>08:00</time><div><b>Mathematik</b><span>Raum 204</span></div></li><li><time>09:45</time><div><b>Englisch</b><span>Raum 115</span></div></li><li className="changed"><time>11:30</time><div><b>Biologie</b><span>Vertretung · Raum 308</span></div></li></ol><small>Beispieldaten · Im Portal siehst du deinen Plan.</small></div>
        </section>
        <section className="arg-v2-modules" id="module"><header><p>Weniger suchen.<br />Mehr wissen.</p><span>Ein Login verbindet deinen gesamten Schulalltag.</span></header><div className="arg-v2-module-grid">{[
          ['01', 'Vertretungsplan', 'Änderungen sehen, bevor der Schultag beginnt.'],
          ['02', 'Mein Unterricht', 'Aufgaben und Materialien passend zum Kurs.'],
          ['03', 'Nachrichten', 'Mit Lehrkräften und Lerngruppen verbunden bleiben.'],
          ['04', 'Dateispeicher', 'Arbeitsblätter und Abgaben an einem Ort.'],
        ].map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><b>↗</b></article>)}</div></section>
        <section className="arg-v2-faq" id="fragen"><div><small>Gut zu wissen</small><h2>Bereit, wenn<br />du es bist.</h2></div><div>{['Kann ich meine bekannten Zugangsdaten nutzen?', 'Wo sehe ich kurzfristige Vertretungen?', 'An wen wende ich mich bei Login-Problemen?'].map((q, i) => <details key={q} open={i === 0}><summary>{q}<span>+</span></summary><p>{i === 0 ? 'Ja. Du meldest dich mit deinen persönlichen Schulportal-Zugangsdaten an.' : 'Diese Information findest du nach der Anmeldung direkt in deinem Schulportal.'}</p></details>)}</div></section>
      </main>
      <footer className="arg-v2-footer"><SchoolMark /><PortalLink className="arg-v2-primary">Zum Login</PortalLink></footer>
    </div>
  </div>
);

const VersionThree = () => (
  <div className="arg-page arg-v3">
    <SEO title={`${SCHOOL_NAME} – Digital verbunden`} description={`Der digitale Schulzugang des ${SCHOOL_NAME} in ${SCHOOL_CITY}.`} path={`${BASE_PATH}/3`} image={CAMPUS} />
    <VersionPicker active="3" />
    <header className="arg-v3-nav"><SchoolMark /><div><a href="#portal">Das Portal</a><a href="#hilfe">Hilfe</a><PortalLink className="arg-v3-login">Login</PortalLink></div></header>
    <main>
      <section className="arg-v3-hero">
        <p className="arg-v3-issue">Digitaler Schulzugang · Ausgabe 2026</p>
        <h1>Neugier<br /><i>braucht</i> Raum.</h1>
        <div className="arg-v3-image"><img src={CAMPUS} alt="Adolf-Reichwein-Gymnasium, Heusenstamm" /><span>50°03' N<br />8°48' E</span></div>
        <div className="arg-v3-lead"><p>Und einen Ort, an dem alles zusammenkommt.</p><p>Das Schulportal verbindet Menschen, Unterricht und Informationen am Adolf-Reichwein-Gymnasium.</p><a className="arg-v3-arrow" href={LOGIN_URL} target="_blank" rel="noreferrer" aria-label="Schulportal öffnen">→</a></div>
      </section>
      <section className="arg-v3-marquee" aria-hidden="true"><span>HEUSENSTAMM · LERNEN · GEMEINSCHAFT · ORIENTIERUNG · </span></section>
      <section className="arg-v3-story" id="portal"><aside><span>Das Wichtigste</span><b>an einem Ort.</b></aside><div><p className="arg-v3-dropcap">Zwischen erster Stunde und letzter Abgabe passiert viel. Im Schulportal findest du genau die Informationen, die deinen Tag leichter machen.</p><div className="arg-v3-columns"><article><b>01</b><h3>Wissen, was ansteht.</h3><p>Vertretungen, Termine und Stundenplan übersichtlich zusammengeführt.</p></article><article><b>02</b><h3>In Verbindung bleiben.</h3><p>Nachrichten, Kurse und Materialien für die Schulgemeinschaft.</p></article></div></div></section>
      <section className="arg-v3-quote"><img src={LOGO} alt="Logo ARG" /><blockquote>„Demokratie ist eine Lebensform.“</blockquote><p>Im Sinne Adolf Reichweins: Schule als Ort des gemeinsamen Denkens und Handelns.</p></section>
      <section className="arg-v3-access" id="hilfe"><div><p>Schulnummer</p><strong>5201</strong></div><div><p>Standort</p><strong>Heusenstamm</strong></div><div className="arg-v3-access-cta"><p>Alles bereit?</p><PortalLink>Zum Schulportal</PortalLink></div></section>
    </main>
    <footer className="arg-v3-footer"><span>Adolf-Reichwein-Gymnasium</span><span>Schulportal Hessen · Sicherer externer Login</span></footer>
  </div>
);

const VersionFour = () => (
  <div className="arg-page arg-v4">
    <SEO title={`${SCHOOL_NAME} – Digital Campus`} description={`Digitaler Campus und Schulportal-Login des ${SCHOOL_NAME} in ${SCHOOL_CITY}.`} path={`${BASE_PATH}/4`} image={CAMPUS} />
    <VersionPicker active="4" />
    <div className="arg-v4-glow" />
    <header className="arg-v4-nav"><SchoolMark light /><div><span><i /> Systeme online</span><PortalLink className="arg-v4-login">Portal starten</PortalLink></div></header>
    <main>
      <section className="arg-v4-hero">
        <div className="arg-v4-title"><p>Digital Campus · Heusenstamm</p><h1>Schule.<br /><span>Nur smarter.</span></h1><p>Dein persönliches Cockpit für Unterricht, Organisation und alles, was heute zählt.</p><PortalLink className="arg-v4-primary">Mit Schulportal anmelden</PortalLink><small>Du wirst sicher zum Schulportal Hessen weitergeleitet.</small></div>
        <div className="arg-v4-stage"><div className="arg-v4-orbit arg-v4-orbit--one" /><div className="arg-v4-orbit arg-v4-orbit--two" /><div className="arg-v4-campus"><img src={CAMPUS} alt="ARG Campus" /><span><i />ARG · LIVE</span></div><div className="arg-v4-float arg-v4-float--message"><i>✦</i><div><small>Neue Nachricht</small><b>Exkursion bestätigt</b></div><time>jetzt</time></div><div className="arg-v4-float arg-v4-float--plan"><small>Nächste Stunde</small><strong>09:45</strong><b>Englisch · R115</b><span>In 24 Minuten</span></div><div className="arg-v4-float arg-v4-float--status"><i />Alle Dienste erreichbar</div></div>
      </section>
      <section className="arg-v4-dashboard"><header><div><small>DEIN TAG</small><h2>Alles im Blick.</h2></div><span>Beispielansicht</span></header><div className="arg-v4-bento"><article className="arg-v4-bento-main"><PortalPreview /></article><article className="arg-v4-bento-stat"><small>Heute</small><strong>6</strong><span>Unterrichtsstunden</span><div><i /><i /><i /><i /><i /><i /></div></article><article className="arg-v4-bento-modules"><small>Direktzugriff</small>{['Vertretungsplan', 'Nachrichten', 'Dateispeicher'].map((x, i) => <div key={x}><b>{['↻', '✉', '↓'][i]}</b><span>{x}</span><i>↗</i></div>)}</article><article className="arg-v4-bento-mobile"><span>Auch unterwegs.</span><div><b>ARG</b><i>•••</i><p>Guten Morgen.</p><em>Dein Tag beginnt um 08:00</em></div></article></div></section>
      <section className="arg-v4-final"><span>5201 / HEUSENSTAMM</span><h2>Dein Schultag.<br />Ein Login.</h2><PortalLink className="arg-v4-primary">Portal öffnen</PortalLink></section>
    </main>
    <footer className="arg-v4-footer"><SchoolMark light /><span>Inoffizielle Vorschauseite · Login über Schulportal Hessen</span></footer>
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

// POC: data for school 5201 comes from the public Schulportal Hessen exporteur endpoint
// (https://startcache.schulportal.hessen.de/exporteur.php?a=school&i=5201, snapshot below).
// A real version would load it per school at build time.

export interface SchoolColors {
  bg: string;
  border: string;
  text: string;
  activeBG: string;
  activeText: string;
  footer: string;
  headtitle: string;
}

export interface SchoolData {
  id: string;
  slug: string;
  name: string;
  city: string;
  colors: SchoolColors;
  logo: string;
  bg: { lg: string; md: string; sm: string; xs: string };
}

export const ARG: SchoolData = {
  id: '5201',
  slug: 'adolf-reichwein-gymnasium',
  name: 'Adolf-Reichwein-Gymnasium',
  city: 'Heusenstamm',
  colors: {
    bg: '#00bcd5',
    border: '#00a5bb',
    text: '#fffffe',
    activeBG: '#00bcd4',
    activeText: '#dfdfdf',
    footer: '#00a5bc',
    headtitle: '#606060',
  },
  logo: '/schools/5201/logo.png',
  bg: {
    lg: '/schools/5201/bg-lg.jpg',
    md: '/schools/5201/bg-md.jpg',
    sm: '/schools/5201/bg-sm.jpg',
    xs: '/schools/5201/bg-xs.jpg',
  },
};

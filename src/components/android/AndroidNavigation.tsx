import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { androidPresentation } from '../../platform/native';
import { useAndroidTabs } from '../../platform/androidNavigation';

export interface AndroidNavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}
export default function AndroidNavigation({ items, onSearch }: { basePath: string; items: AndroidNavigationItem[]; onSearch: () => void }) {
  const [tabs] = useAndroidTabs();
  const bar = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Preserve saved choices when the school does not offer a selected module.
  const selected = tabs.map(id => items.find(item => item.id === id)).filter((item): item is AndroidNavigationItem => Boolean(item));
  const shown = selected;
  const shownIds = shown.map(item => item.id).join(',');
  useEffect(() => {
    const nav = bar.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const item = active.getBoundingClientRect();
    const bounds = nav.getBoundingClientRect();
    if (item.left < bounds.left || item.right > bounds.right) {
      nav.scrollTo({ left: nav.scrollLeft + item.left - bounds.left - (nav.clientWidth - item.width) / 2 });
    }
  }, [pathname, shownIds]);
  if (!androidPresentation || !shown.length) return null;
  return <nav ref={bar} className="native-navigation md:hidden" aria-label="Hauptnavigation">
    {shown.map(({ id, href, name, icon: Icon }) => id === 'search'
      ? <button key={id} type="button" className="native-nav-item" onClick={onSearch}><span className="native-nav-icon"><Icon aria-hidden="true" className="h-6 w-6" /></span><span>{name}</span></button>
      : <NavLink key={id} to={href} title={name} aria-label={id === 'dashboard' ? 'Heute' : name} className={({ isActive }) => `native-nav-item ${isActive ? 'native-nav-active' : ''}`}>
        <span className="native-nav-icon"><Icon aria-hidden="true" className="h-6 w-6" /></span><span>{id === 'dashboard' ? 'Heute' : name}</span>
      </NavLink>)}

  </nav>;
}

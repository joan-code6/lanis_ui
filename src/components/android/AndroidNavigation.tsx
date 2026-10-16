import { NavLink } from 'react-router-dom';
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
  if (!androidPresentation) return null;
  // Preserve saved choices when the school does not offer a selected module.
  const selected = tabs.map(id => items.find(item => item.id === id)).filter((item): item is AndroidNavigationItem => Boolean(item));
  const shown = selected;
  if (!shown.length) return null;
  return <nav className="native-navigation md:hidden" aria-label="Hauptnavigation">
    {shown.map(({ id, href, name, icon: Icon }) => id === 'search'
      ? <button key={id} type="button" className="native-nav-item" onClick={onSearch}><span className="native-nav-icon"><Icon aria-hidden="true" className="h-6 w-6" /></span><span>{name}</span></button>
      : <NavLink key={id} to={href} className={({ isActive }) => `native-nav-item ${isActive ? 'native-nav-active' : ''}`}>
        <span className="native-nav-icon"><Icon aria-hidden="true" className="h-6 w-6" /></span><span>{id === 'dashboard' ? 'Heute' : name}</span>
      </NavLink>)}

  </nav>;
}

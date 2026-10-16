import { NavLink } from 'react-router-dom';
import { CalendarDaysIcon, ChatBubbleLeftRightIcon, HomeIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { androidPresentation } from '../../platform/native';

export default function AndroidNavigation({ basePath, onMore }: { basePath: string; onMore: () => void }) {
  if (!androidPresentation) return null;
  return <nav className="native-navigation md:hidden" aria-label="Hauptnavigation">
    {[{ path: 'dashboard', label: 'Heute', Icon: HomeIcon }, { path: 'timetable', label: 'Stundenplan', Icon: CalendarDaysIcon }, { path: 'messages', label: 'Nachrichten', Icon: ChatBubbleLeftRightIcon }].map(({ path, label, Icon }) => <NavLink key={path} to={`${basePath}/${path}`} className={({ isActive }) => `native-nav-item ${isActive ? 'native-nav-active' : ''}`}>
      <span className="native-nav-icon"><Icon aria-hidden="true" className="h-6 w-6" /></span><span>{label}</span>
    </NavLink>)}
    <button type="button" className="native-nav-item" onClick={onMore}><span className="native-nav-icon"><Squares2X2Icon aria-hidden="true" className="h-6 w-6" /></span><span>Mehr</span></button>
  </nav>;
}

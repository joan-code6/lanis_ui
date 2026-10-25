import { useBasePath } from '../../contexts/BasePathContext';
import { Link } from 'react-router-dom';
export default function WhatsAppSettings() {
  const basePath = useBasePath();
  return <section className="card space-y-4"><h2 className="item-title">WhatsApp ist jetzt ein Agent</h2><p className="text-sm text-surface-500">Verbinde WhatsApp unter Agenten und wähle dort deinen Zugriff. Bestehende Verbindungen benötigen eine neue Freigabe. Danach kannst du auch Aufgaben planen.</p><Link className="btn btn-primary" to={`${basePath}/settings/agents`}>Zu Agenten</Link></section>;
}

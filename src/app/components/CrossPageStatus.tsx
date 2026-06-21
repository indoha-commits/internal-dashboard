import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOpsDashboard } from '@/app/api/ops';
import { FileText, Inbox, Upload, XCircle } from 'lucide-react';

interface StatusCard {
  id: string;
  label: string;
  value: number;
  icon: typeof FileText;
  route: string;
  bgClass: string;
  color: string;
}

export function CrossPageStatus() {
  const navigate = useNavigate();
  const [data, setData] = useState<{
    pending_documents: number;
    pending_validation: number;
    awaiting_upload: number;
    failed_validation: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await getOpsDashboard();
        if (!cancelled) setData(res.kpis);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="quick-status" role="status" aria-label="Loading system status">
        <div className="quick-status-loading" />
        <div className="quick-status-loading" />
        <div className="quick-status-loading" />
        <div className="quick-status-loading" />
      </div>
    );
  }

  if (!data) return null;

  const cards: StatusCard[] = [
    {
      id: 'pending-documents',
      label: 'Pending Documents',
      value: data.pending_documents,
      icon: FileText,
      route: '/pending-documents',
      bgClass: 'kpi-icon-amber',
      color: '#f59e0b',
    },
    {
      id: 'validation-requests',
      label: 'Validation Requests',
      value: data.pending_validation,
      icon: Inbox,
      route: '/validation-requests',
      bgClass: 'kpi-icon-indigo',
      color: '#5e6ad2',
    },
    {
      id: 'awaiting-upload',
      label: 'Awaiting Upload',
      value: data.awaiting_upload,
      icon: Upload,
      route: '/validation',
      bgClass: 'kpi-icon-emerald',
      color: '#10b981',
    },
    {
      id: 'failed-validation',
      label: 'Failed Validation',
      value: data.failed_validation,
      icon: XCircle,
      route: '/validation',
      bgClass: 'kpi-icon-rose',
      color: '#ef4444',
    },
  ];

  return (
    <div className="quick-status" role="navigation" aria-label="Quick actions by section">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="quick-status-card"
            onClick={() => navigate(card.route)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(card.route); } }}
            role="link"
            tabIndex={0}
            aria-label={`${card.label}: ${card.value} items`}
            title={`View ${card.label}`}
          >
            <div className={`quick-status-icon ${card.bgClass}`}>
              <Icon />
            </div>
            <div className="quick-status-info">
              <span className="label" style={{ color: card.color }}>{card.label}</span>
              <span className="value">{card.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

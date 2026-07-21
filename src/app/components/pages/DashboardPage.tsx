import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, Eye, XCircle, Inbox, Upload } from 'lucide-react';
import { getOpsDashboard, getOpsDocumentSignedUrl, type OpsDashboardResponse } from '@/app/api/ops';
import { getSupabase } from '@/app/auth/supabase';
import { Button } from '@/app/components/ui/button';


interface KPITileProps {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  iconBgClass: string;
  route: string;
}

function KPITile({ label, value, icon: Icon, iconBgClass, route }: KPITileProps) {
  const navigate = useNavigate();
  return (
    <div
      className="bg-card rounded-lg p-4 sm:p-5 lg:p-6 border border-default cursor-pointer transition-transform hover:translate-y-[-2px] hover:shadow-lg"
      onClick={() => navigate(route)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(route); } }}
      role="link"
      tabIndex={0}
      aria-label={`${label}: ${value} items. Click to view.`}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded flex items-center justify-center shrink-0 ${iconBgClass}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <div className="kpi-value text-3xl font-semibold mt-2">{value}</div>
    </div>
  );
}

type UrgentDoc = OpsDashboardResponse['urgent_documents'][number];

function formatDocType(value?: string | null): string {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpsDashboardResponse | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [tenantName, setTenantName] = useState<string>('');

  async function refresh() {
    const res = await getOpsDashboard();
    setData(res);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getOpsDashboard();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadTenant() {
      try {
        const { getMe } = await import('@/app/api/ops');
        const me = await getMe();
        if (!cancelled) setTenantName(me?.email ? me.email.split('@')[0] : '');
      } catch {
        if (!cancelled) setTenantName('');
      }
    }

    load();
    loadTenant();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = data?.kpis;
  const urgentDocs = useMemo<UrgentDoc[]>(() => data?.urgent_documents ?? [], [data]);

  function requireEnv(name: string): string {
    const v = (import.meta.env as any)[name] as string | undefined;
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
  }

  const handleView = async (doc: UrgentDoc) => {
    setBusy((m) => ({ ...m, [`view:${doc.id}`]: true }));
    try {
      // Prefer explicit drive link if present.
      if (doc.drive_url && doc.drive_url.startsWith('https://drive.google.com')) {
        window.open(doc.drive_url, '_blank', 'noreferrer');
        return;
      }

      const res = await getOpsDocumentSignedUrl(doc.id);
      window.open(res.url, '_blank', 'noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy((m) => ({ ...m, [`view:${doc.id}`]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="page-title">System Overview</h1>
        <p className="page-desc mt-2">Key metrics, pending actions, and urgent items across all operations</p>
      </div>

      {/* Desktop KPI Grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
        <KPITile label="Documents Awaiting Verification" value={kpis?.pending_documents ?? 0} icon={FileText} iconBgClass="kpi-icon-amber" route="/pending-documents" />
        <KPITile label="Pending Validation" value={kpis?.pending_validation ?? 0} icon={Inbox} iconBgClass="kpi-icon-indigo" route="/validation-requests" />
        <KPITile label="Awaiting Upload" value={kpis?.awaiting_upload ?? 0} icon={Upload} iconBgClass="kpi-icon-emerald" route="/validation" />
        <KPITile label="Failed Validation" value={kpis?.failed_validation ?? 0} icon={XCircle} iconBgClass="kpi-icon-rose" route="/validation" />
      </div>

      {/* Mobile KPI Grid — 2-col compact */}
      <div className="block md:hidden grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-lg p-4 border border-default">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full kpi-icon-amber" />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Awaiting Verification</span>
          </div>
          <div className="text-2xl font-semibold">{kpis?.pending_documents ?? 0}</div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-default">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full kpi-icon-indigo" />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Pending Validation</span>
          </div>
          <div className="text-2xl font-semibold">{kpis?.pending_validation ?? 0}</div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-default">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full kpi-icon-emerald" />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Awaiting Upload</span>
          </div>
          <div className="text-2xl font-semibold">{kpis?.awaiting_upload ?? 0}</div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-default">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full kpi-icon-rose" />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Failed Validation</span>
          </div>
          <div className="text-2xl font-semibold">{kpis?.failed_validation ?? 0}</div>
        </div>
      </div>

      {/* Urgent Attention Section */}
      <div className="bg-card rounded-lg border border-default">
        <div
          className="px-4 sm:px-6 py-4 border-b border-default flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="section-title">Urgent Attention</h2>
          </div>
          <span className="text-xs sm:text-sm sm:ml-auto" style={{ color: 'var(--text-secondary)' }}>Documents awaiting verification</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse">
              <div className="w-6 h-6 rounded-full loading-pulse"></div>
            </div>
            <p className="empty-title">Loading dashboard</p>
            <p className="empty-sub">Fetching the latest data…</p>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </div>
        ) : urgentDocs.length === 0 ? (
          <div className="empty-state">
            <FileText size={28} color="#1c1d20" />
            <p className="empty-title">No urgent documents</p>
            <p className="empty-sub">All documents have been processed</p>
          </div>
        ) : (
          <>
            {/* Desktop urgent rows */}
            <div className="hidden md:block divide-y" style={{ borderColor: 'var(--border)' }}>
              {urgentDocs.map((doc) => {
                const pendingDays = daysSince(doc.uploaded_at);
                const viewing = Boolean(busy[`view:${doc.id}`]);

                return (
                  <div key={doc.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3">
                          <span className="font-mono text-sm" style={{ color: 'var(--primary)' }}>
                            {doc.cargo_id}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>·</span>
                          <span className="text-sm">{doc.client_name ?? 'Unknown Client'}</span>
                        </div>
                        <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{formatDocType(doc.document_type)}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div
                            className="text-sm px-2.5 py-0.5 rounded inline-block font-medium"
                            style={{
                              backgroundColor:
                                pendingDays >= 7 ? 'rgba(239,68,68,0.15)' :
                                pendingDays >= 4 ? 'rgba(245,158,11,0.15)' :
                                'rgba(107,114,128,0.15)',
                              color:
                                pendingDays >= 7 ? '#ef4444' :
                                pendingDays >= 4 ? '#f59e0b' :
                                '#9ca3af',
                            }}
                          >
                            {pendingDays}d pending
                          </div>
                          <div className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                            Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : 'unknown'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            disabled={viewing}
                            onClick={() => void handleView(doc)}
                            variant="outline"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">{viewing ? 'Opening...' : 'View'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile urgent cards */}
            <div className="block md:hidden space-y-2 p-3">
              {urgentDocs.map((doc) => {
                const pendingDays = daysSince(doc.uploaded_at);
                const viewing = Boolean(busy[`view:${doc.id}`]);

                return (
                  <div key={doc.id} className="bg-card rounded-lg border border-default p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm" style={{ color: 'var(--primary)' }}>
                        {doc.cargo_id}
                      </span>
                      <div
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor:
                            pendingDays >= 7 ? 'rgba(239,68,68,0.15)' :
                            pendingDays >= 4 ? 'rgba(245,158,11,0.15)' :
                            'rgba(107,114,128,0.15)',
                          color:
                            pendingDays >= 7 ? '#ef4444' :
                            pendingDays >= 4 ? '#f59e0b' :
                            '#9ca3af',
                        }}
                      >
                        {pendingDays}d pending
                      </div>
                    </div>
                    <div className="text-xs my-1" style={{ color: 'var(--text-secondary)' }}>{doc.client_name ?? 'Unknown Client'}</div>
                    <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{formatDocType(doc.document_type)}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : 'unknown'}
                      </div>
                      <Button
                        disabled={viewing}
                        onClick={() => void handleView(doc)}
                        variant="outline"
                        className="text-xs py-1.5 h-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {viewing ? 'Opening...' : 'View'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useApi } from '@/app/hooks/useApi';
import { getOpsActivityLog, type OpsActivityLogResponse } from '@/app/api/ops';

type Row = OpsActivityLogResponse['rows'][number];

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="text-xs px-2.5 py-1 rounded font-medium"
      style={{
        backgroundColor:
          role === 'admin'  ? 'rgba(139,92,246,0.15)' :
          role === 'ops'    ? 'rgba(59,130,246,0.15)' :
          role === 'system' ? 'rgba(107,114,128,0.15)' :
          role === 'client' ? 'rgba(20,184,166,0.15)' :
          'rgba(107,114,128,0.15)',
        color:
          role === 'admin'  ? '#a78bfa' :
          role === 'ops'    ? '#60a5fa' :
          role === 'system' ? '#9ca3af' :
          role === 'client' ? '#2dd4bf' :
          '#9ca3af',
      }}
    >
      {role}
    </span>
  );
}

export function ActivityLogPage() {
  const { loading, error, data } = useApi(getOpsActivityLog, []);
  const rows = data?.rows ?? [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Activity Log</h1>
        <p className="page-desc mt-2">Audit trail for all system events and user actions</p>
      </div>

      <div className="bg-card rounded-lg border border-default">
        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse">
              <div className="w-6 h-6 rounded-full loading-pulse"></div>
            </div>
            <p className="empty-title">Loading activity log</p>
            <p className="empty-sub">Fetching audit trail…</p>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No activity yet</p>
            <p className="empty-sub">System events appear here as they happen</p>
          </div>
        ) : (
          <>
            {/* Desktop version */}
            <div className="hidden md:block divide-y" style={{ borderColor: 'var(--border)' }}>
              {rows.map((entry, idx) => (
                <div key={idx} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start gap-6">
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {String(entry.action).replace(/_/g, ' ')}
                        </span>
                        {entry.cargoId && (
                          <>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>·</span>
                            <span className="font-mono text-xs" style={{ color: '#60a5fa' }}>{entry.cargoId}</span>
                          </>
                        )}
                      </div>
                      {entry.eventType && (
                        <div className="text-sm" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Event: {String(entry.eventType).replace(/_/g, ' ')}</div>
                      )}
                    </div>
                    <div className="w-32 flex-shrink-0 text-right">
                      <RoleBadge role={entry.actorRole} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile version */}
            <div className="block md:hidden space-y-2 p-3">
              {rows.map((entry, idx) => (
                <div key={idx} className="bg-card rounded-lg border border-default p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(entry.timestamp).toLocaleString()}</div>
                    <RoleBadge role={entry.actorRole} />
                  </div>
                  <div className="text-sm font-medium mb-1">
                    {String(entry.action).replace(/_/g, ' ')}
                  </div>
                  {entry.cargoId && (
                    <div className="font-mono text-xs" style={{ color: '#60a5fa' }}>{entry.cargoId}</div>
                  )}
                  {entry.eventType && (
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Event: {String(entry.eventType).replace(/_/g, ' ')}</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

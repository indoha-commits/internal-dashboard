import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Package, Search, AlertCircle, Plus, MapPin, Ship, Truck, Warehouse, Route } from 'lucide-react';
import { CrossPageStatus } from '@/app/components/CrossPageStatus';
import { SelectField } from '@/app/components/ui/select-field';
import { useToast } from '@/app/hooks/useToast';
import { getOpsValidationQueue, recordOpsCargoEvent } from '@/app/api/ops';
import { Button } from '@/app/components/ui/button';

interface PendingAction {
  cargoId: string;
  containerId: string;
  actionType: 'PHYSICAL_VERIFICATION' | 'WAREHOUSE_ARRIVAL' | 'DEPARTED_PORT' | 'IN_ROUTE_RUSUMO';
  currentStatus: string;
  lastEventTime: string;
  clientName: string;
  origin: string;
}

const ACTION_META: Record<string, { label: string; icon: typeof MapPin; color: string; bgColor: string }> = {
  PHYSICAL_VERIFICATION: {
    label: 'Physical Verification',
    icon: MapPin,
    color: '#c7a14a',
    bgColor: 'rgba(199,161,74,0.12)',
  },
  WAREHOUSE_ARRIVAL: {
    label: 'Warehouse Arrival',
    icon: Warehouse,
    color: '#2e4a62',
    bgColor: 'rgba(46,74,98,0.12)',
  },
  DEPARTED_PORT: {
    label: 'Departed from Port',
    icon: Ship,
    color: '#5e6ad2',
    bgColor: 'rgba(94,106,210,0.12)',
  },
  IN_ROUTE_RUSUMO: {
    label: 'In Route to Rusumo',
    icon: Route,
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.12)',
  },
};

function actionIcon(type: string) {
  const meta = ACTION_META[type];
  if (!meta) return MapPin;
  return meta.icon;
}

function formatActionLabel(type: string): string {
  return ACTION_META[type]?.label ?? type.replace(/_/g, ' ');
}

export function OperationsUpdatePage() {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [completedRecords, setCompletedRecords] = useState<PendingAction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'PHYSICAL_VERIFICATION' | 'WAREHOUSE_ARRIVAL' | 'DEPARTED_PORT' | 'IN_ROUTE_RUSUMO'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cargoOptions, setCargoOptions] = useState<PendingAction[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<'PHYSICAL_VERIFICATION' | 'WAREHOUSE_ARRIVAL' | 'DEPARTED_PORT' | 'IN_ROUTE_RUSUMO'>('PHYSICAL_VERIFICATION');
  const [showManualForm, setShowManualForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getOpsValidationQueue();
        if (cancelled) return;

        const actions: PendingAction[] = (data.items ?? [])
          .filter((item) => item.validation_status === 'validated')
          .map((item) => ({
            cargoId: item.cargo_id,
            containerId: item.cargo_id || 'N/A',
            actionType: 'PHYSICAL_VERIFICATION',
            currentStatus: 'Validated draft & assessment',
            lastEventTime: item.validation_completed_at ?? item.validation_created_at ?? '',
            clientName: item.client_name || 'Unknown Client',
            origin: '—',
          }));

        setCargoOptions(actions);
        setPendingActions(actions);
      } catch (err) {
        toast({ type: 'error', message: 'Failed to load cargo data' });
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRecordAction = async (cargoId: string, actionType: string) => {
    try {
      await recordOpsCargoEvent(cargoId, actionType);
      setCompletedActions((prev) => [...prev, `${cargoId}-${actionType}`]);
      setCompletedRecords((prev) => {
        const existing = prev.some((record) => record.cargoId === cargoId && record.actionType === actionType);
        if (existing) return prev;
        const record = pendingActions.find((action) => action.cargoId === cargoId && action.actionType === actionType);
        return record ? [{ ...record }, ...prev] : prev;
      });
      setTimeout(() => {
        setPendingActions((prev) =>
          prev.filter((action) => !(action.cargoId === cargoId && action.actionType === actionType))
        );
      }, 500);
    } catch (e) {
      toast({ type: 'error', message: 'Failed to record event. Please try again.' });
    }
  };

  const filteredActions = pendingActions.filter((action) => {
    const matchesFilter = filterType === 'all' || action.actionType === filterType;
    const matchesSearch =
      searchQuery === '' ||
      action.cargoId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.containerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddManualAction = () => {
    if (!selectedCargoId) return;
    const cargo = cargoOptions.find((c) => c.cargoId === selectedCargoId);
    if (!cargo) return;
    setPendingActions((prev) => [{ ...cargo, actionType: selectedActionType }, ...prev]);
    setShowManualForm(false);
    setSelectedCargoId('');
  };

  const filterOptions = [
    { value: 'all' as const, label: 'All Actions', icon: Package },
    { value: 'PHYSICAL_VERIFICATION' as const, label: 'Verification', icon: MapPin },
    { value: 'WAREHOUSE_ARRIVAL' as const, label: 'Arrival', icon: Warehouse },
    { value: 'DEPARTED_PORT' as const, label: 'Departure', icon: Ship },
    { value: 'IN_ROUTE_RUSUMO' as const, label: 'Rusumo', icon: Route },
  ];

  const manualActionOptions = [
    { value: 'PHYSICAL_VERIFICATION', label: 'Physical Verification', icon: MapPin, desc: 'Cargo physically verified at destination' },
    { value: 'WAREHOUSE_ARRIVAL', label: 'Warehouse Arrival', icon: Warehouse, desc: 'Cargo arrived at warehouse' },
    { value: 'DEPARTED_PORT', label: 'Departed from Port', icon: Ship, desc: 'Cargo left the port of origin' },
    { value: 'IN_ROUTE_RUSUMO', label: 'In Route to Rusumo', icon: Route, desc: 'Cargo en route to Rusumo border' },
  ];

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="page-title">Operations Update</h1>
        <p className="page-desc mt-2">Record physical verification, warehouse arrival, and transit events</p>
        </div>
        <CrossPageStatus />
        <div className="empty-state">
          <div className="animate-pulse">
            <div className="w-6 h-6 rounded-full loading-pulse"></div>
          </div>
          <p className="empty-title">Loading pending actions</p>
          <p className="empty-sub">Fetching cargo data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="page-title">Operations Update</h1>
        <p className="page-desc mt-2">Record physical verification and warehouse arrival events</p>
      </div>

      <CrossPageStatus />

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-default p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(199,161,74,0.12)' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#c7a14a' }} />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: '#c7a14a' }}>Total Pending</div>
            <div className="text-2xl font-bold mt-0.5">{pendingActions.length}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-default p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(199,161,74,0.12)' }}>
            <MapPin className="w-5 h-5" style={{ color: '#c7a14a' }} />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: '#c7a14a' }}>Verification</div>
            <div className="text-2xl font-bold mt-0.5">{pendingActions.filter((a) => a.actionType === 'PHYSICAL_VERIFICATION').length}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-default p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(46,74,98,0.12)' }}>
            <Warehouse className="w-5 h-5" style={{ color: '#2e4a62' }} />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: '#2e4a62' }}>Warehouse</div>
            <div className="text-2xl font-bold mt-0.5">{pendingActions.filter((a) => a.actionType === 'WAREHOUSE_ARRIVAL').length}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-default p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#22c55e' }} />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: '#22c55e' }}>Completed</div>
            <div className="text-2xl font-bold mt-0.5">{completedRecords.length}</div>
          </div>
        </div>
      </div>

      {/* Add Manual Action — collapsible card */}
      <div className="mb-6 rounded-xl border border-default bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/20"
          aria-expanded={showManualForm}
          aria-controls="manual-action-panel"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(94,106,210,0.12)' }}>
              <Plus className="w-4 h-4" style={{ color: '#5e6ad2' }} />
            </div>
            <div>
              <div className="text-sm font-semibold">Add Manual Action</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Add a pending action for any validated cargo</div>
            </div>
          </div>
          <div className={`transition-transform duration-200 ${showManualForm ? 'rotate-45' : ''}`}>
            <Plus className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
        </button>

        {showManualForm && (
          <div id="manual-action-panel" className="border-t border-default px-6 py-5">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="manual-cargo" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Select Cargo
                </label>
                <SelectField
                  id="manual-cargo"
                  value={selectedCargoId}
                  onChange={(e) => setSelectedCargoId(e.target.value)}
                  aria-describedby="manual-cargo-desc"
                >
                  <option value="">Choose a validated cargo…</option>
                  {cargoOptions.map((cargo) => (
                    <option key={cargo.cargoId} value={cargo.cargoId}>
                      {cargo.containerId} · {cargo.clientName}
                    </option>
                  ))}
                </SelectField>
                <p id="manual-cargo-desc" className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Only validated cargos are available
                </p>
              </div>

              <div>
                <label htmlFor="manual-action-type" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Action Type
                </label>
                <SelectField
                  id="manual-action-type"
                  value={selectedActionType}
                  onChange={(e) => setSelectedActionType(e.target.value as any)}
                >
                  {manualActionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </SelectField>
              </div>

              <div className="flex items-end">
                <Button
                  disabled={!selectedCargoId}
                  onClick={handleAddManualAction}
                  className="w-full"
                >
                  <Plus className="w-4 h-4" />
                  Add to Queue
                </Button>
              </div>
            </div>

            {selectedActionType && (
              <div className="rounded-lg p-3 text-xs flex items-center gap-2" style={{ backgroundColor: ACTION_META[selectedActionType]?.bgColor ?? 'transparent', color: ACTION_META[selectedActionType]?.color ?? 'inherit' }}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{manualActionOptions.find((o) => o.value === selectedActionType)?.desc}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters + Search */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 search-bar">
          <Search className="w-4 h-4" style={{ color: '#2a2b2f' }} />
          <input
            type="text"
            placeholder="Search by Cargo ID, Container ID, or Client"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search pending actions"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by action type">
          {filterOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = filterType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'var(--card)',
                  color: isActive ? '#fff' : 'var(--foreground)',
                  border: isActive ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)',
                }}
                aria-pressed={isActive}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Cards */}
      <div className="space-y-3">
        {filteredActions.length === 0 && completedRecords.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={28} color="#1c1d20" />
            <p className="empty-title">
              {searchQuery ? 'No actions found' : 'No pending actions'}
            </p>
            <p className="empty-sub">
              {searchQuery ? 'Try a different search term' : 'All cargo actions have been recorded'}
            </p>
          </div>
        ) : (
          <>
            {filteredActions.map((action) => {
              const completed = completedActions.includes(`${action.cargoId}-${action.actionType}`);
              const meta = ACTION_META[action.actionType] ?? ACTION_META.PHYSICAL_VERIFICATION;
              const Icon = meta.icon;

              return (
                <div
                  key={`${action.cargoId}-${action.actionType}`}
                  className="rounded-xl border transition-all duration-300 overflow-hidden"
                  style={{
                    borderColor: 'var(--border)',
                    opacity: completed ? 0.5 : 1,
                    backgroundColor: 'var(--card)',
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Top row: cargo ID + badge */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="font-mono font-bold text-base">{action.cargoId}</span>
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: meta.bgColor, color: meta.color }}
                          >
                            <Icon className="w-3 h-3" />
                            {formatActionLabel(action.actionType)}
                          </span>
                        </div>

                        {/* Detail grid */}
                        <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Client</span>
                            <div className="font-medium mt-0.5">{action.clientName}</div>
                          </div>
                          <div>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Origin</span>
                            <div className="font-medium mt-0.5">{action.origin}</div>
                          </div>
                          <div>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Current Status</span>
                            <div className="font-medium mt-0.5">{action.currentStatus}</div>
                          </div>
                        </div>

                        {/* Timestamp */}
                        {action.lastEventTime && (
                          <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <Clock className="w-3 h-3" />
                            <span>Last event: {action.lastEventTime}</span>
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="shrink-0">
                        {completed ? (
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                            <CheckCircle className="w-4 h-4" />
                            <span>Recorded</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleRecordAction(action.cargoId, action.actionType)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Record {formatActionLabel(action.actionType)}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Completed records */}
            {completedRecords.length > 0 && (
              <div className="rounded-xl border border-default bg-card overflow-hidden mt-6">
                <div className="px-5 py-3 border-b border-default flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
                  <span className="text-sm font-semibold">Completed Actions</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>{completedRecords.length} total</span>
                </div>
                <div className="divide-y divide-default">
                  {completedRecords.map((record) => (
                    <div key={`${record.cargoId}-${record.actionType}`} className="px-5 py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">{record.cargoId}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{record.clientName}</span>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: ACTION_META[record.actionType]?.bgColor ?? 'transparent', color: ACTION_META[record.actionType]?.color ?? 'inherit' }}>
                        {formatActionLabel(record.actionType)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-8 rounded-xl border-l-4 p-5 text-sm flex items-start gap-3" style={{ borderLeftColor: '#c7a14a', backgroundColor: 'rgba(199,161,74,0.05)', borderColor: 'rgba(199,161,74,0.15)' }}>
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#c7a14a' }} />
        <div>
          <div className="font-semibold mb-1">About Recording Events</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            When you record an action, a timestamped event is created in the cargo timeline. This action cannot be
            undone. Ensure physical verification or warehouse arrival is confirmed before recording.
          </div>
        </div>
      </div>
    </div>
  );
}

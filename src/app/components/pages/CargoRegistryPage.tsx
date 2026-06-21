import { CrossPageStatus } from '@/app/components/CrossPageStatus';
import { ChevronRight, CopyPlus, ExternalLink, Package, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  createOpsCargo,
  createOpsCargoBulk,
  deleteOpsCargo,
  deleteOpsCargoGroup,
  getOpsCargoRegistry,
  getOpsClients,
  type OpsCargoRegistryResponse,
} from '@/app/api/ops';
import { formatLabel, requiredDocsForCategory, type CargoCategory } from '@/app/api/categories';
import { SelectField } from '@/app/components/ui/select-field';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';

interface CargoRegistryPageProps {
  onViewTimeline: (cargoId: string) => void;
  onCreateClient: () => void;
  onDeleteClient: () => void;
  onAddClientUser: () => void;
  autoOpenNewCargoWithClient?: { id: string; name: string } | null;
  onAutoOpenConsumed?: () => void;
}

type GroupRow = OpsCargoRegistryResponse['groups'][number];

type CargoGroup = {
  billOfLading: string;
  clientName: string;
  clientId: string;
  category: string | null;
  containerCount: number;
  origin: string | null;
  destination: string | null;
  route: string | null;
  vessel: string | null;
  expectedArrivalDate: string | null;
  eta: string | null;
  createdAt: string;
  updatedAt: string;
  cargos: Array<{
    cargoId: string;
    cargoUuid: string;
    createdAt: string;
    latestEvent: string | null;
    latestEventTime: string | null;
  }>;
};

function formatEvent(value: string | null): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

export function CargoRegistryPage({
  onViewTimeline,
  onCreateClient,
  onDeleteClient,
  onAddClientUser,
  autoOpenNewCargoWithClient,
  onAutoOpenConsumed,
}: CargoRegistryPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<CargoGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [showNewCargo, setShowNewCargo] = useState(false);
  const [showBulkCargo, setShowBulkCargo] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [newCargoStep, setNewCargoStep] = useState(1);
  const [bulkCargoStep, setBulkCargoStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  const resetNewCargo = () => {
    setShowNewCargo(false);
    setNewCargoStep(1);
    setStepError(null);
  };

  const resetBulkCargo = () => {
    setShowBulkCargo(false);
    setBulkCargoStep(1);
    setStepError(null);
  };

  const handleNextNewCargoStep = () => {
    setStepError(null);
    if (newCargoStep === 1) {
      if (!form.client_id) { setStepError('Please select a client'); return; }
    } else if (newCargoStep === 2) {
      if (!form.container_id.trim()) { setStepError('Please enter a container ID'); return; }
      if (!form.expected_arrival_date) { setStepError('Please select expected arrival date'); return; }
    }
    setNewCargoStep((s) => Math.min(s + 1, 3));
  };

  const handleNextBulkCargoStep = () => {
    setStepError(null);
    if (bulkCargoStep === 1) {
      if (!bulkForm.client_id) { setStepError('Please select a client'); return; }
    } else if (bulkCargoStep === 2) {
      if (!bulkForm.bill_of_lading.trim()) { setStepError('Please enter a bill of lading'); return; }
      if (!bulkForm.expected_arrival_date) { setStepError('Please select expected arrival date'); return; }
    }
    setBulkCargoStep((s) => Math.min(s + 1, 3));
  };

  // Destructive delete confirmation (GitHub/Cloudflare-style)
  const [deleteTarget, setDeleteTarget] = useState<{ cargoId: string; clientName: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ billOfLading: string; clientName: string } | null>(null);
  const [deleteGroupConfirmText, setDeleteGroupConfirmText] = useState('');
  const [deleteGroupSubmitting, setDeleteGroupSubmitting] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    client_id: string;
    container_id: string;
    expected_arrival_date: string;
    container_count: number;
    category: CargoCategory;
    clearance_pathway: 'PORT_CLEARANCE' | 'T1_TRANSIT';
    destination: string;
    origin: string;
  }>({
    client_id: '',
    container_id: '',
    expected_arrival_date: '',
    container_count: 1,
    category: 'ELECTRONICS',
    clearance_pathway: 'PORT_CLEARANCE',
    destination: '',
    origin: '',
  });

  const [bulkForm, setBulkForm] = useState<{
    client_id: string;
    bill_of_lading: string;
    expected_arrival_date: string;
    container_count: number;
    category: CargoCategory;
    clearance_pathway: 'PORT_CLEARANCE' | 'T1_TRANSIT';
    destination: string;
    origin: string;
  }>({
    client_id: '',
    bill_of_lading: '',
    expected_arrival_date: '',
    container_count: 1,
    category: 'ELECTRONICS',
    clearance_pathway: 'PORT_CLEARANCE',
    destination: '',
    origin: '',
  });

  const refresh = async () => {
    const res = await getOpsCargoRegistry();
    const mapped = (res.groups ?? []).map((g) => ({
      billOfLading: g.bill_of_lading,
      clientId: g.client_id,
      clientName: g.client_name?.trim() || 'Unassigned client',
      category: g.category ?? null,
      containerCount: g.container_count,
      origin: g.origin ?? null,
      destination: g.destination ?? null,
      route: g.route ?? null,
      vessel: g.vessel ?? null,
      expectedArrivalDate: g.expected_arrival_date ?? null,
      eta: g.eta ?? null,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      cargos: g.cargos.map((c) => ({
        cargoId: c.cargo_id,
        cargoUuid: c.cargo_uuid,
        createdAt: c.created_at,
        latestEvent: c.latest_event_type,
        latestEventTime: c.latest_event_time,
      })),
    }));
    setGroups(mapped);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getOpsCargoRegistry();
        if (!cancelled) {
          const mapped = (res.groups ?? []).map((g) => ({
            billOfLading: g.bill_of_lading,
            clientId: g.client_id,
            clientName: g.client_name?.trim() || 'Unassigned client',
            category: g.category ?? null,
            containerCount: g.container_count,
            origin: g.origin ?? null,
            destination: g.destination ?? null,
            route: g.route ?? null,
            vessel: g.vessel ?? null,
            expectedArrivalDate: g.expected_arrival_date ?? null,
            eta: g.eta ?? null,
            createdAt: g.created_at,
            updatedAt: g.updated_at,
            cargos: g.cargos.map((c) => ({
              cargoId: c.cargo_id,
              cargoUuid: c.cargo_uuid,
              createdAt: c.created_at,
              latestEvent: c.latest_event_type,
              latestEventTime: c.latest_event_time,
            })),
          }));
          setGroups(mapped);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // If we just created a new client, reopen the New Cargo modal and preselect it.
  useEffect(() => {
    if (!autoOpenNewCargoWithClient) return;

    (async () => {
      await reloadClients();
      setNewCargoStep(1);
      setStepError(null);
      setShowNewCargo(true);
      setForm((f) => ({ ...f, client_id: autoOpenNewCargoWithClient.id }));
      onAutoOpenConsumed?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenNewCargoWithClient]);

  const grouped = useMemo<CargoGroup[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = q
      ? groups.filter((g) => {
          const client = (g.clientName ?? '').toLowerCase();
          const bol = (g.billOfLading ?? '').toLowerCase();
          return client.includes(q) || bol.includes(q);
        })
      : groups;

    return filtered
      .slice()
      .sort((a, b) => (a.clientName ?? '').localeCompare(b.clientName ?? ''))
      .map((g) => ({
        ...g,
        cargos: g.cargos.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
      }));
  }, [groups, searchTerm]);

  const toggleGroup = (billOfLading: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(billOfLading) ? next.delete(billOfLading) : next.add(billOfLading);
      return next;
    });
  };

  const reloadClients = async () => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      const res = await getOpsClients();
      setClients(res.clients ?? []);
    } catch (e) {
      setClientsError(e instanceof Error ? e.message : String(e));
    } finally {
      setClientsLoading(false);
    }
  };

  const openNewCargo = async () => {
    setNewCargoStep(1);
    setStepError(null);
    setShowNewCargo(true);
    if (clients.length) return;
    await reloadClients();
  };

  const openBulkCargo = async () => {
    setBulkCargoStep(1);
    setStepError(null);
    setShowBulkCargo(true);
    if (clients.length) return;
    await reloadClients();
  };

  const openDeleteCargo = (cargoId: string, clientName: string) => {
    setDeleteError(null);
    setDeleteConfirmText('');
    setDeleteTarget({ cargoId, clientName });
  };

  const openDeleteCargoGroup = (billOfLading: string, clientName: string) => {
    setDeleteGroupError(null);
    setDeleteGroupConfirmText('');
    setDeleteGroupTarget({ billOfLading, clientName });
  };

  const closeDeleteCargo = () => {
    setDeleteTarget(null);
    setDeleteConfirmText('');
    setDeleteError(null);
    setDeleteSubmitting(false);
  };

  const closeDeleteCargoGroup = () => {
    setDeleteGroupTarget(null);
    setDeleteGroupConfirmText('');
    setDeleteGroupError(null);
    setDeleteGroupSubmitting(false);
  };

  const confirmDeleteCargo = async () => {
    if (!deleteTarget) return;

    const expected = deleteTarget.cargoId;
    if (deleteConfirmText.trim() !== expected) {
      setDeleteError(`Please type "${expected}" to confirm.`);
      return;
    }

    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteOpsCargo(deleteTarget.cargoId);
      await refresh();
      closeDeleteCargo();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
      setDeleteSubmitting(false);
    }
  };

  const confirmDeleteCargoGroup = async () => {
    if (!deleteGroupTarget) return;

    const expected = deleteGroupTarget.billOfLading;
    if (deleteGroupConfirmText.trim() !== expected) {
      setDeleteGroupError(`Please type "${expected}" to confirm.`);
      return;
    }

    setDeleteGroupSubmitting(true);
    setDeleteGroupError(null);
    try {
      await deleteOpsCargoGroup(deleteGroupTarget.billOfLading);
      await refresh();
      closeDeleteCargoGroup();
    } catch (e) {
      setDeleteGroupError(e instanceof Error ? e.message : String(e));
      setDeleteGroupSubmitting(false);
    }
  };

  const submitNewCargo = async () => {
    setStepError(null);

    if (!form.client_id) {
      setStepError('Please select a client');
      return;
    }
    if (!form.container_id.trim()) {
      setStepError('Please enter a container id');
      return;
    }
    if (!form.expected_arrival_date) {
      setStepError('Please select expected arrival date');
      return;
    }

    const required_documents = requiredDocsForCategory(form.category, form.clearance_pathway);

    setSubmitting(true);
    try {
      await createOpsCargo({
        client_id: form.client_id,
        container_id: form.container_id.trim(),
        container_number: form.container_id.trim(),
        expected_arrival_date: form.expected_arrival_date,
        category: form.category,
        clearance_pathway: form.clearance_pathway,
        required_documents,
        container_count: form.container_count,
        destination: form.destination.trim() || null,
        origin: form.origin.trim() || null,
      });
      resetNewCargo();
      setForm({
        client_id: '',
        container_id: '',
        expected_arrival_date: '',
        container_count: 1,
        category: 'ELECTRONICS',
        clearance_pathway: 'PORT_CLEARANCE',
        destination: '',
        origin: '',
      });
      await refresh();
    } catch (e) {
      setStepError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const submitBulkCargo = async () => {
    setStepError(null);

    if (!bulkForm.client_id) {
      setStepError('Please select a client');
      return;
    }
    if (!bulkForm.bill_of_lading.trim()) {
      setStepError('Please enter a container group ID');
      return;
    }
    if (!bulkForm.expected_arrival_date) {
      setStepError('Please select expected arrival date');
      return;
    }

    const required_documents = requiredDocsForCategory(bulkForm.category, bulkForm.clearance_pathway);

    setSubmittingBulk(true);
    try {
      await createOpsCargoBulk({
        client_id: bulkForm.client_id,
        bill_of_lading: bulkForm.bill_of_lading.trim(),
        expected_arrival_date: bulkForm.expected_arrival_date,
        category: bulkForm.category,
        clearance_pathway: bulkForm.clearance_pathway,
        required_documents,
        container_count: bulkForm.container_count,
        destination: bulkForm.destination.trim() || null,
        origin: bulkForm.origin.trim() || null,
      });
      resetBulkCargo();
      setBulkForm({
        client_id: '',
        bill_of_lading: '',
        expected_arrival_date: '',
        container_count: 1,
        category: 'ELECTRONICS',
        clearance_pathway: 'PORT_CLEARANCE',
        destination: '',
        origin: '',
      });
      await refresh();
    } catch (e) {
      setStepError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmittingBulk(false);
    }
  };

  const totalCargos = groups.reduce((sum, g) => sum + g.cargos.length, 0);

  const formatTimestamp = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div className="flex-1">
          <h1 className="page-title">Cargo Registry</h1>
          <p className="page-desc mt-2">All client cargos. Create single or bulk containers and manage client accounts.</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
          <Button onClick={openNewCargo} className="inline-flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            New Cargo
          </Button>
          <Button onClick={openBulkCargo} variant="outline">
            <CopyPlus className="w-4 h-4" />
            Bulk Create
          </Button>
          <Button onClick={onAddClientUser} variant="outline">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
          <Button onClick={onDeleteClient} variant="destructive">
            <Trash2 className="w-4 h-4" />
            Delete Client
          </Button>
        </div>
      </div>

      <CrossPageStatus />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <label className="sr-only" htmlFor="search-registry">Search cargo registry</label>
        <div className="flex-1 search-bar">
          <Search className="w-4 h-4" />
          <input
            id="search-registry"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client or cargo id"
            aria-label="Search cargo registry"
          />
        </div>
        <div className="text-sm body-text sm:whitespace-nowrap">{totalCargos} containers • {grouped.length} groups</div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden border-default">
        {loading ? (
          <div className="px-4 sm:px-6 py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
        ) : error ? (
          <div className="px-4 sm:px-6 py-8 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </div>
        ) : grouped.length === 0 ? (
          <div className="empty-state">
            <Package size={28} color="#1c1d20" />
            <p className="empty-title">No cargos found</p>
            <p className="empty-sub">Create a new cargo to get started</p>
          </div>
        ) : (
          <div className="divide-y overflow-x-auto border-default">
            {grouped.map((group) => {
              const open = expandedGroups.has(group.billOfLading);

              return (
                <div key={group.billOfLading}>
                  <button
                    onClick={() => toggleGroup(group.billOfLading)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm truncate font-semibold">
                        {group.billOfLading}
                      </div>
                      <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {group.clientName} • {group.cargos.length} containers
                      </div>
                    </div>
                    <div className="text-sm ml-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{open ? '−' : '+'}</div>
                  </button>

                  {open && (
                    <div className="px-4 sm:px-6 pb-4">
                      {/* Mobile: card list */}
                      <div className="sm:hidden space-y-3">
                        {group.cargos.map((c) => (
                          <div
                            key={c.cargoId}
                            className="rounded-lg border p-3 sm:p-4 border-default"
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-sm sm:text-base" style={{ color: 'var(--primary)' }}>
                                {c.cargoId}
                              </div>
                              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Last update {formatTimestamp(c.latestEventTime)}</div>
                              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Stage: {formatEvent(c.latestEvent)}</div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <Button
                                onClick={() => onViewTimeline(c.cargoId)}
                                variant="outline"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View timeline
                              </Button>

                              <Button
                                onClick={() => openDeleteCargo(c.cargoId, group.clientName)}
                                variant="outline"
                                className="text-destructive border-destructive"
                              >
                                Remove container
                              </Button>

                              <Button
                                onClick={() => openDeleteCargoGroup(group.billOfLading, group.clientName)}
                                variant="outline"
                                className="text-destructive border-destructive"
                              >
                                Remove container group
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tablet/Desktop: dense list */}
                      <div className="hidden sm:block rounded border border-default">
                        <div className="divide-y border-default">
                          {group.cargos.map((c) => (
                            <div key={c.cargoId} className="px-4 py-3 flex items-center justify-between gap-4">
                              <div>
                                <div className="font-mono text-sm" style={{ color: 'var(--primary)' }}>
                                  {c.cargoId}
                                </div>
                                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Last update {formatTimestamp(c.latestEventTime)}</div>
                                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Stage: {formatEvent(c.latestEvent)}</div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => onViewTimeline(c.cargoId)}
                                  variant="outline"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  View timeline
                                </Button>

                                <Button
                                  onClick={() => openDeleteCargo(c.cargoId, group.clientName)}
                                  variant="outline"
                                  className="text-destructive border-destructive"
                                >
                                  Remove container
                                </Button>

                                <Button
                                  onClick={() => openDeleteCargoGroup(group.billOfLading, group.clientName)}
                                  variant="outline"
                                  className="text-destructive border-destructive"
                                >
                                  Remove container group
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) closeDeleteCargo(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete container</DialogTitle>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Permanently delete <span className="font-mono text-xs">{deleteTarget?.cargoId}</span> and all associated data.
            </p>
          </DialogHeader>

          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--destructive)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>Warning</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              This action cannot be undone. It will delete:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>All cargo records (events, documents, approvals) in Supabase</li>
                <li>Related bucket objects (best-effort)</li>
                <li>The cargo folder in Google Drive (best-effort)</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              To confirm, type <span className="font-mono">{deleteTarget?.cargoId}</span>
            </label>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="form-input"
              placeholder={deleteTarget?.cargoId}
              disabled={deleteSubmitting}
            />
          </div>

          {deleteError && (
            <div className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--destructive)', background: 'rgba(239,68,68,0.05)' }}>
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button onClick={closeDeleteCargo} variant="outline" disabled={deleteSubmitting}>Cancel</Button>
            <Button
              onClick={confirmDeleteCargo}
              variant="destructive"
              disabled={deleteSubmitting || deleteConfirmText.trim() !== deleteTarget?.cargoId}
            >
              {deleteSubmitting ? 'Deleting…' : 'Delete container'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteGroupTarget !== null} onOpenChange={(open) => { if (!open) closeDeleteCargoGroup(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete container group</DialogTitle>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Permanently delete all containers in <span className="font-mono text-xs">{deleteGroupTarget?.billOfLading}</span>.
            </p>
          </DialogHeader>

          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--destructive)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>Warning</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              This action cannot be undone. It will delete every container in the group.
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              To confirm, type <span className="font-mono">{deleteGroupTarget?.billOfLading}</span>
            </label>
            <input
              value={deleteGroupConfirmText}
              onChange={(e) => setDeleteGroupConfirmText(e.target.value)}
              className="form-input"
              placeholder={deleteGroupTarget?.billOfLading}
              disabled={deleteGroupSubmitting}
            />
          </div>

          {deleteGroupError && (
            <div className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--destructive)', background: 'rgba(239,68,68,0.05)' }}>
              {deleteGroupError}
            </div>
          )}

          <DialogFooter>
            <Button onClick={closeDeleteCargoGroup} variant="outline" disabled={deleteGroupSubmitting}>Cancel</Button>
            <Button
              onClick={confirmDeleteCargoGroup}
              variant="destructive"
              disabled={deleteGroupSubmitting || deleteGroupConfirmText.trim() !== deleteGroupTarget?.billOfLading}
            >
              {deleteGroupSubmitting ? 'Deleting…' : 'Delete group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCargo} onOpenChange={(open) => { if (!open) resetNewCargo(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Cargo</DialogTitle>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Register a new container in the system</p>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: newCargoStep >= step ? 'var(--primary)' : 'var(--border)',
                    color: newCargoStep >= step ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {step}
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                  {step === 1 ? 'Type' : step === 2 ? 'Details' : 'Review'}
                </span>
                {step < 3 && (
                  <div
                    className="flex-1 h-px mx-1 transition-colors"
                    style={{ backgroundColor: newCargoStep > step ? 'var(--primary)' : 'var(--border)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div>
            {(stepError || clientsError) && (
              <div className="mb-4 text-xs px-3 py-2 rounded border" style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)', background: 'rgba(239,68,68,0.05)' }}>
                {stepError || clientsError}
              </div>
            )}

            {/* Step 1: Client & Cargo Type */}
            {newCargoStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Client</label>
                  <SelectField
                    value={form.client_id}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__add_new_client__') { onCreateClient(); return; }
                      setForm((f) => ({ ...f, client_id: v }));
                    }}
                    disabled={clientsLoading}
                  >
                    <option value="">Select client…</option>
                    <option value="__add_new_client__">+ Add new client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </SelectField>
                  {clientsLoading && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Loading clients…</div>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Category</label>
                    <SelectField
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CargoCategory }))}
                    >
                      <option value="ELECTRONICS">Electronics</option>
                      <option value="RAW_MATERIALS">Raw Materials</option>
                      <option value="MEDS_BEVERAGE">Meds & Beverage</option>
                    </SelectField>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Container Count</label>
                    <input
                      type="number" min={1}
                      value={form.container_count}
                      onChange={(e) => setForm((f) => ({ ...f, container_count: Number(e.target.value) || 1 }))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Tax Payment Method</label>
                  <SelectField
                    value={form.clearance_pathway}
                    onChange={(e) => setForm((f) => ({ ...f, clearance_pathway: e.target.value as any }))}
                  >
                    <option value="PORT_CLEARANCE">Port Clearance (Pay Tax at Port)</option>
                    <option value="T1_TRANSIT">T1 Transit (Pay Tax After Transport)</option>
                  </SelectField>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {form.clearance_pathway === 'PORT_CLEARANCE'
                      ? 'Requires: Draft, Assessment, Exit Note'
                      : 'Requires: T1 Form, IM8 Form, Exit Note'}
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Container Details */}
            {newCargoStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Container ID</label>
                  <input
                    value={form.container_id}
                    onChange={(e) => setForm((f) => ({ ...f, container_id: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., CONTAINER-2024-001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Origin</label>
                    <input
                      value={form.origin}
                      onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                      className="form-input"
                      placeholder="e.g., Mombasa, KN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Destination</label>
                    <input
                      value={form.destination}
                      onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                      className="form-input"
                      placeholder="e.g., Kigali, RW"
                    />
                  </div>
                </div>

                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Route: {form.origin || 'Origin'} → {form.destination || 'Destination'}
                </div>

                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Expected Arrival Date</label>
                  <input
                    type="date"
                    value={form.expected_arrival_date}
                    onChange={(e) => setForm((f) => ({ ...f, expected_arrival_date: e.target.value }))}
                    className="form-input date-white-icon"
                  />
                </div>

                <div>
                  <div className="text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Required Documents</div>
                  <div className="flex flex-wrap gap-2">
                    {requiredDocsForCategory(form.category)
                      .filter((doc) => !['WH7_DOC', 'EXIT_NOTE', 'IMPORT_PERMIT'].includes(doc))
                      .map(formatLabel)
                      .filter((label) => !['WH7', 'Exit Note', 'Exit note'].includes(label))
                      .map((label) => (
                        <span key={label} className="text-xs px-2.5 py-1 rounded-md border border-default" style={{ color: 'var(--text-secondary)' }}>
                          {label}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {newCargoStep === 3 && (
              <div className="rounded-lg border border-default p-4 space-y-3">
                {[
                  ['Client', clients.find((c) => c.id === form.client_id)?.name ?? form.client_id],
                  ['Category', formatLabel(form.category)],
                  ['Container Count', String(form.container_count)],
                  ['Tax Method', form.clearance_pathway === 'PORT_CLEARANCE' ? 'Port Clearance' : 'T1 Transit'],
                  ['Container ID', form.container_id],
                  ['Origin', form.origin || '—'],
                  ['Destination', form.destination || '—'],
                  ['Expected Arrival', form.expected_arrival_date || '—'],
                ].map(([label, value], i) => (
                  <div key={label} className={i > 0 ? 'border-t border-default pt-3 flex justify-between text-sm' : 'flex justify-between text-sm'}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                <div className="border-t border-default pt-3 flex flex-wrap gap-1.5">
                  <span className="text-xs w-full" style={{ color: 'var(--text-secondary)' }}>Required Documents</span>
                  {requiredDocsForCategory(form.category)
                    .filter((doc) => !['WH7_DOC', 'EXIT_NOTE', 'IMPORT_PERMIT'].includes(doc))
                    .map(formatLabel)
                    .filter((label) => !['WH7', 'Exit Note', 'Exit note'].includes(label))
                    .map((label) => (
                      <span key={label} className="text-xs px-2 py-0.5 rounded border border-default">{label}</span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-default pt-4">
            <div>
              {newCargoStep > 1 && (
                <Button onClick={() => { setNewCargoStep((s) => s - 1); setStepError(null); }} variant="outline">
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={resetNewCargo} variant="outline">Cancel</Button>
              {newCargoStep < 3 ? (
                <Button onClick={handleNextNewCargoStep} className="inline-flex items-center gap-1.5">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button onClick={submitNewCargo} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Cargo'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkCargo} onOpenChange={(open) => { if (!open) resetBulkCargo(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Create Cargo</DialogTitle>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Create multiple containers under one Bill of Lading</p>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: bulkCargoStep >= step ? 'var(--primary)' : 'var(--border)',
                    color: bulkCargoStep >= step ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {step}
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                  {step === 1 ? 'Type' : step === 2 ? 'Details' : 'Review'}
                </span>
                {step < 3 && (
                  <div
                    className="flex-1 h-px mx-1 transition-colors"
                    style={{ backgroundColor: bulkCargoStep > step ? 'var(--primary)' : 'var(--border)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div>
            {(stepError || clientsError) && (
              <div className="mb-4 text-xs px-3 py-2 rounded border" style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)', background: 'rgba(239,68,68,0.05)' }}>
                {stepError || clientsError}
              </div>
            )}

            {/* Step 1: Client & Cargo Type */}
            {bulkCargoStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Client</label>
                  <SelectField
                    value={bulkForm.client_id}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__add_new_client__') { onCreateClient(); return; }
                      setBulkForm((f) => ({ ...f, client_id: v }));
                    }}
                    disabled={clientsLoading}
                  >
                    <option value="">Select client…</option>
                    <option value="__add_new_client__">+ Add new client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </SelectField>
                  {clientsLoading && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Loading clients…</div>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Category</label>
                    <SelectField
                      value={bulkForm.category}
                      onChange={(e) => setBulkForm((f) => ({ ...f, category: e.target.value as CargoCategory }))}
                    >
                      <option value="ELECTRONICS">Electronics</option>
                      <option value="RAW_MATERIALS">Raw Materials</option>
                      <option value="MEDS_BEVERAGE">Meds & Beverage</option>
                    </SelectField>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Container Count</label>
                    <input
                      type="number" min={1}
                      value={bulkForm.container_count}
                      onChange={(e) => setBulkForm((f) => ({ ...f, container_count: Number(e.target.value) || 1 }))}
                      className="form-input"
                    />
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Example: 5 creates GROUP123-001 to GROUP123-005
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Tax Payment Method</label>
                  <SelectField
                    value={bulkForm.clearance_pathway}
                    onChange={(e) => setBulkForm((f) => ({ ...f, clearance_pathway: e.target.value as any }))}
                  >
                    <option value="PORT_CLEARANCE">Port Clearance (Pay Tax at Port)</option>
                    <option value="T1_TRANSIT">T1 Transit (Pay Tax After Transport)</option>
                  </SelectField>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {bulkForm.clearance_pathway === 'PORT_CLEARANCE'
                      ? 'Requires: Draft, Assessment, Exit Note'
                      : 'Requires: T1 Form, IM8 Form, Exit Note'}
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Container Group Details */}
            {bulkCargoStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Bill of Lading</label>
                  <input
                    value={bulkForm.bill_of_lading}
                    onChange={(e) => setBulkForm((f) => ({ ...f, bill_of_lading: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., GROUP123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Origin</label>
                    <input
                      value={bulkForm.origin}
                      onChange={(e) => setBulkForm((f) => ({ ...f, origin: e.target.value }))}
                      className="form-input"
                      placeholder="e.g., Mombasa, KN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Destination</label>
                    <input
                      value={bulkForm.destination}
                      onChange={(e) => setBulkForm((f) => ({ ...f, destination: e.target.value }))}
                      className="form-input"
                      placeholder="e.g., Kigali, RW"
                    />
                  </div>
                </div>

                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Route: {bulkForm.origin || 'Origin'} → {bulkForm.destination || 'Destination'}
                </div>

                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Expected Arrival Date</label>
                  <input
                    type="date"
                    value={bulkForm.expected_arrival_date}
                    onChange={(e) => setBulkForm((f) => ({ ...f, expected_arrival_date: e.target.value }))}
                    className="form-input date-white-icon"
                  />
                </div>

                <div>
                  <div className="text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Required Documents</div>
                  <div className="flex flex-wrap gap-2">
                    {requiredDocsForCategory(bulkForm.category)
                      .filter((doc) => !['WH7_DOC', 'EXIT_NOTE', 'IMPORT_PERMIT'].includes(doc))
                      .map(formatLabel)
                      .filter((label) => !['WH7', 'Exit Note', 'Exit note'].includes(label))
                      .map((label) => (
                        <span key={label} className="text-xs px-2.5 py-1 rounded-md border border-default" style={{ color: 'var(--text-secondary)' }}>
                          {label}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {bulkCargoStep === 3 && (
              <div className="rounded-lg border border-default p-4 space-y-3">
                {[
                  ['Client', clients.find((c) => c.id === bulkForm.client_id)?.name ?? bulkForm.client_id],
                  ['Category', formatLabel(bulkForm.category)],
                  ['Container Count', String(bulkForm.container_count)],
                  ['Tax Method', bulkForm.clearance_pathway === 'PORT_CLEARANCE' ? 'Port Clearance' : 'T1 Transit'],
                  ['Bill of Lading', bulkForm.bill_of_lading],
                  ['Origin', bulkForm.origin || '—'],
                  ['Destination', bulkForm.destination || '—'],
                  ['Expected Arrival', bulkForm.expected_arrival_date || '—'],
                ].map(([label, value], i) => (
                  <div key={label} className={i > 0 ? 'border-t border-default pt-3 flex justify-between text-sm' : 'flex justify-between text-sm'}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                <div className="border-t border-default pt-3 flex flex-wrap gap-1.5">
                  <span className="text-xs w-full" style={{ color: 'var(--text-secondary)' }}>Required Documents</span>
                  {requiredDocsForCategory(bulkForm.category)
                    .filter((doc) => !['WH7_DOC', 'EXIT_NOTE', 'IMPORT_PERMIT'].includes(doc))
                    .map(formatLabel)
                    .filter((label) => !['WH7', 'Exit Note', 'Exit note'].includes(label))
                    .map((label) => (
                      <span key={label} className="text-xs px-2 py-0.5 rounded border border-default">{label}</span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-default pt-4">
            <div>
              {bulkCargoStep > 1 && (
                <Button onClick={() => { setBulkCargoStep((s) => s - 1); setStepError(null); }} variant="outline">
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={resetBulkCargo} variant="outline">Cancel</Button>
              {bulkCargoStep < 3 ? (
                <Button onClick={handleNextBulkCargoStep} className="inline-flex items-center gap-1.5">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button onClick={submitBulkCargo} disabled={submittingBulk}>
                  {submittingBulk ? 'Creating…' : 'Create Containers'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

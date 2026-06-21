import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Search, Loader2, FileText } from 'lucide-react';
import {
  getOpsDocumentSignedUrl,
  getOpsPendingDocuments,
  verifyDocument,
  type OpsPendingDocumentsResponse,
} from '@/app/api/ops';
import { CrossPageStatus } from '@/app/components/CrossPageStatus';
import { useToast } from '@/app/hooks/useToast';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';

type PendingDoc = OpsPendingDocumentsResponse['documents'][number];

type Grouped = Array<{
  clientName: string;
  cargos: Array<{
    cargoId: string;
    documents: PendingDoc[];
  }>;
}>;

function formatDocType(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

export function PendingDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [search, setSearch] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [verifyState, setVerifyState] = useState<Record<string, 'idle' | 'loading' | 'done'>>({});
  const { toast } = useToast();

  const refresh = async () => {
    const res = await getOpsPendingDocuments();
    setDocs(res.documents ?? []);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getOpsPendingDocuments();
        if (!cancelled) setDocs(res.documents ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo<Grouped>(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? docs.filter((d) => {
          const cargo = d.cargo_id?.toLowerCase() ?? '';
          const client = (d.client_name ?? '').toLowerCase();
          const type = d.document_type?.toLowerCase() ?? '';
          return cargo.includes(q) || client.includes(q) || type.includes(q);
        })
      : docs;

    const byClient = new Map<string, Map<string, PendingDoc[]>>();
    for (const d of filtered) {
      const clientName = d.client_name ?? 'Unknown Client';
      const groupId = d.bill_of_lading ?? d.cargo_id ?? '';
      const cargos = byClient.get(clientName) ?? new Map<string, PendingDoc[]>();
      const list = cargos.get(groupId) ?? [];
      list.push(d);
      cargos.set(groupId, list);
      byClient.set(clientName, cargos);
    }

    return Array.from(byClient.entries())
      .sort(([a], [b]) => String(a ?? '').localeCompare(String(b ?? '')))
      .map(([clientName, cargos]) => ({
        clientName,
        cargos: Array.from(cargos.entries())
          .sort(([a], [b]) => String(a ?? '').localeCompare(String(b ?? '')))
          .map(([cargoId, documents]) => ({
            cargoId,
            documents: documents.slice().sort((a, b) => String(a.document_type).localeCompare(String(b.document_type))),
          })),
      }));
  }, [docs, search]);

  const toggleClient = (clientName: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      next.has(clientName) ? next.delete(clientName) : next.add(clientName);
      return next;
    });
  };

  const toggleGroup = (billOfLading: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(billOfLading) ? next.delete(billOfLading) : next.add(billOfLading);
      return next;
    });
  };

  const [rejectDialog, setRejectDialog] = useState<{ doc: PendingDoc; reason: string } | null>(null);

  const handleVerify = async (doc: PendingDoc, action: 'approve' | 'reject', rejectionReason?: string) => {
    setBusy((m) => ({ ...m, [doc.id]: true }));
    setVerifyState((s) => ({ ...s, [doc.id]: 'loading' }));
    try {
      await verifyDocument({ document_id: doc.id, action, rejection_reason: rejectionReason });
      await refresh();
      setVerifyState((s) => ({ ...s, [doc.id]: 'done' }));
      window.setTimeout(() => {
        setVerifyState((s) => {
          if (s[doc.id] !== 'done') return s;
          const next = { ...s };
          delete next[doc.id];
          return next;
        });
      }, 2000);
    } catch (e) {
      setVerifyState((s) => {
        const next = { ...s };
        delete next[doc.id];
        return next;
      });
      toast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy((m) => ({ ...m, [doc.id]: false }));
    }
  };

  const submitReject = async () => {
    if (!rejectDialog) return;
    const reason = rejectDialog.reason.trim();
    if (!reason) return;
    await handleVerify(rejectDialog.doc, 'reject', reason);
    setRejectDialog(null);
  };

  const handleOpenSignedUrl = async (doc: PendingDoc) => {
    setBusy((m) => ({ ...m, [`open:${doc.id}`]: true }));
    try {
      const res = await getOpsDocumentSignedUrl(doc.id);
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy((m) => ({ ...m, [`open:${doc.id}`]: false }));
    }
  };

  const totalDocs = docs.length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Pending Documents</h1>
        <p className="page-desc mt-2">Documents awaiting ops team verification</p>
      </div>

      <CrossPageStatus />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <label className="sr-only" htmlFor="search-pending">Search pending documents</label>
        <div className="flex-1 search-bar">
          <Search className="w-4 h-4" style={{ color: '#2a2b2f' }} />
          <input
            id="search-pending"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, cargo id, or document type"
            aria-label="Search pending documents"
          />
        </div>
        <div className="text-sm body-text sm:whitespace-nowrap">{totalDocs} pending</div>
      </div>

      <div className="bg-card rounded-lg border border-default">
        {loading ? (
          <div className="px-6 py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
        ) : error ? (
          <div className="px-6 py-8 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </div>
        ) : grouped.length === 0 ? (
          <div className="empty-state">
            <FileText size={28} color="#1c1d20" />
            <p className="empty-title">No pending documents</p>
            <p className="empty-sub">Documents appear here when clients upload them</p>
          </div>
        ) : (
                                <div className="divide-y border-default">
            {grouped.map((client) => {
              const clientOpen = expandedClients.has(client.clientName);
              return (
                <div key={client.clientName}>
                  <button
                    onClick={() => toggleClient(client.clientName)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="text-sm font-semibold">
                          {client.clientName}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{client.cargos.length} {client.cargos.length === 1 ? 'cargo' : 'cargos'}</div>
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{clientOpen ? '−' : '+'}</div>
                  </button>

                  {clientOpen && (
                    <div className="px-6 pb-4">
                      <div className="space-y-3">
                        {client.cargos.map((cargo) => {
                          const cargoOpen = expandedGroups.has(cargo.cargoId);
                          return (
                            <div
                              key={cargo.cargoId}
                              className="rounded border border-default"
                            >
                              <button
                                onClick={() => toggleGroup(cargo.cargoId)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm" style={{ color: 'var(--primary)' }}>
                                    {cargo.cargoId}
                                  </span>
                                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>({cargo.documents.length} docs)</span>
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cargoOpen ? '−' : '+'}</div>
                              </button>

                              {cargoOpen && (
          <div className="divide-y border-default">
                                  {cargo.documents.map((doc) => {
                                    const verifying = Boolean(busy[doc.id]);
                                    const opening = Boolean(busy[`open:${doc.id}`]);
                                    return (
                                      <div key={doc.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                        <div>
                                          <div className="text-sm font-medium">
                                            {formatDocType(doc.document_type)}
                                          </div>
                                          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                            Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : 'unknown'}
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2">
                                          <Button
                                            disabled={opening}
                                            onClick={() => handleOpenSignedUrl(doc)}
                                            variant="outline"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            Open
                                          </Button>
                                          <Button
                                            disabled={verifying}
                                            onClick={() => handleVerify(doc, 'approve')}
                                          >
                                            {verifyState[doc.id] === 'loading' ? (
                                              <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />
                                            ) : (
                                              <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            {verifyState[doc.id] === 'loading'
                                              ? 'Approving…'
                                              : verifyState[doc.id] === 'done'
                                                ? 'Approved'
                                                : 'Approve'}
                                          </Button>
                                          <Button
                                            disabled={verifying}
                                            onClick={() => setRejectDialog({ doc, reason: '' })}
                                            variant="outline"
                                            className="text-destructive border-destructive"
                                          >
                                            {verifyState[doc.id] === 'loading' ? (
                                              <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />
                                            ) : null}
                                            {verifyState[doc.id] === 'loading' ? 'Rejecting…' : 'Reject'}
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={rejectDialog !== null} onOpenChange={(open) => { if (!open) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejection reason</DialogTitle>
          </DialogHeader>
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }} htmlFor="reject-reason">
            Provide a reason for rejection
          </label>
          <textarea
            id="reject-reason"
            value={rejectDialog?.reason ?? ''}
            onChange={(e) => setRejectDialog((prev) => (prev ? { ...prev, reason: e.target.value } : prev))}
            rows={4}
            className="w-full rounded border border-default bg-background px-3 py-2 text-sm"
            placeholder="Explain what needs to be updated"
          />
          <DialogFooter>
            <Button onClick={() => setRejectDialog(null)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={() => void submitReject()}
              disabled={!rejectDialog?.reason.trim()}
              variant="destructive"
            >
              Submit rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

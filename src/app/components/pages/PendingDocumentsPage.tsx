import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Search, Loader2, FileText, FileCheck, FileSpreadsheet, Scroll, Receipt, ClipboardList, Ship, Truck, LockKeyhole, Link2 } from 'lucide-react';
import {
  getOpsDocumentSignedUrl,
  getOpsPendingDocuments,
  verifyDocument,
  linkPendingDocumentToBatchBillOfLading,
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

function docTypeIcon(type: string) {
  const t = type.toUpperCase();
  if (t.includes('DRAFT') || t.includes('DECLARATION')) return FileText;
  if (t.includes('WH7') || t.includes('WAREHOUSE')) return Scroll;
  if (t.includes('INVOICE')) return Receipt;
  if (t.includes('PACKING')) return ClipboardList;
  if (t.includes('BILL') || t.includes('BOL') || t.includes('LADING')) return Ship;
  if (t.includes('EXIT') || t.includes('NOTE')) return FileCheck;
  if (t.includes('IM8') || t.includes('IMPORT')) return Truck;
  if (t.includes('ASSESSMENT')) return FileSpreadsheet;
  return FileText;
}

const RECLASS_DOC_TYPES = ['BILL_OF_LADING','COMMERCIAL_INVOICE','INVOICE','PACKING_LIST','CUSTOMS_DECLARATION','DELIVERY_ORDER','CERTIFICATE_OF_ORIGIN','ARRIVAL_NOTICE'];

function isUnknownDocType(value: string | null | undefined): boolean {
  const t = String(value ?? '').toUpperCase();
  return t === 'OTHER' || t === 'UNKNOWN';
}

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
  const [documentTypeSelections, setDocumentTypeSelections] = useState<Record<string, string>>({});
  const [batchBlSelections, setBatchBlSelections] = useState<Record<string, string>>({});
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
          const billOfLading = d.bill_of_lading?.toLowerCase() ?? '';
          return cargo.includes(q) || client.includes(q) || type.includes(q) || billOfLading.includes(q);
        })
      : docs;

    const byClient = new Map<string, Map<string, PendingDoc[]>>();
    for (const d of filtered) {
      const clientName = d.client_name ?? 'Unknown Client';
      const groupId = d.bill_of_lading
        ? 'B/L ' + d.bill_of_lading
        : d.cargo_id ?? (isUnknownDocType(d.document_type) ? 'Pending document' : 'Unassigned - B/L not detected');
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

  const handleVerify = async (doc: PendingDoc, action: 'approve' | 'reject', rejectionReason?: string, documentType?: string) => {
    setBusy((m) => ({ ...m, [doc.id]: true }));
    setVerifyState((s) => ({ ...s, [doc.id]: 'loading' }));
    try {
      await verifyDocument({ document_id: doc.id, action, rejection_reason: rejectionReason, document_type: documentType });
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

  const linkToBatchBillOfLading = async (doc: PendingDoc) => {
    const validationRequestId = batchBlSelections[doc.id];
    if (!validationRequestId) return;
    setBusy((m) => ({ ...m, [`link:${doc.id}`]: true }));
    try {
      const result = await linkPendingDocumentToBatchBillOfLading({
        document_id: doc.id,
        validation_request_id: validationRequestId,
      });
      toast({ type: 'success', message: `Linked to B/L ${result.bill_of_lading}; document actions remain locked until validation is approved.` });
      await refresh();
    } catch (e) {
      toast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy((m) => ({ ...m, [`link:${doc.id}`]: false }));
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
                                    const actionBlocked = Boolean(doc.action_blocked);
                                    const batchCandidates = doc.batch_bl_candidates ?? [];
                                    const linking = Boolean(busy[`link:${doc.id}`]);
                                    return (
                                      <div key={doc.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const Icon = docTypeIcon(doc.document_type);
                                            return <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />;
                                          })()}
                                          <div>
                                          <div className="text-sm font-medium">
                                            {doc.document_type_label ?? (isUnknownDocType(doc.document_type) ? 'Unknown type — select before approval' : formatDocType(doc.document_type))}
                                          </div>
                                          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                            Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : 'unknown'}
                                          </div>
                                          {doc.bill_of_lading ? (
                                            <div
                                              className="mt-2 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium"
                                              style={{ background: 'rgba(22, 163, 74, 0.12)', borderColor: 'rgba(34, 197, 94, 0.45)', color: '#15803d' }}
                                            >
                                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                              Associated with B/L {doc.bill_of_lading}
                                              {doc.bl_validation_status === 'pending' ? ' · awaiting validation' : ''}
                                            </div>
                                          ) : null}
                                          {!doc.bill_of_lading && batchCandidates.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap items-center gap-2 rounded border px-3 py-2 text-xs" style={{ background: 'rgba(17, 24, 39, 0.84)', borderColor: 'rgba(148, 163, 184, 0.45)', color: '#f8fafc' }}>
                                              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                              <span className="font-semibold">B/L detected in this upload batch</span>
                                              <select
                                                aria-label="Select detected bill of lading"
                                                value={batchBlSelections[doc.id] ?? ''}
                                                disabled={linking}
                                                onChange={(event) => setBatchBlSelections((current) => ({ ...current, [doc.id]: event.target.value }))}
                                                className="rounded border border-slate-500 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                                              >
                                                <option value="">Select B/L…</option>
                                                {batchCandidates.map((candidate) => (
                                                  <option key={candidate.request_id} value={candidate.request_id}>{candidate.bill_of_lading}</option>
                                                ))}
                                              </select>
                                              <Button
                                                variant="outline"
                                                disabled={linking || !batchBlSelections[doc.id]}
                                                onClick={() => void linkToBatchBillOfLading(doc)}
                                                className="h-7 border-slate-400 bg-transparent px-2 text-xs text-slate-100 hover:bg-slate-800"
                                              >
                                                {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                                                Link
                                              </Button>
                                            </div>
                                          ) : null}
                                          {actionBlocked ? (
                                            <div
                                              className="mt-2 flex items-start gap-2 rounded border px-3 py-2 text-xs"
                                              style={{ background: 'rgba(17, 24, 39, 0.84)', borderColor: 'rgba(148, 163, 184, 0.45)', color: '#f8fafc' }}
                                            >
                                              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                              <div>
                                                <div className="font-semibold">Action locked pending B/L review{doc.bill_of_lading ? ': ' + doc.bill_of_lading : ''}</div>
                                                <div className="mt-0.5" style={{ color: '#cbd5e1' }}>
                                                  {doc.action_block_reason ?? 'This document can be opened, but cannot be approved or rejected until its B/L is approved.'}
                                                </div>
                                              </div>
                                            </div>
                                          ) : null}
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2">{isUnknownDocType(doc.document_type) && (<select aria-label="Choose document type before verification" value={documentTypeSelections[doc.id] ?? ""} disabled={verifying || actionBlocked} onChange={(e) => setDocumentTypeSelections((s) => ({ ...s, [doc.id]: e.target.value }))} className="rounded border border-default bg-background px-2 py-2 text-sm"><option value="">Select type…</option>{RECLASS_DOC_TYPES.map((t) => <option key={t} value={t}>{formatDocType(t)}</option>)}</select>)}
                                          <Button
                                            disabled={opening}
                                            onClick={() => handleOpenSignedUrl(doc)}
                                            variant="outline"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            Open
                                          </Button>
                                          <Button
                                            disabled={actionBlocked || verifying || (isUnknownDocType(doc.document_type) && !documentTypeSelections[doc.id])}
                                            onClick={() => handleVerify(doc, 'approve', undefined, isUnknownDocType(doc.document_type) ? documentTypeSelections[doc.id] : undefined)}
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
                                            disabled={actionBlocked || verifying}
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

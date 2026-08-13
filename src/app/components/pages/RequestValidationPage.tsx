import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { CrossPageStatus } from '@/app/components/CrossPageStatus';
import { useToast } from '@/app/hooks/useToast';
import { getSupabase } from '@/app/auth/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { fetchJson } from '@/app/api/client';
import { getOpsClients } from '@/app/api/ops';

interface RequestRow {
  id: string;
  client_id: string;
  client_name: string | null;
  status: string;
  file_path: string;
  file_name: string | null;
  bill_of_lading?: string | null;
  cargo_id?: string | null;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  from_number?: string | null;
  linked?: boolean;
  detected_container_candidates?: Array<{
    normalized?: string;
    raw_value?: string;
    context?: string | null;
    status?: string;
  }>;
}

async function getOpsRequests(): Promise<{ requests: RequestRow[] }> {
  return await fetchJson<{ requests: RequestRow[] }>(`/ops/requests`, { method: 'GET' });
}

type ApprovePayload = {
  request_id: string;
  clearance_pathway: 'PORT_CLEARANCE' | 'T1_TRANSIT';
  expected_arrival_date?: string;
  container_count?: number;
  client_id?: string;
  phone_number?: string;
  verified_container_ids?: string[];
};

async function approveRequest(payload: ApprovePayload): Promise<{ cargo?: Record<string, unknown> }> {
  return await fetchJson(`/ops/requests/approve`, { method: 'POST', body: JSON.stringify(payload) });
}

async function rejectRequest(requestId: string, reason: string): Promise<void> {
  await fetchJson(`/ops/requests/reject`, { method: 'POST', body: JSON.stringify({ request_id: requestId, rejection_reason: reason }) });
}

async function getSignedUrl(path: string): Promise<string> {
  const res = await fetchJson<{ url: string }>(`/ops/request-file-signed-url`, {
    method: 'POST',
    body: JSON.stringify({ file_path: path }),
  });
  return res.url;
}

export function RequestValidationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [rejectDialog, setRejectDialog] = useState<{ request: RequestRow; reason: string } | null>(null);
  const [approveDialog, setApproveDialog] = useState<{
    request: RequestRow;
    clearancePathway: 'PORT_CLEARANCE' | 'T1_TRANSIT';
    expectedArrival: string;
    containerCount: string;
    fallbackCandidates: string[];
    selectedClientId: string;
    phoneNumber: string;
  } | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  const refresh = async () => {
    const res = await getOpsRequests();
    setRequests(res.requests ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [res, clientRes] = await Promise.all([
          getOpsRequests(),
          getOpsClients().catch(() => ({ clients: [] })),
        ]);
        if (!cancelled) {
          setRequests(res.requests ?? []);
          setClients(clientRes.clients ?? []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const supabase = getSupabase();
    const requestSub = supabase
      .channel('validation_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mt_request_on_validation' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(requestSub);
    };
  }, []);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setBusy((m) => ({ ...m, [approveDialog.request.id]: true }));
    try {
      const payload: ApprovePayload = {
        request_id: approveDialog.request.id,
        clearance_pathway: approveDialog.clearancePathway,
      };
      if (approveDialog.expectedArrival.trim()) {
        payload.expected_arrival_date = approveDialog.expectedArrival.trim();
      }
      const cc = Number(approveDialog.containerCount);
      if (Number.isFinite(cc) && cc >= 1) payload.container_count = cc;
      if (approveDialog.fallbackCandidates.length) {
        payload.verified_container_ids = approveDialog.fallbackCandidates;
      }
      if (!approveDialog.request.linked) {
        const phoneDigits = approveDialog.phoneNumber.replace(/\D/g, '');
        if (approveDialog.selectedClientId && approveDialog.selectedClientId !== '__new__') {
          payload.client_id = approveDialog.selectedClientId;
        } else if (phoneDigits.length >= 9) {
          payload.phone_number = phoneDigits;
        } else {
          setError('Select a client or enter a phone number for this unlinked request.');
          setBusy((m) => ({ ...m, [approveDialog.request.id]: false }));
          return;
        }
      }
      await approveRequest(payload);
      await refresh();
      setApproveDialog(null);
      navigate('/cargo-registry');
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      let msg = raw;
      const jsonStart = raw.indexOf('{');
      if (jsonStart >= 0) {
        try {
          const body = JSON.parse(raw.slice(jsonStart)) as { error?: string; detail?: string };
          if (body.error === 'cargo_create_failed' && body.detail === 'no_valid_containers') {
            msg =
              'No ISO container numbers were found on this B/L. Enter a container count in the approve dialog (e.g. 1 or 5) and approve again.';
          } else if (body.error === 'bl_number_not_found') {
            msg = 'Jarvis could not read a B/L number from the file. Check the scan or enter B/L on the request.';
          } else if (body.detail) {
            msg = `${body.error ?? 'approve_failed'}: ${body.detail}`;
          } else if (body.error) {
            msg = body.error;
          }
        } catch {
          /* keep raw */
        }
      }
      toast({ type: 'error', message: msg });
    } finally {
      setBusy((m) => ({ ...m, [approveDialog.request.id]: false }));
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setBusy((m) => ({ ...m, [rejectDialog.request.id]: true }));
    try {
      await rejectRequest(rejectDialog.request.id, rejectDialog.reason);
      await refresh();
      setRejectDialog(null);
    } finally {
      setBusy((m) => ({ ...m, [rejectDialog.request.id]: false }));
    }
  };

  const openDocument = async (request: RequestRow) => {
    const url = await getSignedUrl(request.file_path);
    window.open(url, '_blank');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Validation Requests</h1>
        <p className="page-desc mt-2">
          Approve Jarvis extraction runs on bills of lading. Cargo is created automatically upon approval.
        </p>
      </div>

      <CrossPageStatus />

      <div className="bg-card rounded-lg border border-default">
        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse">
              <div className="w-6 h-6 rounded-full loading-pulse"></div>
            </div>
            <p className="empty-title">Loading requests</p>
            <p className="empty-sub">Fetching validation requests…</p>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-sm" style={{ color: 'var(--destructive)' }}>{error}</div>
        ) : pendingRequests.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={28} color="#1c1d20" />
            <p className="empty-title">No pending requests</p>
            <p className="empty-sub">Requests appear here when clients submit them</p>
          </div>
        ) : (
          <div className="divide-y border-default">
            {pendingRequests.map((req) => {
              const busyReq = Boolean(busy[req.id]);
              return (
                <div key={req.id} className="px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">
                      {req.linked ? req.client_name : req.from_number ? `📱 ${req.from_number}` : 'Unknown sender'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {req.file_name ?? 'Bill of Lading'}
                      {req.bill_of_lading ? ` · B/L ${req.bill_of_lading}` : ''}
                      {req.cargo_id ? ' · cargo linked' : ''}
                      {' · '}
                      {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => openDocument(req)}
                      variant="outline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View file
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyReq}
                      onClick={() =>
                        setApproveDialog({
                          request: req,
                          clearancePathway: 'PORT_CLEARANCE',
                          expectedArrival: '',
                          containerCount: '1',
                          fallbackCandidates: [],
                          selectedClientId: '',
                          phoneNumber: '',
                        })
                      }
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {busyReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span className="ml-2">Approve (Jarvis)</span>
                    </Button>
                    <Button
                      disabled={busyReq}
                      onClick={() => setRejectDialog({ request: req, reason: '' })}
                      variant="outline"
                      className="text-destructive border-destructive"
                    >
                      {busyReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={approveDialog !== null} onOpenChange={(open) => { if (!open) setApproveDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve bill of lading</DialogTitle>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Jarvis will read the file, infer category (Electronics / Raw materials / Meds &amp; beverage), containers, and origin → destination.
              Only tax pathway is required here.
            </p>
          </DialogHeader>
          {approveDialog && !approveDialog.request.linked && (
            <>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={approveDialog.selectedClientId}
                  onValueChange={(v) =>
                    setApproveDialog({ ...approveDialog, selectedClientId: v })
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select existing client…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ Enter phone number for new client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {approveDialog.selectedClientId === '__new__' && (
                <div className="space-y-2">
                  <Label>Phone number (new client)</Label>
                  <Input
                    type="tel"
                    value={approveDialog.phoneNumber}
                    onChange={(e) => setApproveDialog({ ...approveDialog, phoneNumber: e.target.value })}
                    className="bg-background"
                    placeholder="e.g. 250788123456"
                  />
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>A new client will be created with this number. All alerts go here.</p>
                </div>
              )}
              {approveDialog.request.from_number && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sender: {approveDialog.request.from_number}</p>
              )}
            </>
          )}
          <div className="space-y-2">
            <Label>Tax payment method</Label>
            <Select
              value={approveDialog?.clearancePathway}
              onValueChange={(v) =>
                setApproveDialog((prev: any) => prev ? {
                  ...prev,
                  clearancePathway: v === 'T1_TRANSIT' ? 'T1_TRANSIT' : 'PORT_CLEARANCE',
                } : prev)
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PORT_CLEARANCE">
                  Port Clearance — Draft, Assessment, Exit Note
                </SelectItem>
                <SelectItem value="T1_TRANSIT">T1 Transit — T1 form, Exit Note, IM4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expected arrival (optional)</Label>
            <Input
              type="date"
              value={approveDialog?.expectedArrival ?? ''}
              onChange={(e) => setApproveDialog((prev: any) => prev ? { ...prev, expectedArrival: e.target.value } : prev)}
              className="bg-background"
            />
          </div>
          {approveDialog?.request.detected_container_candidates?.some(
            (candidate) => candidate.context === 'fallback_column',
          ) ? (
            <div className="space-y-2">
              <Label>Fallback container OCR</Label>
              <div className="space-y-1 rounded border border-default p-3">
                {approveDialog.request.detected_container_candidates
                  .filter((candidate) => candidate.context === 'fallback_column')
                  .map((candidate) => {
                    const id = String(candidate.normalized ?? candidate.raw_value ?? '')
                      .trim()
                      .toUpperCase();
                    const checked = approveDialog.fallbackCandidates.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setApproveDialog((previous: any) => previous ? {
                              ...previous,
                              fallbackCandidates: checked
                                ? previous.fallbackCandidates.filter((value: string) => value !== id)
                                : [...previous.fallbackCandidates, id],
                            } : previous)
                          }
                        />
                        <span>{id}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Container count if B/L has no ISO numbers (optional)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={approveDialog?.containerCount ?? ''}
              onChange={(e) => setApproveDialog((prev: any) => prev ? { ...prev, containerCount: e.target.value } : prev)}
              className="bg-background"
              placeholder="e.g. 5 (creates ISO-style placeholders if OCR finds none)"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setApproveDialog(null)} variant="outline">Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={approveDialog ? Boolean(busy[approveDialog.request.id]) : true}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {approveDialog && busy[approveDialog.request.id] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Approve & create cargo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog !== null} onOpenChange={(open) => { if (!open) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {rejectDialog ? `Provide a reason for rejection. Uploaded ${new Date(rejectDialog.request.created_at).toLocaleString()}.` : ''}
            </p>
          </DialogHeader>
          <Input
            value={rejectDialog?.reason ?? ''}
            onChange={(e) => setRejectDialog((prev: any) => prev ? { ...prev, reason: e.target.value } : prev)}
            placeholder="Reason"
            className="bg-background text-foreground"
          />
          <DialogFooter>
            <Button onClick={() => setRejectDialog(null)} variant="outline">Cancel</Button>
            <Button onClick={handleReject} disabled={!rejectDialog?.reason.trim()} variant="destructive">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
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
import { fetchJson } from '@/app/api/client';

interface RequestRow {
  id: string;
  client_id: string;
  client_name: string;
  status: string;
  file_path: string;
  file_name: string | null;
  bill_of_lading?: string | null;
  cargo_id?: string | null;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
}

async function getOpsRequests(): Promise<{ requests: RequestRow[] }> {
  return await fetchJson<{ requests: RequestRow[] }>(`/ops/requests`, { method: 'GET' });
}

type ApprovePayload = {
  request_id: string;
  clearance_pathway: 'PORT_CLEARANCE' | 'T1_TRANSIT';
  expected_arrival_date?: string;
  container_count?: number;
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
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [rejectDialog, setRejectDialog] = useState<{ request: RequestRow; reason: string } | null>(null);
  const [approveDialog, setApproveDialog] = useState<{
    request: RequestRow;
    clearancePathway: 'PORT_CLEARANCE' | 'T1_TRANSIT';
    expectedArrival: string;
    containerCount: string;
  } | null>(null);

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
        const res = await getOpsRequests();
        if (!cancelled) setRequests(res.requests ?? []);
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
      window.alert(msg);
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
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl">Validation Requests</h2>
        <p className="text-sm opacity-60 mt-1">
          Approve to run Jarvis on the B/L (category, containers, route). You only choose tax pathway; cargo is created automatically.
          Linked invoices and packing lists then appear under Pending Documents.
        </p>
      </div>

      <div className="bg-card rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="px-6 py-8 text-sm opacity-60">Loading…</div>
        ) : error ? (
          <div className="px-6 py-8 text-sm" style={{ color: 'var(--destructive)' }}>{error}</div>
        ) : pendingRequests.length === 0 ? (
          <div className="px-6 py-8 text-sm opacity-60">No pending requests.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {pendingRequests.map((req) => {
              const busyReq = Boolean(busy[req.id]);
              return (
                <div key={req.id} className="px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm" style={{ fontWeight: 600 }}>{req.client_name}</div>
                    <div className="text-xs opacity-60">
                      {req.file_name ?? 'Bill of Lading'}
                      {req.bill_of_lading ? ` · B/L ${req.bill_of_lading}` : ''}
                      {req.cargo_id ? ' · cargo linked' : ''}
                      {' · '}
                      {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openDocument(req)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
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
                        })
                      }
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {busyReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span className="ml-2">Approve (Jarvis)</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyReq}
                      onClick={() => setRejectDialog({ request: req, reason: '' })}
                      className="border-red-600 text-red-600"
                    >
                      {busyReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      <span className="ml-2">Reject</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {approveDialog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6" style={{ backgroundColor: 'rgba(11, 28, 45, 0.85)' }}>
          <div className="bg-card rounded-lg border w-full max-w-lg" style={{ borderColor: 'var(--border)' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg">Approve bill of lading</h3>
              <p className="text-sm opacity-60 mt-1">
                Jarvis will read the file, infer category (Electronics / Raw materials / Meds &amp; beverage), containers, and origin → destination.
                Only tax pathway is required here.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Tax payment method</Label>
                <Select
                  value={approveDialog.clearancePathway}
                  onValueChange={(v) =>
                    setApproveDialog({
                      ...approveDialog,
                      clearancePathway: v === 'T1_TRANSIT' ? 'T1_TRANSIT' : 'PORT_CLEARANCE',
                    })
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
                  value={approveDialog.expectedArrival}
                  onChange={(e) => setApproveDialog({ ...approveDialog, expectedArrival: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Container count if B/L has no ISO numbers (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={approveDialog.containerCount}
                  onChange={(e) => setApproveDialog({ ...approveDialog, containerCount: e.target.value })}
                  className="bg-background"
                  placeholder="e.g. 5 (creates ISO-style placeholders if OCR finds none)"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
                <Button
                  onClick={handleApprove}
                  disabled={Boolean(busy[approveDialog.request.id])}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {busy[approveDialog.request.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Approve & create cargo'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6" style={{ backgroundColor: 'rgba(11, 28, 45, 0.85)' }}>
          <div className="bg-card rounded-lg border w-full max-w-lg" style={{ borderColor: 'var(--border)' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg">Reject request</h3>
              <p className="text-sm opacity-60">
                Provide a reason for rejection. Uploaded {new Date(rejectDialog.request.created_at).toLocaleString()}.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <Input
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                placeholder="Reason"
                className="bg-background text-foreground"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
                <Button onClick={handleReject} disabled={!rejectDialog.reason.trim()}>Reject</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

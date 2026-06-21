import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createOpsApprovalUploadUrl,
  createOpsCargoApproval,
  getOpsValidationQueue,
  getOpsApprovalSignedUrl,
  getOpsDocumentSignedUrl,
  type OpsValidationQueueItem,
} from '@/app/api/ops';
import { formatLabel } from '@/app/api/categories';
import { getSupabase } from '@/app/auth/supabase';
import { useToast } from '@/app/hooks/useToast';

type Item = OpsValidationQueueItem;
type ApprovalKind = 'ASSESSMENT' | 'DECLARATION_DRAFT' | 'WH7_DOC' | 'EXIT_NOTE' | 'IM8';

type Grouped = Array<{
  clientName: string;
  clientId: string;
  items: Item[];
}>;

async function uploadToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`upload failed: ${res.status} ${text}`);
  }
}

export function useValidationQueue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedCargo, setExpandedCargo] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const assessmentInputRef = useRef<HTMLInputElement | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const wh7InputRef = useRef<HTMLInputElement | null>(null);
  const exitNoteInputRef = useRef<HTMLInputElement | null>(null);
  const im8InputRef = useRef<HTMLInputElement | null>(null);
  const pendingPickRef = useRef<{ cargoId: string; kind: ApprovalKind } | null>(null);

  const refresh = async () => {
    const res = await getOpsValidationQueue();
    setItems(res.items ?? []);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getOpsValidationQueue();
        if (!cancelled) setItems(res.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const supabase = getSupabase();
    const approvalsSub = supabase
      .channel('validation_queue_approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cargo_client_approvals' }, () => { refresh(); })
      .subscribe();
    const documentsSub = supabase
      .channel('validation_queue_documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_documents' }, () => { refresh(); })
      .subscribe();
    const cargoSub = supabase
      .channel('validation_queue_cargo')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cargo' }, () => { refresh(); })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(approvalsSub);
      supabase.removeChannel(documentsSub);
      supabase.removeChannel(cargoSub);
    };
  }, []);

  const grouped = useMemo<Grouped>(() => {
    const byClient = new Map<string, { clientName: string; clientId: string; items: Item[] }>();
    for (const it of items) {
      const clientName = it.client_name ?? 'Unknown Client';
      const clientId = it.client_id ?? 'unknown';
      const key = `${clientId}::${clientName}`;
      const g = byClient.get(key) ?? { clientName, clientId, items: [] };
      g.items.push(it);
      byClient.set(key, g);
    }
    return Array.from(byClient.values())
      .sort((a, b) => (a.clientName ?? '').localeCompare(b.clientName ?? ''))
      .map((g) => ({ ...g, items: g.items.slice().sort((a, b) => String(a.cargo_id ?? '').localeCompare(String(b.cargo_id ?? ''))) }));
  }, [items]);

  const summary = useMemo(() => {
    const pendingUpload = items.filter((i) => i.validation_status === 'pending_upload').length;
    const pendingValidation = items.filter((i) => i.validation_status === 'pending_validation' || i.validation_status === 'failed').length;
    const validated = items.filter((i) => i.validation_status === 'validated').length;
    const failed = items.filter((i) => i.validation_status === 'failed').length;
    return { pendingUpload, pendingValidation, validated, failed };
  }, [items]);

  const handleUpload = async (cargoId: string, kind: ApprovalKind, file: File) => {
    const key = `${cargoId}:${kind}`;
    setBusy((m) => ({ ...m, [key]: true }));
    try {
      const upload = await createOpsApprovalUploadUrl(cargoId, { kind, file_name: file.name });
      await uploadToSignedUrl(upload.upload_url, file);
      await createOpsCargoApproval(cargoId, { kind, file_path: upload.path, notes: 'Uploaded from internal dashboard' });
      await refresh();
    } catch (e) {
      toast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy((m) => ({ ...m, [key]: false }));
    }
  };

  const pickFile = (cargoId: string, kind: ApprovalKind) => {
    pendingPickRef.current = { cargoId, kind };
    const refMap: Record<ApprovalKind, React.RefObject<HTMLInputElement | null>> = {
      ASSESSMENT: assessmentInputRef,
      DECLARATION_DRAFT: draftInputRef,
      WH7_DOC: wh7InputRef,
      EXIT_NOTE: exitNoteInputRef,
      IM8: im8InputRef,
    };
    refMap[kind].current?.click();
  };

  const onFilePicked = async (file: File | null) => {
    const pending = pendingPickRef.current;
    pendingPickRef.current = null;
    if (!pending || !file) return;
    await handleUpload(pending.cargoId, pending.kind, file);
  };

  return {
    loading, error, items, grouped, busy, summary,
    expandedClients, setExpandedClients,
    expandedCargo, setExpandedCargo,
    pickFile, onFilePicked,
    assessmentInputRef, draftInputRef, wh7InputRef, exitNoteInputRef, im8InputRef,
  };
}

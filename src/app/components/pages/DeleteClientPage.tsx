import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { deleteOpsClient, getOpsClients } from '@/app/api/ops';
import { SelectField } from '@/app/components/ui/select-field';
import { FormField } from '@/app/components/ui/form-field';
import { Button } from '@/app/components/ui/button';

interface Client {
  id: string;
  name: string;
  slug?: string;
}

interface DeleteClientPageProps {
  onDeleted: () => void;
  onCancel: () => void;
}

export function DeleteClientPage({ onDeleted, onCancel }: DeleteClientPageProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load client list
  useEffect(() => {
    getOpsClients()
      .then((res) => setClients((res.clients ?? []) as any))
      .catch((e: any) => setError(String(e)))
      .finally(() => setLoadingClients(false));
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedId);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedId) {
      setError('Please select a client to delete.');
      return;
    }
    if (!selectedClient) {
      setError('Selected client not found.');
      return;
    }
    if (confirmName.trim().toLowerCase() !== selectedClient.name.trim().toLowerCase()) {
      setError(`Type the client name exactly to confirm: "${selectedClient.name}"`);
      return;
    }

    setSubmitting(true);
    const deletedName = selectedClient.name;
    try {
      await deleteOpsClient(selectedId);
      // Remove from dropdown immediately — before navigation
      setClients((prev) => prev.filter((c) => c.id !== selectedId));
      setSelectedId('');
      setConfirmName('');
      setSuccessMsg(`"${deletedName}" and all their cargo have been permanently deleted.`);
      // Navigate back after 2 seconds so user sees the updated dropdown
      timerRef.current = setTimeout(() => onDeleted(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Delete Client</h1>
        <p className="page-desc mt-2">
          Permanently remove a client and all associated cargo, documents, and billing records.
        </p>
      </div>

      <div
        className="alert-warning rounded-lg border mb-4 px-4 py-3 flex items-start gap-3"
      >
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--btn-danger-bg)' }} />
        <div className="text-sm" style={{ color: 'var(--btn-danger-bg)' }}>
          <strong>Warning:</strong> All cargo shipments, documents, approvals, events, invoices, and subscriptions linked
          to this client will be permanently deleted.
        </div>
      </div>

      <div className="bg-card rounded-lg border border-default">
        <form onSubmit={handleDelete} className="p-6 space-y-4">
          {error && (
            <div className="alert-error text-sm rounded px-3 py-2">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="alert-success flex items-start gap-2 text-sm rounded px-3 py-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg} Redirecting…</span>
            </div>
          )}

          <FormField label="Select client to delete">
            {loadingClients ? (
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading clients…</div>
            ) : (
              <SelectField
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setConfirmName('');
                  setError(null);
                }}
              >
                <option value="">— Choose a client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.slug ? ` (${c.slug})` : ''}
                  </option>
                ))}
              </SelectField>
            )}
          </FormField>

          {selectedClient && (
            <FormField label={`Type ${selectedClient.name} to confirm deletion`}>
              <input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full px-3 py-2 rounded border bg-transparent"
                style={{ borderColor: 'var(--btn-danger)' }}
                placeholder={selectedClient.name}
                autoComplete="off"
              />
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={onCancel}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting || !selectedId || confirmName.trim().toLowerCase() !== (selectedClient?.name ?? '').trim().toLowerCase()}
              type="submit"
              variant="destructive"
            >
              <Trash2 className="w-4 h-4" />
              {submitting ? 'Deleting…' : 'Delete Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

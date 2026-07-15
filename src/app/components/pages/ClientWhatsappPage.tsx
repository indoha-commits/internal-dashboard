import { useCallback, useEffect, useState } from 'react';
import { Phone, Save, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { SelectField } from '@/app/components/ui/select-field';
import { FormField } from '@/app/components/ui/form-field';
import { Button } from '@/app/components/ui/button';
import { getOpsClients, setClientWhatsappPhone } from '@/app/api/ops';

export function ClientWhatsappPage() {
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [clientId, setClientId] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const data = await getOpsClients();
      setClients(data.clients ?? []);
    } catch {
      setError('Failed to load clients');
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Select a client'); return; }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) { setError('Phone must have at least 9 digits'); return; }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await setClientWhatsappPhone(clientId, { whatsapp_phone: `+${digits}` });
      setSuccess(`WhatsApp number set to ${res.whatsapp_phone}`);
      setPhone('');
      setClientId('');
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Client WhatsApp Number</h1>
        <p className="page-desc mt-1">
          Link a WhatsApp phone number to a client so their inbound messages are recognized and processed.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto p-1 hover:bg-destructive/20 rounded">
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 text-green-800 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-muted/20">
        <FormField label="Client" className="space-y-1">
          <SelectField value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>
        </FormField>

        <FormField label="WhatsApp phone number" className="space-y-1">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 250788123456"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            required
          />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Enter digits only — the + prefix is added automatically.
          </p>
        </FormField>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save WhatsApp number'}
        </Button>
      </form>

      {clients.length === 0 && (
        <div className="empty-state">
          <Users className="w-8 h-8 opacity-40" />
          <p className="empty-title">No clients found</p>
          <p className="empty-sub">Create a client first in the Cargo Registry before linking a WhatsApp number.</p>
        </div>
      )}
    </div>
  );
}

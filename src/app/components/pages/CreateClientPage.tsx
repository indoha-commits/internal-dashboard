import { useState } from 'react';
import { createOpsClient } from '@/app/api/ops';
import { SelectField } from '@/app/components/ui/select-field';
import { FormField } from '@/app/components/ui/form-field';
import { Button } from '@/app/components/ui/button';

const PRICE_OPTIONS = [
  { value: 118000, label: '118,000 RWF / container' },
  { value: 142600, label: '142,600 RWF / container' },
] as const;

interface CreateClientPageProps {
  onCreated: (client: { id: string; name: string }) => void;
  onCancel: () => void;
}

export function CreateClientPage({ onCreated, onCancel }: CreateClientPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tin, setTin] = useState('');
  const [pricePerDmc, setPricePerDmc] = useState<118000 | 142600>(118000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clientName = name.trim();
    const em = email.trim().toLowerCase();
    const tinVal = tin.trim();

    if (!clientName) { setError('Client name is required'); return; }
    if (!em || !em.includes('@')) { setError('Please enter a valid email'); return; }
    if (!password) { setError('Password is required'); return; }
    if (!tinVal) { setError('TIN number is required'); return; }

    setSubmitting(true);
    try {
      const res = await createOpsClient({ name: clientName, email: em, password, tin: tinVal, price_per_dmc: pricePerDmc });
      onCreated(res.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Create Client</h1>
        <p className="page-desc mt-2">
          Create a new client company with login credentials. Credentials are emailed automatically.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-default">
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="text-sm px-3 py-2 rounded" style={{ color: 'var(--destructive)', backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)' }}>
              {error}
            </div>
          )}

          <FormField label="Company name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="e.g. Rwanda Wildlife Conservation Association"
              autoComplete="organization"
              required
            />
          </FormField>

          <FormField label="TIN number" required hint="Taxpayer Identification Number — required for all invoices.">
            <input
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              className="form-input"
              placeholder="e.g. 106723906"
              required
            />
          </FormField>

          <FormField label="Price per DMC / container" required hint="Used for auto-billing — 1 container = 1 DMC = this rate.">
            <SelectField
              value={pricePerDmc}
              onChange={(e) => setPricePerDmc(Number(e.target.value) as 118000 | 142600)}
              required
            >
              {PRICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>
          </FormField>

          <p className="text-xs font-medium uppercase tracking-wider mt-2" style={{ color: 'var(--text-tertiary)' }}>Login credentials</p>
          <hr className="border-default" />

          <FormField label="Client email" required hint="Used for dashboard login and auto-invoice delivery.">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="client@example.com"
              autoComplete="email"
              required
            />
          </FormField>

          <FormField label="Dashboard password" required>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              autoComplete="new-password"
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={onCancel}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Creating…' : 'Create Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

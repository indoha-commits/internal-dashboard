import { useEffect, useState } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { addOpsClientUser, getOpsClients } from '@/app/api/ops';
import { SelectField } from '@/app/components/ui/select-field';
import { FormField } from '@/app/components/ui/form-field';
import { Button } from '@/app/components/ui/button';

interface Client {
  id: string;
  name: string;
  slug?: string;
}

interface AddClientUserPageProps {
  onDone: () => void;
  onCancel: () => void;
}

export function AddClientUserPage({ onDone, onCancel }: AddClientUserPageProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    getOpsClients()
      .then((res) => setClients((res.clients ?? []) as any))
      .catch((e: any) => setError(String(e)))
      .finally(() => setLoadingClients(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedId) { setError('Please select a client.'); return; }
    if (!email || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setSubmitting(true);
    try {
      const res = await addOpsClientUser(selectedId, email, password);
      setSuccess(`User ${res.email} added successfully. They can now log in to the client dashboard.`);
      setEmail('');
      setPassword('');
      setSelectedId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Add Client User</h1>
        <p className="page-desc mt-2">
          Create an additional login credential for an existing client company.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-default">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}
          {success && (
            <div className="alert-success">
              {success}
            </div>
          )}

          <FormField label="Client Company">
            {loadingClients ? (
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading clients…</div>
            ) : (
              <SelectField
                value={selectedId}
                onChange={(e) => { setSelectedId(e.target.value); setError(null); }}
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

          <FormField label="Email address">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="user@company.com"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Temporary Password" hint="Share this password with the client — they can change it after first login.">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pr-10"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={onCancel}
              variant="outline"
            >
              {success ? 'Done' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              <UserPlus className="w-4 h-4" />
              {submitting ? 'Creating…' : 'Add User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

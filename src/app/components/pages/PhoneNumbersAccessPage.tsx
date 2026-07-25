import { useCallback, useEffect, useState } from 'react';
import { Phone, Plus, Trash2, Shield, Pencil, AlertCircle, User as UserIcon, X } from 'lucide-react';
import { SelectField } from '@/app/components/ui/select-field';
import { FormField } from '@/app/components/ui/form-field';
import { Button } from '@/app/components/ui/button';
import {
  listOpsNumbers,
  addOpsNumber,
  updateOpsNumber,
  deleteOpsNumber,
  listClientNumbers,
  addClientNumber,
  deleteClientNumber,
  type OpsNumber,
  type ClientNumberEntry,
} from '@/app/api/ops';

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'company_admin';
  const isClient = role === 'client';
  let cls = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  let label = 'Ops';
  if (isAdmin) {
    cls = 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    label = 'Company Admin';
  } else if (isClient) {
    cls = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    label = 'Client';
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {isClient ? <UserIcon className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
      {label}
    </span>
  );
}

function AddOpsNumberForm({
  onAdded,
  onCancel,
}: {
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ops' | 'company_admin'>('ops');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      setError('Phone number must have at least 9 digits');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addOpsNumber({ phone_number: digits, role, label: label.trim() || undefined });
      onAdded();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-muted/20">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add ops / team number
      </h3>
      {error && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Phone number" className="space-y-1">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="250788123456"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            required
          />
        </FormField>
        <div className="space-y-1">
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ops' | 'company_admin')}
              className="w-full border rounded px-3 py-2 text-sm bg-background form-input appearance-none"
            >
              <option value="ops">Ops</option>
              <option value="company_admin">Company Admin</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }}>
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </div>
        </div>
        <FormField label="Label (optional)" className="space-y-1">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Alice - ops lead"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
          />
        </FormField>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} className="text-sm">
          {saving ? 'Adding…' : 'Add number'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EditOpsNumberForm({
  number,
  onSaved,
  onCancel,
}: {
  number: OpsNumber;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState(number.role);
  const [label, setLabel] = useState(number.label ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateOpsNumber(number.id, { role, label: label.trim() || null });
      onSaved();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-muted/20">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Pencil className="w-4 h-4" />
        Edit {number.phone_number}
      </h3>
      {error && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ops' | 'company_admin')}
              className="w-full border rounded px-3 py-2 text-sm bg-background form-input appearance-none"
            >
              <option value="ops">Ops</option>
              <option value="company_admin">Company Admin</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }}>
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </div>
        </div>
        <FormField label="Label" className="space-y-1">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Alice - ops lead"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
          />
        </FormField>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} className="text-sm">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={onCancel} variant="outline" className="text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddClientNumberForm({
  onAdded,
  onCancel,
}: {
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (!name.trim()) {
      setError('Client name is required');
      return;
    }
    if (digits.length < 9) {
      setError('Phone number must have at least 9 digits');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addClientNumber({ name: name.trim(), phone_number: digits });
      onAdded();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-muted/20">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add client WhatsApp number
      </h3>
      {error && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Client name" className="space-y-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Logistics Ltd"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            required
          />
        </FormField>
        <FormField label="Phone number" className="space-y-1">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="250788123456"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            required
          />
        </FormField>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} className="text-sm">
          {saving ? 'Adding…' : 'Add client'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function OpsNumbersSection() {
  const [numbers, setNumbers] = useState<OpsNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOpsNumbers();
      setNumbers(data.numbers ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOpsNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">Ops & Team Numbers</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Team members who receive intake notifications and alerts.
          </p>
        </div>
        {!showAdd && (
          <Button onClick={() => setShowAdd(true)} className="whitespace-nowrap text-sm">
            <Plus className="w-4 h-4" />
            Add number
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto p-1 hover:bg-destructive/20 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showAdd && (
        <AddOpsNumberForm
          onAdded={() => { setShowAdd(false); load(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {loading && !numbers.length ? (
        <div className="empty-state py-8">
          <div className="animate-pulse"><div className="w-6 h-6 rounded-full loading-pulse"></div></div>
          <p className="empty-title text-sm">Loading numbers</p>
        </div>
      ) : numbers.length === 0 ? (
        <div className="empty-state py-8">
          <Phone className="w-6 h-6 opacity-40" />
          <p className="empty-title text-sm">No team numbers configured</p>
          <p className="empty-sub text-xs">Add an ops team member's WhatsApp number to receive alerts.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Phone number</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Label</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((num) => (
                <tr key={num.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3"><code className="text-sm">+{num.phone_number}</code></td>
                  <td className="px-4 py-3"><RoleBadge role={num.role} /></td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{num.label || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === num.id ? (
                        <EditOpsNumberForm
                          number={num}
                          onSaved={() => { setEditingId(null); load(); }}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          <button type="button" onClick={() => setEditingId(num.id)} className="p-1.5 rounded hover:bg-muted/50" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDelete(num.id)} disabled={deletingId === num.id} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete">
                            {deletingId === num.id ? (
                              <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClientNumbersSection() {
  const [numbers, setNumbers] = useState<ClientNumberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listClientNumbers();
      setNumbers(data.numbers ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteClientNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">Client Phone Numbers</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Registered clients who can send documents and use AI conversation via WhatsApp.
          </p>
        </div>
        {!showAdd && (
          <Button onClick={() => setShowAdd(true)} className="whitespace-nowrap text-sm">
            <Plus className="w-4 h-4" />
            Add client
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto p-1 hover:bg-destructive/20 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showAdd && (
        <AddClientNumberForm
          onAdded={() => { setShowAdd(false); load(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {loading && !numbers.length ? (
        <div className="empty-state py-8">
          <div className="animate-pulse"><div className="w-6 h-6 rounded-full loading-pulse"></div></div>
          <p className="empty-title text-sm">Loading clients</p>
        </div>
      ) : numbers.length === 0 ? (
        <div className="empty-state py-8">
          <UserIcon className="w-6 h-6 opacity-40" />
          <p className="empty-title text-sm">No client phone numbers registered</p>
          <p className="empty-sub text-xs">Add a client's WhatsApp number so the system recognizes their documents and messages.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Client name</th>
                <th className="text-left px-4 py-3 font-medium">Phone number</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((num) => (
                <tr key={num.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{num.name}</td>
                  <td className="px-4 py-3"><code className="text-sm">{num.whatsapp_phone}</code></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(num.id)}
                      disabled={deletingId === num.id}
                      className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                      title="Remove number"
                    >
                      {deletingId === num.id ? (
                        <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PhoneNumbersAccessPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <OpsNumbersSection />
      <hr style={{ borderColor: 'var(--border)' }} />
      <ClientNumbersSection />
    </div>
  );
}

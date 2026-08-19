import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, Loader2, Save } from 'lucide-react';
import { getOpsMe, updateOpsTenant } from '@/app/api/ops';
import { FormField } from '@/app/components/ui/form-field';
import { Button } from '@/app/components/ui/button';

export function GeneralSettingsPage() {
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getOpsMe();
      setCompanyName(me.tenant?.company_name ?? '');
      setCountry(me.tenant?.country ?? '');
      setCurrency(me.tenant?.currency ?? '');
      setLogoUrl(me.tenant?.logo_url ?? '');
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    const cur = currency.trim().toUpperCase();
    if (cur && !/^[A-Z]{3}$/.test(cur)) {
      setError('Currency must be a 3-letter code (e.g. RWF, USD).');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateOpsTenant({
        company_name: companyName.trim(),
        country: country.trim() || undefined,
        currency: cur || undefined,
        logo_url: logoUrl.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h2 className="text-base font-medium">Workspace identity</h2>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Company details shown across the workspace. These also drive onboarding
        readiness.
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-300 text-sm mb-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Workspace identity saved.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Company name" className="space-y-1">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. InDataFlow Ltd"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            required
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Country" className="space-y-1">
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Rwanda"
              className="w-full border rounded px-3 py-2 text-sm bg-background"
            />
          </FormField>
          <FormField label="Currency (3-letter code)" className="space-y-1">
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="e.g. RWF"
              maxLength={3}
              className="w-full border rounded px-3 py-2 text-sm bg-background uppercase"
            />
          </FormField>
        </div>

        <FormField label="Logo URL (optional)" className="space-y-1">
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            className="w-full border rounded px-3 py-2 text-sm bg-background"
          />
        </FormField>

        <div className="pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
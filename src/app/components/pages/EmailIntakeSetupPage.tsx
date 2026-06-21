
import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Mail,
  Printer,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Forward,
} from 'lucide-react';
import { SelectField } from '@/app/components/ui/select-field';
import { Button } from '@/app/components/ui/button';
import {
  getEmailIntakeSetup,
  patchEmailIntakeClientBillingEmail,
  testEmailIntakeRoute,
  type EmailIntakeSetupGuide,
} from '@/app/api/ops';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border hover:bg-muted/50"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label ?? 'Copy'}
    </button>
  );
}

function EmailTemplateBlock({
  title,
  description,
  template,
}: {
  title: string;
  description?: string;
  template: { subject: string; body: string };
}) {
  return (
    <div className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
      </div>
      <div className="flex gap-2 items-start">
        <p className="text-sm flex-1">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Subject: </span>
          {template.subject}
        </p>
        <CopyButton text={template.subject} label="Subject" />
      </div>
      <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded max-h-40 overflow-auto">{template.body}</pre>
      <CopyButton text={`Subject: ${template.subject}\n\n${template.body}`} label="Copy full email" />
    </div>
  );
}

function printHtml(html: string | undefined, onError: (msg: string) => void) {
  if (!html) return;
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    onError('Allow pop-ups to print the PDF.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function EmailIntakeSetupPage() {
  const [guide, setGuide] = useState<EmailIntakeSetupGuide | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    billing: false,
    teamBriefed: false,
    clientLetter: false,
    packet: false,
  });

  const load = useCallback(async (clientId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmailIntakeSetup(clientId || undefined);
      setGuide(data);
      if (data.selected_client) {
        setBillingEmail(data.selected_client.billing_email ?? '');
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selectedClientId || undefined);
  }, [load, selectedClientId]);

  const handleSaveBilling = async () => {
    if (!selectedClientId || !billingEmail.includes('@')) {
      setError('Select a client and enter a valid billing email.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await patchEmailIntakeClientBillingEmail(selectedClientId, billingEmail.trim().toLowerCase());
      setChecklist((c) => ({ ...c, billing: true }));
      await load(selectedClientId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const handleTestRoute = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await testEmailIntakeRoute(
        selectedClientId || undefined,
        billingEmail.trim() || undefined,
      );
      const clientMatched = Boolean((res.route as any)?.client_id);
      setTestResult(
        clientMatched
          ? `Route OK — tenant ${(res.route as any).tenant_subdomain}, client ${(res.route as any).client_name}`
          : `Tenant OK — client not matched (set billing_email). ${res.hint}`,
      );
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setTesting(false);
    }
  };

  const selected = guide?.selected_client;

  if (loading && !guide) {
    return (
      <div className="empty-state">
        <div className="animate-pulse">
          <div className="w-6 h-6 rounded-full loading-pulse"></div>
        </div>
        <p className="empty-title">Loading setup</p>
        <p className="empty-sub">Preparing email intake configuration…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="page-title">Email Intake Setup</h1>
        <p className="page-desc mt-2">
          Forward client emails with attachments to the intake address below. No client-side IT setup required.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {guide && (
        <>
          <section className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Forward className="w-4 h-4" />
              Document intake address
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {guide.tenant_name ?? 'Your company'} — forward client emails here
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-sm bg-background border px-3 py-2 rounded flex-1 min-w-[200px]">
                {guide.forward_to}
              </code>
              <CopyButton text={guide.forward_to} label="Copy address" />
            </div>
            <ol className="text-sm list-decimal pl-5 space-y-1 opacity-90">
              {(guide.ops_forward_steps ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border p-4 space-y-4">
            <h2 className="text-sm font-medium">Per client</h2>
            <SelectField
              className="max-w-md"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">— Select client —</option>
              {(guide.clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.billing_email ? ` (${c.billing_email})` : ''}
                </option>
              ))}
            </SelectField>

            {selectedClientId && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Client sender email (for matching)</label>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  The address this client normally uses when they email you — usually the From on their invoices.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    className="flex-1 min-w-[220px] border rounded px-3 py-2 text-sm"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="finance@client.com"
                  />
                  <Button
                    disabled={saving}
                    onClick={handleSaveBilling}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {selected && (
            <>
              <section className="rounded-lg border p-4 space-y-3">
                <h2 className="text-sm font-medium">Professional materials</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      printHtml(selected.client_packet_html, setError);
                      setChecklist((c) => ({ ...c, packet: true }));
                    }}
                  >
                    <Printer className="w-4 h-4" />
                    Print ops guide (PDF)
                  </Button>
                  <Button
                    onClick={() => printHtml(selected.packet_html, setError)}
                    variant="outline"
                  >
                    <Printer className="w-4 h-4" />
                    Print full guide (+ IT optional)
                  </Button>
                  <Button
                    disabled={testing}
                    onClick={handleTestRoute}
                    variant="outline"
                  >
                    <Send className="w-4 h-4" />
                    {testing ? 'Testing…' : 'Test matching'}
                  </Button>
                  <Button
                    onClick={() => load(selectedClientId)}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
                {testResult && <p className="text-sm text-green-700 dark:text-green-400">{testResult}</p>}
              </section>

              <section className="rounded-lg border p-4 space-y-1">
                <h2 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4" />
                  Copy-paste emails
                </h2>
                <EmailTemplateBlock
                  title="1. Email to your operations team"
                  description="Internal SOP — how to forward this client's documents."
                  template={selected.ops_sop_email}
                />
                <EmailTemplateBlock
                  title="2. Email to the client (importer)"
                  description="Professional notice — what to send and how you process it. Send once per new client."
                  template={selected.client_letter_email}
                />
                <EmailTemplateBlock
                  title="3. Email to client IT (optional)"
                  description="Only if they want automatic forwarding without manual steps."
                  template={selected.it_email_template}
                />
              </section>
            </>
          )}

          <section className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-medium">Rollout checklist</h2>
            <ul className="space-y-2 text-sm">
              {[
                { key: 'billing' as const, label: 'Sender email saved for this client' },
                { key: 'teamBriefed' as const, label: 'Ops team briefed (forward to intake address)' },
                { key: 'clientLetter' as const, label: 'Client letter sent (optional but professional)' },
                { key: 'packet' as const, label: 'Ops guide printed or shared internally' },
              ].map(({ key, label }) => (
                <li key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={(e) => setChecklist((c) => ({ ...c, [key]: e.target.checked }))}
                    className="rounded"
                  />
                  {checklist[key] ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border" />
                  )}
                  {label}
                </li>
              ))}
            </ul>
            <p className="text-xs pt-2" style={{ color: 'var(--text-tertiary)' }}>
              Backend: inbound {guide.pipeline.inbound_enabled ? 'on' : 'off'} · {guide.webhook_url_hint}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

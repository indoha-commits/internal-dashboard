import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { confirmTenantPayment, getTenantBilling, type TenantBillingResponse } from '@/app/api/ops';
import { Button } from '@/app/components/ui/button';
import { FormField } from '@/app/components/ui/form-field';

type StatusBadgeProps = {
  status: string;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const tone =
    status === 'completed'
      ? { bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-300' }
      : status === 'pending_confirmation'
        ? { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300' }
        : status === 'failed'
          ? { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-300' }
          : { bg: 'bg-sky-500/10', text: 'text-sky-700 dark:text-sky-300' };

  const label = status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${tone.bg} ${tone.text}`}>
      {label}
    </span>
  );
}

function fmtMoney(amount: number, currency: string) {
  return `${currency} ${Number(amount || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function ConfirmPaymentForm({ intent, onDone }: { intent: TenantBillingResponse['payment_intents'][number]; onDone: () => void }) {
  const [txId, setTxId] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txId.trim()) {
      setError('Enter the MoMo transaction ID from your payment app.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await confirmTenantPayment({
        payment_intent_id: intent.id,
        momo_transaction_id: txId.trim(),
        payer_phone: payerPhone.trim() || undefined,
      });
      setOk(true);
      setTimeout(onDone, 1200);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
      <FormField label="MoMo transaction ID" className="space-y-1">
        <input
          type="text"
          value={txId}
          onChange={(e) => setTxId(e.target.value)}
          placeholder="e.g. MTN-TX-1234567890"
          className="w-full border rounded px-3 py-2 text-sm bg-background"
          required
        />
      </FormField>
      <FormField label="Payer phone (optional)" className="space-y-1">
        <input
          type="tel"
          value={payerPhone}
          onChange={(e) => setPayerPhone(e.target.value)}
          placeholder="e.g. 250788123456"
          className="w-full border rounded px-3 py-2 text-sm bg-background"
        />
      </FormField>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Payment submitted. A platform operator will verify it shortly.
        </div>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {submitting ? 'Submitting…' : 'Confirm payment'}
      </Button>
    </form>
  );
}

export function BillingPage() {
  const [data, setData] = useState<TenantBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTenantBilling();
      setData(res);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  const payee = data?.settings;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-desc mt-2">Pay your setup invoice via MTN MoMo and track payment status</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {payee && (
        <div className="rounded-lg border p-4 mb-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-base font-medium">MTN MoMo payee</h2>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Send the amount to the MoMo number below and keep your transaction ID.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Payee number</div>
              <div className="font-mono text-base">{payee.payee_number}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Setup fee</div>
              <div className="font-mono text-base">{fmtMoney(payee.setup_fee_amount, payee.currency)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Currency</div>
              <div className="font-mono text-base">{payee.currency}</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-medium">Payments</h2>
        {!data?.payment_intents?.length ? (
          <div className="rounded-lg border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            No payments yet.
          </div>
        ) : (
          data.payment_intents.map((intent) => (
            <div key={intent.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-sky-700 dark:text-sky-300">{intent.id.slice(0, 8)}</span>
                    <StatusBadge status={intent.status} />
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    {fmtMoney(intent.amount, intent.currency)}
                    {intent.momo_reference && (
                      <span className="ml-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>REF {intent.momo_reference}</span>
                    )}
                  </div>
                  {intent.momo_transaction_id && (
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      MoMo transaction: <span className="font-mono">{intent.momo_transaction_id}</span>
                    </div>
                  )}
                </div>
                {intent.pay_url && (
                  <a
                    href={intent.pay_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-sky-700 dark:text-sky-300 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" /> Open payment page
                  </a>
                )}
              </div>

              {intent.status !== 'completed' && intent.status !== 'failed' && (
                <div className="mt-4 flex flex-col sm:flex-row gap-6">
                  {intent.qr_svg && (
                    <div className="shrink-0">
                      <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <QrCode className="w-4 h-4" /> Scan to pay
                      </div>
                      <img
                        src={intent.qr_svg}
                        alt="MoMo payment QR code"
                        className="rounded-lg border"
                        style={{ borderColor: 'var(--border)', width: 160, height: 160 }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <ConfirmPaymentForm intent={intent} onDone={refresh} />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 mt-8">
        <h2 className="text-base font-medium">Invoices</h2>
        {!data?.invoices?.length ? (
          <div className="rounded-lg border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            No invoices.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-2 font-medium">Invoice</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-2 capitalize">{inv.invoice_type}</td>
                    <td className="px-4 py-2">{fmtMoney(inv.amount, inv.currency)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={inv.status === 'paid' ? 'completed' : inv.status} />
                    </td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
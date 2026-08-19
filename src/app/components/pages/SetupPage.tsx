import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { getOpsMe, completeTenantSetup, type OpsMeResponse } from '@/app/api/ops';
import { Button } from '@/app/components/ui/button';
import { EmailIntakeSetupPage } from './EmailIntakeSetupPage';
import { PhoneNumbersAccessPage } from './PhoneNumbersAccessPage';

type StepStatus = 'done' | 'todo';

type StepDef = {
  id: string;
  title: string;
  description: string;
  icon: typeof Mail;
  status: StepStatus;
};

function StepCard({
  step,
  defaultOpen,
  children,
}: {
  step: StepDef;
  defaultOpen: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = step.icon;
  const done = step.status === 'done';

  return (
    <section className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span
          className={`mt-0.5 shrink-0 ${done ? 'text-green-600' : 'text-muted-foreground'}`}
        >
          {done ? <CheckCircle2 className="w-5 h-5" /> : <CircleDashed className="w-5 h-5" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium">{step.title}</span>
          </span>
          <span className="block text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {step.description}
          </span>
        </span>
        <ArrowRight
          className={`w-4 h-4 mt-1 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>
      {open && <div className="border-t px-4 py-4">{children}</div>}
    </section>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<OpsMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOpsMe();
      setMe(res);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const readiness = me?.readiness;
  const tenant = me?.tenant;

  const steps = useMemo<StepDef[]>(() => {
    if (!readiness) return [];
    return [
      {
        id: 'workspace',
        title: 'Workspace identity',
        description: tenant?.company_name
          ? `${tenant.company_name} · ${tenant.country ?? ''} · ${tenant.currency ?? ''}`
          : 'Company name, country and currency for your workspace.',
        icon: ShieldCheck,
        status: readiness.workspace ? 'done' : 'todo',
      },
      {
        id: 'email-intake',
        title: 'Email intake',
        description: readiness.email_intake
          ? `Configured on ${readiness.intake_email_alias}`
          : 'Route your clients’ documents into the system by email.',
        icon: Mail,
        status: readiness.email_intake ? 'done' : 'todo',
      },
      {
        id: 'phone-access',
        title: 'WhatsApp access',
        description: readiness.phone_access
          ? 'At least one authorized number configured.'
          : 'Authorize your ops WhatsApp number to receive intake alerts.',
        icon: Phone,
        status: readiness.phone_access ? 'done' : 'todo',
      },
      {
        id: 'team',
        title: 'Team & logins',
        description:
          readiness.team && readiness.manager_count > 0
            ? `${readiness.manager_count} manager login${readiness.manager_count === 1 ? '' : 's'}`
            : 'Add a manager login so your team can run the dashboard.',
        icon: UserRound,
        status: readiness.team ? 'done' : 'todo',
      },
    ];
  }, [readiness, tenant]);

  const ready = Boolean(readiness?.ready);

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);
    try {
      await completeTenantSetup();
      setDone(true);
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setCompleting(false);
    }
  };

  if (done) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Set up your workspace</h1>
        <p className="page-desc mt-2">
          A few quick steps to get {tenant?.company_name ?? 'your tenant'} ready. You can
          finish these later from Settings.
        </p>
      </div>

      {loading && !me && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}

      {error && !me && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-4 text-sm">
          {error}
        </div>
      )}

      {me && (
        <>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <StepCard key={step.id} step={step} defaultOpen={step.status === 'todo'}>
                {step.id === 'email-intake' ? (
                  <EmailIntakeSetupPage />
                ) : step.id === 'phone-access' ? (
                  <PhoneNumbersAccessPage />
                ) : step.id === 'workspace' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Company name</p>
                      <p className="mt-1 font-medium">{tenant?.company_name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Country</p>
                      <p className="mt-1 font-medium">{tenant?.country ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Currency</p>
                      <p className="mt-1 font-medium">{tenant?.currency ?? '—'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {readiness?.manager_count ?? 0} manager and {readiness?.ops_count ?? 0} ops
                    login{readiness && (readiness.manager_count + readiness.ops_count) === 1 ? '' : 's'} for this tenant.
                    Add another manager from the admin portal to expand your team.
                  </p>
                )}
              </StepCard>
            ))}
          </div>

          <div className="rounded-lg border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between bg-muted/20">
            <div className="text-sm">
              <p className="font-medium">{ready ? 'Everything is ready' : 'Still a few steps to go'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {ready
                  ? 'Your workspace is fully configured. Finish setup to open the dashboard.'
                  : 'You can complete the remaining steps now or later from Settings.'}
              </p>
            </div>
            <Button onClick={handleComplete} disabled={completing}>
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finishing…
                </>
              ) : (
                <>
                  {ready ? 'Finish setup' : 'Skip for now'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-4 text-sm">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

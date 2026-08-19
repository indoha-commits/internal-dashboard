import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getOpsMe } from '@/app/api/ops';

/**
 * Phase 4 — first-login redirect.
 *
 * Until a tenant is operationally ready AND the manager has explicitly
 * finished/skipped the guided setup, land on /setup instead of the dashboard.
 *
 * The check re-runs on every navigation so completing setup can escape to
 * /dashboard. Only the FIRST check blocks rendering with a spinner; later
 * re-checks render the current page (no stale redirects while in flight).
 */
export function TenantSetupGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<{
    inFlight: boolean;
    needsSetup: boolean;
    showSpinner: boolean;
  }>({ inFlight: true, needsSetup: false, showSpinner: true });

  useEffect(() => {
    let cancelled = false;

    setState((prev) => ({
      ...prev,
      inFlight: true,
      showSpinner: prev.showSpinner && prev.inFlight,
    }));

    getOpsMe()
      .then((me) => {
        if (cancelled) return;
        const needsSetup =
          !me.readiness.ready && !me.onboarding.walkthrough_done;
        setState({ inFlight: false, needsSetup, showSpinner: false });
      })
      .catch(() => {
        // Auth/network errors must never lock the user out of the dashboard.
        if (cancelled) return;
        setState({ inFlight: false, needsSetup: false, showSpinner: false });
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const page = location.pathname.replace(/^\//, '');

  if (state.showSpinner && state.inFlight) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!state.inFlight && state.needsSetup && page !== 'setup') {
    return <Navigate to="/setup" replace />;
  }

  if (!state.inFlight && !state.needsSetup && page === 'setup') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
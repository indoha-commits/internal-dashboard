import { useEffect, useState } from 'react';
import { useToast } from '@/app/hooks/useToast';
import { sessionStore } from './sessionStore';

export function AuthGateInternal({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {

    let unsub: (() => void) | undefined;
    let cleanupSession: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        const { initSupabaseAuth, setSessionFromUrlHash } = await import('./supabase');
        const { claimInternalSession, heartbeatInternalSession, releaseInternalSession } = await import('../api/ops');

        if (window.location.hash?.includes('access_token=')) {
          try {
            await setSessionFromUrlHash();
            const cb = window.location.pathname.indexOf('/auth/callback');
            const next = cb === -1 ? window.location.pathname : window.location.pathname.slice(0, cb) || '/';
            window.history.replaceState({}, document.title, next);
            window.location.hash = '';
          } catch (e) {
            console.warn('Failed to set session from hash', e);
          }
        }

        if (!mounted) return;

        try {
          const existing = sessionStore.getId();
          const sessionId = existing || crypto.randomUUID();
          if (!existing) sessionStore.setId(sessionId);

          let claimed = false;
          const claim = async () => {
            try {
              const result = await claimInternalSession(sessionId);
              if (!result.ok) {
                claimed = false;
                const until = result.expires_at ? new Date(result.expires_at).toLocaleTimeString() : null;
                setLockMessage(until ? `${result.detail} Retry after ${until}.` : result.detail);
                return;
              }
              claimed = true;
              setLockMessage(null);
            } catch {
              claimed = false;
              toast({ type: 'warning', message: 'Unable to claim the internal session' });
            }
          };

          unsub = await initSupabaseAuth(claim);
          const interval = window.setInterval(() => {
            if (!claimed) return;
            void heartbeatInternalSession(sessionId).catch(() => {
              claimed = false;
              setLockMessage('This internal session expired. Reload to claim it again.');
            });
          }, 5 * 60 * 1000);
          const releaseOnPageHide = () => {
            if (claimed) void releaseInternalSession(sessionId);
          };
          window.addEventListener('pagehide', releaseOnPageHide);

          cleanupSession = () => {
            window.clearInterval(interval);
            window.removeEventListener('pagehide', releaseOnPageHide);
          };
          mounted && setReady(true);
        } catch (e) {
          toast({ type: 'warning', message: 'Auth init failed' });
          mounted && setReady(true);
        }
      } catch {
        mounted && setReady(true);
      }
    })();

    return () => {
      mounted = false;
      cleanupSession?.();
      unsub?.();
    };
  }, []);

  if (!ready) return null;
  if (lockMessage) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <section className="w-full max-w-md border border-default rounded-lg bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Internal session in use</h1>
          <p className="mt-2 text-sm text-muted-foreground">{lockMessage}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded border border-default px-3 py-2 text-sm hover:bg-muted">Retry</button>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}

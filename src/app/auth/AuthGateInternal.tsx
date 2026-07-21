import { useEffect, useState } from 'react';
import { useToast } from '@/app/hooks/useToast';
import { sessionStore } from './sessionStore';

export function AuthGateInternal({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {

    let unsub: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        const { initSupabaseAuth, setSessionFromUrlHash } = await import('./supabase');
        const { claimInternalSession, heartbeatInternalSession } = await import('../api/ops');

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

          unsub = await initSupabaseAuth(async () => {
            try {
              const result = await claimInternalSession(sessionId);
              if ('ok' in result && !result.ok && result.error === 'session_locked') {
                toast({ type: 'error', message: result.detail || 'Session locked by another session' });
              }
            } catch (e) {
              toast({ type: 'warning', message: 'Failed to claim internal session' });
            }
          });

          const interval = window.setInterval(() => {
            void heartbeatInternalSession(sessionId).catch(() =>
              toast({ type: 'warning', message: 'Heartbeat failed — session may expire' })
            );
          }, 5 * 60 * 1000);

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
      unsub?.();
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

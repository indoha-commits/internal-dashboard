import { getAccessToken } from '../auth/supabase';
import {
  USE_MOCK_DATA,
  MOCK_DASHBOARD,
  MOCK_PENDING_DOCUMENTS,
  MOCK_VALIDATION_QUEUE,
  MOCK_CARGO_REGISTRY,
  MOCK_CLIENTS,
  MOCK_REQUESTS,
  MOCK_CARGO_TIMELINE,
  MOCK_ACTIVITY_LOG,
  MOCK_ME,
  MOCK_SIGNED_URL,
} from './mock';

const workersEnabled = import.meta.env.VITE_WORKERS_ENABLED !== 'false';

export function getBaseUrl(): string {
  const baseUrl = (import.meta.env.VITE_MT_API_BASE_URL || import.meta.env.VITE_API_BASE_URL) as string | undefined;
  if (!baseUrl) throw new Error('VITE_API_BASE_URL is not set');
  return baseUrl.replace(/\/+$/, '');
}

function resolveTenantSubdomain(): string | undefined {
  const envTenant = import.meta.env.VITE_MT_TENANT_SUBDOMAIN as string | undefined;
  if (envTenant) return envTenant;
  if (typeof window === 'undefined') return undefined;
  const match = window.location.pathname.match(/^\/t\/([^/]+)/i);
  if (match?.[1]) return match[1];
  const host = window.location.hostname;
  if (!host || host === 'localhost') return undefined;
  const parts = host.split('.').filter(Boolean);
  if (parts.length > 3) return parts[0];
  return undefined;
}

export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  const h: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  const tenantSubdomain = resolveTenantSubdomain();
  if (tenantSubdomain) {
    h['x-mt-tenant-slug'] = tenantSubdomain;
    h['x-mt-tenant-subdomain'] = tenantSubdomain;
  }
  if (!token) console.warn('Missing access token for API request');
  return h;
}

function getAuthPortalUrl(): string {
  const url = import.meta.env.VITE_AUTH_PORTAL_URL as string | undefined;
  if (!url) throw new Error('Missing required env var: VITE_AUTH_PORTAL_URL');
  return url;
}

function redirectToLogin(): void {
  window.location.href = getAuthPortalUrl();
}

function mockResponse<T>(path: string): T | null {
  if (!USE_MOCK_DATA) return null;
  if (path === '/ops/dashboard') return MOCK_DASHBOARD as T;
  if (path === '/ops/pending-documents') return MOCK_PENDING_DOCUMENTS as T;
  if (path === '/ops/validation-queue') return MOCK_VALIDATION_QUEUE as T;
  if (path === '/ops/cargo-registry') return MOCK_CARGO_REGISTRY as T;
  if (path === '/ops/clients') return MOCK_CLIENTS as T;
  if (path === '/ops/requests') return MOCK_REQUESTS as T;
  if (path.startsWith('/ops/cargo-timeline/')) return MOCK_CARGO_TIMELINE as T;
  if (path === '/me') return MOCK_ME as T;
  if (path.startsWith('/ops/documents/') && path.endsWith('/signed-url')) return MOCK_SIGNED_URL as T;
  if (path.startsWith('/ops/approvals/') && path.endsWith('/signed-url')) return MOCK_SIGNED_URL as T;
  if (path === '/ops/activity-log') return MOCK_ACTIVITY_LOG as T;
  return null;
}

export async function fetchJson<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const mock = mockResponse<T>(path);
  if (mock) return mock;

  if (USE_MOCK_DATA) {
    // Return empty success for any mutation not explicitly mocked
    return { ok: true } as T;
  }

  if (!workersEnabled) throw new Error('API is disabled (VITE_WORKERS_ENABLED=false)');

  const url = `${getBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  const timeoutMs = init?.timeoutMs ?? 20000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...getAuthHeader(),
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${text}`);
    }

    return (await res.json()) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}



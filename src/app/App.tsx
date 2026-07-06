import { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/app/components/Sidebar';
import { OpsSidebarContent } from '@/app/components/OpsSidebarContent';
import { getSupabase } from '@/app/auth/supabase';
import { sessionStore } from '@/app/auth/sessionStore';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import { useThemeToggle } from '@/app/hooks/useThemeToggle';
import { DashboardPage } from '@/app/components/pages/DashboardPage';
import { PendingDocumentsPage } from '@/app/components/pages/PendingDocumentsPage';
import { ValidationPage } from '@/app/components/pages/ValidationPage';
import { RequestValidationPage } from '@/app/components/pages/RequestValidationPage';
import { ImportCargoPage } from '@/app/components/pages/ImportCargoPage';
import { CargoTimelinePage } from '@/app/components/pages/CargoTimelinePage';
import { CargoRegistryPage } from '@/app/components/pages/CargoRegistryPage';
import { CreateClientPage } from '@/app/components/pages/CreateClientPage';
import { DeleteClientPage } from '@/app/components/pages/DeleteClientPage';
import { AddClientUserPage } from '@/app/components/pages/AddClientUserPage';
import { ActivityLogPage } from '@/app/components/pages/ActivityLogPage';
import { OperationsUpdatePage } from '@/app/components/pages/OperationsUpdatePage';
import { WhatsAppNumbersPage } from '@/app/components/pages/WhatsAppNumbersPage';
import { fetchJson } from '@/app/api/client';

type OpsPageId =
  | 'dashboard'
  | 'pending-documents'
  | 'validation-requests'
  | 'validation'
  | 'operations-update'
  | 'import-cargo'
  | 'cargo-timeline'
  | 'cargo-registry'
  | 'create-client'
  | 'delete-client'
  | 'add-client-user'
  | 'activity-log'

  | 'whatsapp-numbers'
  | 'settings';

const pageToPath: Record<OpsPageId, string> = {
  dashboard: '',
  'pending-documents': 'pending-documents',
  'validation-requests': 'validation-requests',
  validation: 'validation',
  'operations-update': 'operations-update',
  'import-cargo': 'import-cargo',
  'cargo-timeline': 'cargo-timeline',
  'cargo-registry': 'cargo-registry',
  'create-client': 'create-client',
  'delete-client': 'delete-client',
  'add-client-user': 'add-client-user',
  'activity-log': 'activity-log',
  'whatsapp-numbers': 'whatsapp-numbers',
  settings: 'settings',
};

const pathToPage: Record<string, OpsPageId> = {
  '': 'dashboard',
  'pending-documents': 'pending-documents',
  'validation-requests': 'validation-requests',
  validation: 'validation',
  'operations-update': 'operations-update',
  'import-cargo': 'import-cargo',
  'cargo-timeline': 'cargo-timeline',
  'cargo-registry': 'cargo-registry',
  'create-client': 'create-client',
  'delete-client': 'delete-client',
  'add-client-user': 'add-client-user',
  'activity-log': 'activity-log',
  'whatsapp-numbers': 'whatsapp-numbers',
  settings: 'settings',
};

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

function requireEnv(name: string): string {
  const v = (import.meta.env as any)[name] as string | undefined;
  if (!v && !USE_MOCK_DATA) throw new Error(`Missing required env var: ${name}`);
  return v ?? '';
}

const authPortalUrl = requireEnv('VITE_AUTH_PORTAL_URL');

function useOpsRouteState() {
  const navigate = useNavigate();
  const location = useLocation();

  const pageSlug = location.pathname.replace(/^\//, '');
  const normalizedPage = pageSlug && pageSlug in pathToPage ? (pageSlug as OpsPageId) : 'dashboard';
  const currentPage = pathToPage[normalizedPage] ?? 'dashboard';

  const setCurrentPage = (page: OpsPageId) => {
    const pagePath = pageToPath[page];
    const target = `/${pagePath}`.replace(/\/+$/, '') || '/';
    if (target === location.pathname) return;
    navigate(target);
  };

  return { currentPage, setCurrentPage };
}

function OpsPageRenderer({
  currentPage,
  setCurrentPage,
}: {
  currentPage: OpsPageId;
  setCurrentPage: (page: OpsPageId) => void;
}) {
  const [selectedCargoId, setSelectedCargoId] = useState('');
  const [newlyCreatedClient, setNewlyCreatedClient] = useState<{ id: string; name: string } | null>(null);

  const handleViewTimeline = (cargoId: string) => {
    setSelectedCargoId(cargoId);
    setCurrentPage('cargo-timeline');
  };

  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage />;
    case 'pending-documents':
      return <PendingDocumentsPage />;
    case 'validation-requests':
      return <RequestValidationPage />;
    case 'validation':
      return <ValidationPage />;
    case 'import-cargo':
      return <ImportCargoPage />;
    case 'cargo-timeline':
      return <CargoTimelinePage preselectedCargoId={selectedCargoId} />;
    case 'cargo-registry':
      return (
        <CargoRegistryPage
          onViewTimeline={handleViewTimeline}
          onCreateClient={() => setCurrentPage('create-client')}
          onDeleteClient={() => setCurrentPage('delete-client')}
          onAddClientUser={() => setCurrentPage('add-client-user')}
          autoOpenNewCargoWithClient={newlyCreatedClient}
          onAutoOpenConsumed={() => setNewlyCreatedClient(null)}
        />
      );
    case 'create-client':
      return (
        <CreateClientPage
          onCancel={() => setCurrentPage('cargo-registry')}
          onCreated={(client) => {
            setNewlyCreatedClient(client);
            setCurrentPage('cargo-registry');
          }}
        />
      );
    case 'delete-client':
      return (
        <DeleteClientPage
          onCancel={() => setCurrentPage('cargo-registry')}
          onDeleted={() => setCurrentPage('cargo-registry')}
        />
      );
    case 'add-client-user':
      return (
        <AddClientUserPage
          onCancel={() => setCurrentPage('cargo-registry')}
          onDone={() => setCurrentPage('cargo-registry')}
        />
      );
    case 'activity-log':
      return <ActivityLogPage />;
    case 'operations-update':
      return <OperationsUpdatePage />;
case 'whatsapp-numbers':
      return <WhatsAppNumbersPage />;
    case 'settings':
      return <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="page-title">Settings</h1>
          <p className="page-desc mt-2">Account and application preferences</p>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Settings page coming soon.</p>
      </div>;
    default:
      return <DashboardPage />;
  }
}

export default function App() {
  const [dataSourceConnected, setDataSourceConnected] = useState<boolean | null>(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useThemeToggle();
  const { currentPage, setCurrentPage } = useOpsRouteState();
  const currentPageMemo = useMemo(() => currentPage, [currentPage]);

  useEffect(() => {
    // External data sources disabled; skip checks
    setDataSourceConnected(true);
  }, []);

  // Gate: show data source setup until connected
  if (dataSourceConnected === false) {
    // External data sources disabled; skip setup
    return null;
  }

  if (dataSourceConnected === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const handleLogout = async () => {
    try {
      // Release internal session lock (best-effort)
      const sessionId = sessionStore.getId();
      if (sessionId) {
        try {
          const { releaseInternalSession } = await import('@/app/api/ops');
          await releaseInternalSession(sessionId);
        } catch (e) {
          console.warn('Failed to release internal session lock', e);
        }
      }

      const sb = getSupabase();
      await sb.auth.signOut();
    } finally {
      window.location.href = authPortalUrl;
    }
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Desktop sidebar */}
      <Sidebar
        currentPage={currentPageMemo}
        onPageChange={(page) => setCurrentPage(page as OpsPageId)}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Mobile top bar */}
      <div
        className="md:hidden sticky top-0 z-40 border-b px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex items-center justify-center w-10 h-10 rounded border"
          style={{ borderColor: 'var(--border)' }}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1 flex items-center">
          <img src="/indataflow-logo.png" alt="InDataFlow" className="h-8 w-auto brightness-0 invert" />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="topbar-btn"
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>

      {/* Mobile nav drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 overflow-y-auto" style={{ backgroundColor: 'var(--sidebar)' }}>
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation menu</SheetTitle>
            <SheetDescription>Operations dashboard pages</SheetDescription>
          </SheetHeader>
          <OpsSidebarContent
            currentPage={currentPageMemo}
            onPageChange={(page) => setCurrentPage(page as OpsPageId)}
            onLogout={handleLogout}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 px-4 py-4 sm:px-6 sm:py-6 md:px-12 md:py-10">
        <div className="hidden md:flex justify-end items-center gap-3 mb-6">
          <button
            type="button"
            onClick={toggleTheme}
            className="topbar-btn"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/:pageSlug"
            element={<OpsPageRenderer key={currentPageMemo} currentPage={currentPageMemo} setCurrentPage={setCurrentPage} />}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

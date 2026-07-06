import { useState } from 'react';
import { FileText, LayoutDashboard, Clock, Package, Activity, CheckSquare, DownloadCloud, LogOut, ClipboardCheck, Inbox, Phone, Settings, ChevronUp } from 'lucide-react';
import { sessionStore } from '@/app/auth/sessionStore';

interface OpsSidebarContentProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  onNavigate?: () => void;
}

type NavGroup = {
  label: string;
  items: Array<{ id: string; label: string; icon: React.ElementType }>;
};

const navGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pending-documents', label: 'Pending Documents', icon: FileText },
      { id: 'validation-requests', label: 'Validation Requests', icon: Inbox },
      { id: 'validation', label: 'Validation Queue', icon: CheckSquare },
      { id: 'operations-update', label: 'Operations Update', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Cargo',
    items: [
      { id: 'cargo-registry', label: 'Cargo Registry', icon: Package },
      { id: 'cargo-timeline', label: 'Cargo Timeline', icon: Clock },
      { id: 'import-cargo', label: 'Import Cargo', icon: DownloadCloud },
    ],
  },
  {
    label: 'Tools',
    items: [

      { id: 'whatsapp-numbers', label: 'WhatsApp Numbers', icon: Phone },
      { id: 'activity-log', label: 'Activity Log', icon: Activity },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

function NavButton({
  item,
  currentPage,
  onPageChange,
  onNavigate,
}: {
  item: NavGroup['items'][number];
  currentPage: string;
  onPageChange: (page: string) => void;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isActive = currentPage === item.id;

  return (
    <button
      onClick={() => {
        onPageChange(item.id);
        onNavigate?.();
      }}
      aria-current={isActive ? 'page' : undefined}
      className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
    >
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      <span className="text-sm" style={{ fontWeight: 400 }}>{item.label}</span>
    </button>
  );
}

export function OpsSidebarContent({ currentPage, onPageChange, onLogout, onNavigate }: OpsSidebarContentProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="flex flex-col min-h-full whitespace-nowrap">
      {/* Navigation */}
      <nav
        className="flex-1 px-3 py-4 md:py-6"
        aria-label="Main navigation"
      >
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div
              className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider sidebar-label"
            >
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  currentPage={currentPage}
                  onPageChange={onPageChange}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions — sticky at bottom */}
      <div className="sticky bottom-0 border-t" style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}>
        <button
          type="button"
          onClick={() => setShowUserMenu((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: 'var(--sidebar-foreground)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            GL
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-medium truncate">
              Internal Dashboard
            </div>
          </div>
          <ChevronUp
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showUserMenu ? '' : 'rotate-180'}`}
            style={{ opacity: 0.5 }}
          />
        </button>

        {showUserMenu && (
          <div className="px-3 pb-4 animate-in slide-in-from-top-1 duration-150">
            <button
              onClick={onLogout}
              className="sidebar-nav-btn"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm" style={{ fontWeight: 400 }}>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { OpsSidebarContent } from './OpsSidebarContent';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ currentPage, onPageChange, onLogout, collapsed, onToggle }: SidebarProps) {
  return (
    <>
      <aside
        className={`hidden md:flex flex-col h-screen overflow-y-auto sidebar-scroll flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-0 overflow-hidden' : 'w-64'
        }`}
        style={{
          backgroundColor: 'var(--sidebar)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-6 md:py-8 border-b" style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <img src="/indataflow-logo.png" alt="InDataFlow" className="h-[56px] md:h-[67px] w-auto brightness-0 invert" />
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center justify-center w-7 h-7 rounded hover:opacity-70 transition-opacity"
            style={{ color: 'var(--sidebar-foreground)' }}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        <OpsSidebarContent currentPage={currentPage} onPageChange={onPageChange} onLogout={onLogout} />
      </aside>

      {/* Floating toggle button when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className="hidden md:flex absolute left-3 top-4 z-30 items-center justify-center w-8 h-8 rounded border transition-colors"
          style={{
            backgroundColor: 'var(--sidebar)',
            borderColor: 'var(--sidebar-border)',
            color: 'var(--sidebar-foreground)',
          }}
          aria-label="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}
    </>
  );
}

import { ChevronDown } from 'lucide-react';

export function SelectField({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`form-input ${className ?? ''}`} {...props}>{children}</select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
    </div>
  );
}

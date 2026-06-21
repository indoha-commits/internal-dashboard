import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string | null;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, error, hint, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {required && <span style={{ color: 'var(--destructive)' }}> *</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--destructive)' }}>{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>
      )}
    </div>
  );
}

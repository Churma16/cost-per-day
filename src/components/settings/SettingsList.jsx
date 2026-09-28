import React from 'react';
import { IoChevronForwardOutline } from 'react-icons/io5';

export const SETTINGS_ROW_CLASS =
  'flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors';

export function SettingsSection({
  id,
  title,
  description,
  action,
  children,
  className = '',
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-1.5 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 id={id} className="text-xs font-medium text-gray-500">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-5 text-gray-400">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SettingsCard({ children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm ${className}`.trim()}>
      {children}
    </div>
  );
}

export function SettingsRowIcon({ children, tone = 'neutral' }) {
  const toneClass = {
    brand: 'border border-[var(--border)] bg-white text-[var(--accent)]',
    danger: 'border-[1.5px] border-[var(--error-outline)] bg-white text-[var(--error-text)]',
    neutral: 'bg-slate-100/80 text-slate-600',
  }[tone] || 'bg-slate-100/80 text-slate-600';

  return (
    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${toneClass}`}>
      {children}
    </span>
  );
}

export function SettingsDivider() {
  return <div aria-hidden="true" className="ml-[58px] mr-3.5 border-b border-gray-100" />;
}

export function SettingsChevron() {
  return (
    <IoChevronForwardOutline
      aria-hidden="true"
      className="h-4 w-4 flex-none text-gray-400"
    />
  );
}

export function SettingsRowText({ title, subtitle }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium leading-5 text-gray-900">{title}</span>
      {subtitle && (
        <span className="mt-0.5 block text-xs leading-5 text-gray-500">{subtitle}</span>
      )}
    </span>
  );
}

import React from 'react';
import OwnershipLoader from './OwnershipLoader';

const panelTone = {
  loading: 'border-[#DCE6E5] bg-white',
  empty: 'border-[#E2E7E9] bg-white',
  error: 'border-[#D6E3E2] bg-[#F9FBFB]',
};

const noticeTone = {
  loading: 'border-[#DCE6E5] bg-white text-[#55616B]',
  error: 'border-[#D6E3E2] bg-[#F9FBFB] text-[#4D5B64]',
};

export function StatePanel({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  const isLoading = variant === 'loading';
  const isError = variant === 'error';

  return (
    <section
      role={isLoading ? 'status' : isError ? 'alert' : undefined}
      aria-live={isLoading ? 'polite' : undefined}
      aria-busy={isLoading ? 'true' : undefined}
      data-state-variant={variant}
      className={`rounded-2xl border px-6 py-8 text-center shadow-sm ${panelTone[variant] || panelTone.empty} ${className}`.trim()}
    >
      <div
        aria-hidden="true"
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF6F5]"
      >
        <OwnershipLoader active={isLoading} className="h-10 w-10" />
      </div>

      <div className="mx-auto mt-4 max-w-md">
        {title && (
          <h2 className="text-base font-semibold tracking-[-0.01em] text-[#20242A]">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1.5 text-sm leading-5 text-[#66707A]">
            {description}
          </p>
        )}
      </div>

      {actionLabel && typeof onAction === 'function' && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#2F7473] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#286664] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473] focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
}

export function InlineStateNotice({
  variant = 'error',
  message,
  actionLabel,
  onAction,
  className = '',
}) {
  const isLoading = variant === 'loading';

  return (
    <div
      role={isLoading ? 'status' : 'alert'}
      aria-live={isLoading ? 'polite' : undefined}
      aria-busy={isLoading ? 'true' : undefined}
      data-state-variant={variant}
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm ${noticeTone[variant] || noticeTone.error} ${className}`.trim()}
    >
      <OwnershipLoader active={isLoading} className="h-6 w-6 flex-none" />
      <p className="min-w-0 flex-1 leading-5">{message}</p>
      {actionLabel && typeof onAction === 'function' && (
        <button
          type="button"
          onClick={onAction}
          className="flex-none rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#2F7473] hover:bg-[#E8F2F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

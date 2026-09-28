import React from 'react';
import { IoClose, IoInformationCircleOutline } from 'react-icons/io5';
import OwnershipLoader from './OwnershipLoader';

const SECONDARY_BUTTON_CLASS = 'inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[#F6F7F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2';
const PRIMARY_BUTTON_CLASS = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent-strong)] px-[22px] py-3 text-sm font-medium text-white transition-colors hover:bg-[#146E65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2';

export function StateMotif({ motif = 'home', className = 'h-12 w-12' }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 26 26"
      fill="none"
      className={className}
    >
      {motif === 'planning' ? (
        <>
          <circle cx="13" cy="13" r="9.5" stroke="var(--neutral-ring)" strokeWidth="2.2" strokeDasharray="2.5 3" />
          <circle cx="13" cy="3.5" r="2" fill="var(--neutral-detail)" />
          <circle cx="13" cy="13" r="1.6" fill="var(--neutral-ring)" />
        </>
      ) : motif === 'durability' ? (
        <>
          <circle cx="13" cy="13" r="9.5" stroke="var(--neutral-ring)" strokeWidth="1.6" />
          <circle cx="13" cy="13" r="6.2" stroke="var(--neutral-ring)" strokeWidth="1.6" />
          <circle cx="13" cy="13" r="2.8" stroke="var(--neutral-detail)" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <circle cx="13" cy="13" r="9.5" stroke="var(--neutral-ring)" strokeWidth="2.2" />
          <circle cx="13" cy="13" r="2.2" fill="var(--neutral-ring)" />
        </>
      )}
    </svg>
  );
}

export function EmptyState({
  motif = 'home',
  title,
  description,
  actionLabel,
  onAction,
  showIllustration = true,
  className = '',
}) {
  return (
    <section className={`state-fade px-5 py-8 text-center ${className}`.trim()} data-state-variant="empty">
      {showIllustration && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center">
          <StateMotif motif={motif} />
        </div>
      )}
      {title && (
        <h2 className={`${showIllustration ? 'mt-4' : ''} text-[15px] font-medium text-[var(--text-primary)]`.trim()}>
          {title}
        </h2>
      )}
      {description && (
        <p className={`${title ? 'mt-1.5' : showIllustration ? 'mt-4' : ''} mx-auto max-w-md text-[13px] leading-[1.6] text-[var(--text-secondary)]`.trim()}>
          {description}
        </p>
      )}
      {actionLabel && typeof onAction === 'function' && (
        <button type="button" onClick={onAction} className={`mt-5 ${PRIMARY_BUTTON_CLASS}`}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function NoticeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 26 26" fill="none" className="mt-0.5 h-5 w-5 flex-none text-[var(--neutral-detail)]">
      <circle cx="13" cy="13" r="9.5" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 3" />
      <circle cx="13" cy="13" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function NoticeCard({
  title,
  body,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <section
      role="status"
      data-state-tier="1"
      className={`state-fade rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${className}`.trim()}
    >
      <div className="flex items-start gap-2.5">
        <NoticeIcon />
        <div className="min-w-0 flex-1">
          {title && <p className="text-[13px] font-medium text-[var(--text-primary)]">{title}</p>}
          {body && <p className={`${title ? 'mt-0.5' : ''} text-xs leading-[1.5] text-[var(--text-secondary)]`}>{body}</p>}
          {actionLabel && typeof onAction === 'function' && (
            <button type="button" onClick={onAction} className={`mt-2.5 ${SECONDARY_BUTTON_CLASS}`}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function ErrorCard({
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
  className = '',
}) {
  return (
    <section
      role="alert"
      data-state-tier="2"
      className={`state-fade relative rounded-xl border-[1.5px] border-[var(--error-outline)] bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${className}`.trim()}
    >
      <div className="flex items-start gap-2.5">
        <IoInformationCircleOutline aria-hidden="true" className="mt-px h-4 w-4 flex-none text-[var(--error-text)]" />
        <div className="min-w-0 flex-1 pr-5">
          {title && <p className="text-[13px] font-medium text-[var(--text-primary)]">{title}</p>}
          {body && <p className={`${title ? 'mt-0.5' : ''} text-xs leading-[1.5] text-[var(--text-secondary)]`}>{body}</p>}
          {actionLabel && typeof onAction === 'function' && (
            <button type="button" onClick={onAction} className={`mt-2.5 ${SECONDARY_BUTTON_CLASS}`}>
              {actionLabel}
            </button>
          )}
        </div>
        {typeof onDismiss === 'function' && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-2.5 top-2.5 rounded-md p-1 text-[var(--neutral-detail)] hover:bg-[#F6F7F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <IoClose aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}

export function HeroSkeleton({ paused = false }) {
  const skeletonClass = paused ? 'state-skeleton state-skeleton--paused' : 'state-skeleton';
  return (
    <div aria-hidden="true" className="min-h-[178px] px-0.5 py-2">
      <div className={`${skeletonClass} h-2 w-[90px] rounded bg-[var(--skeleton-bar-hero)]`} />
      <div className={`${skeletonClass} mt-4 h-4 w-3/5 rounded-md bg-white/30`} />
      <div className={`${skeletonClass} mt-5 h-[9px] w-[85%] rounded bg-[var(--skeleton-bar-hero)]`} />
      <div className={`${skeletonClass} mt-2.5 h-[9px] w-[70%] rounded bg-[var(--skeleton-bar-hero)]`} />
    </div>
  );
}

const SKELETON_TITLE_WIDTHS = ['55%', '45%', '60%'];

export function CardListSkeleton({ count = 3, paused = false, className = '' }) {
  const skeletonClass = paused ? 'state-skeleton state-skeleton--paused' : 'state-skeleton';
  return (
    <div aria-hidden="true" className={`space-y-2.5 ${className}`.trim()}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        >
          <div className={`${skeletonClass} h-[34px] w-[34px] flex-none rounded-[9px] bg-[var(--skeleton-bar)]`} />
          <div className="min-w-0 flex-1">
            <div
              className={`${skeletonClass} h-[10px] rounded bg-[var(--skeleton-bar)]`}
              style={{ width: SKELETON_TITLE_WIDTHS[index % SKELETON_TITLE_WIDTHS.length] }}
            />
            <div className={`${skeletonClass} mt-2 h-2 w-[35%] rounded bg-[var(--skeleton-bar)]`} />
          </div>
          <div className={`${skeletonClass} h-[10px] w-11 flex-none rounded bg-[var(--skeleton-bar)]`} />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ paused = false }) {
  const skeletonClass = paused ? 'state-skeleton state-skeleton--paused' : 'state-skeleton';
  return (
    <div aria-hidden="true" className="space-y-2.5">
      {[0, 1, 2].map((section) => (
        <div key={section} className="rounded-xl border border-[var(--border)] bg-white p-[13px]">
          <div className={`${skeletonClass} h-2 w-20 rounded bg-[var(--skeleton-bar)]`} />
          <div className={`${skeletonClass} mt-3 h-9 w-full rounded-xl bg-[var(--skeleton-bar)]`} />
          {section === 0 && <div className={`${skeletonClass} mt-2.5 h-9 w-full rounded-xl bg-[var(--skeleton-bar)]`} />}
        </div>
      ))}
    </div>
  );
}

export function SlowLoadIndicator({ message, className = '' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`state-fade flex flex-col items-center justify-center py-5 text-center ${className}`.trim()}
    >
      <OwnershipLoader active className="h-8 w-8" />
      <p className="mt-3 text-[13px] text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}

export function ActionLoadingContent({ label }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <OwnershipLoader active className="h-4 w-4" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function StatePanel({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  motif = 'home',
}) {
  if (variant === 'error') {
    return <NoticeCard title={title} body={description} actionLabel={actionLabel} onAction={onAction} className={className} />;
  }
  if (variant === 'loading') {
    return <SlowLoadIndicator message={description || title} className={className} />;
  }
  return <EmptyState motif={motif} title={title} description={description} actionLabel={actionLabel} onAction={onAction} className={className} />;
}

export function InlineStateNotice({
  variant = 'error',
  tier,
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
  className = '',
}) {
  const resolvedTier = tier ?? (variant === 'notice' ? 1 : 2);
  if (resolvedTier === 1) {
    return <NoticeCard title={title} body={message} actionLabel={actionLabel} onAction={onAction} className={className} />;
  }
  return <ErrorCard title={title} body={message} actionLabel={actionLabel} onAction={onAction} onDismiss={onDismiss} className={className} />;
}

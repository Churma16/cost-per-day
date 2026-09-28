import React from 'react';
import { useTranslation } from 'react-i18next';
import { PRODUCT_NAME } from '../../constants/branding';
import OwnershipLoader from './OwnershipLoader';

function AppLaunchLoader({ showContent = true, showTip = false }) {
  const { t } = useTranslation();

  return (
    <main
      data-testid="application-launch-loader"
      className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 py-10"
    >
      {showContent && (
        <section
          role="status"
          aria-live="polite"
          aria-label={t('launchLoadingLabel')}
          className="state-fade flex w-full max-w-xs flex-col items-center text-center"
        >
          <img
            src="/logo192.png"
            alt=""
            aria-hidden="true"
            className="h-16 w-16 rounded-2xl"
          />
          <p className="mt-3 text-sm font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            {PRODUCT_NAME}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <OwnershipLoader active className="h-5 w-5 flex-none" />
            <p className="text-xs text-[var(--text-secondary)]">
              {t('launchLoadingLabel')}
            </p>
          </div>
          {showTip && (
            <aside
              role="note"
              className="state-fade fixed bottom-10 left-6 right-6 mx-auto max-w-xs rounded-xl border border-[var(--border)] bg-white/90 px-4 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
                {t('launchLoadingTipLabel')}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {t('launchLoadingTip')}
              </p>
            </aside>
          )}
        </section>
      )}
    </main>
  );
}

export default AppLaunchLoader;

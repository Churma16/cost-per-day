import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { APP_VERSION, PRODUCT_NAME } from '../constants/branding';
import WorthwhileBrandLockup from './WorthwhileBrandLockup';

const MotionLink = motion.create(Link);

const purchaseContextExamples = [
  'aboutExampleDailyCost',
  'aboutExampleTarget',
  'aboutExampleComparison',
  'aboutExampleDurability',
  'aboutExamplePlanning',
];

const principles = [
  ['aboutPrinciplePersonalTitle', 'aboutPrinciplePersonalBody'],
  ['aboutPrincipleContextTitle', 'aboutPrincipleContextBody'],
  ['aboutPrincipleReflectionTitle', 'aboutPrincipleReflectionBody'],
  ['aboutPrincipleCalmTitle', 'aboutPrincipleCalmBody'],
];

function PurchaseContextFlow({ steps, label }) {
  return (
    <div aria-label={label} className="mt-5 font-semibold text-[#2F7473]">
      <div className="flex flex-col items-center text-center sm:hidden">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            {index > 0 && <span aria-hidden="true" className="leading-5 text-[#83AAA7]">↓</span>}
            <span className="text-sm leading-5">{step}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="hidden flex-wrap items-center justify-center gap-2 text-sm sm:flex">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            {index > 0 && <span aria-hidden="true" className="text-[#83AAA7]">→</span>}
            <span>{step}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function AboutPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const returnToSettings = location.state?.from === '/settings';
  const returnPath = returnToSettings ? '/settings' : '/';

  useEffect(() => {
    document.title = `${t('aboutWorthwhile')} · ${PRODUCT_NAME}`;
    const rootElement = document.getElementById('root');
    if (rootElement) rootElement.scrollTop = 0;
  }, [t]);

  return (
    <main className="min-h-screen bg-[#F6F7F8] px-4 py-6 sm:py-10">
      <article className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[#E6E8EC] bg-white shadow-sm">
        <header className="border-b border-[#E6E8EC] bg-[#F9FAFA] px-5 py-6 sm:px-8 sm:py-8">
          <MotionLink
            to={returnPath}
            whileTap={{ scale: 0.97 }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-[#2F7473] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473]"
          >
            <IoArrowBackOutline aria-hidden="true" className="text-lg" />
            {t(returnToSettings ? 'backToSettings' : 'backToWorthwhile')}
          </MotionLink>

          <div className="mt-5 flex items-center justify-between gap-4">
            <WorthwhileBrandLockup />
            <span className="flex-none rounded-full border border-[#CFE1DF] bg-[#F1F7F6] px-3 py-1 text-xs font-semibold text-[#2F7473]">
              {t('earlyBeta')}
            </span>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('aboutWorthwhileSubtitle')}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#5F6873]">
            {t('aboutWorthwhilePurpose')}
          </p>
        </header>

        <div className="space-y-9 px-5 py-7 text-[0.95rem] leading-7 text-[#4F5965] sm:px-8 sm:py-9">
          <section aria-labelledby="purchase-context-heading">
            <h2 id="purchase-context-heading" className="text-lg font-semibold tracking-tight text-gray-900">
              {t('aboutHowTitle')}
            </h2>
            <p className="mt-2">{t('aboutHowBody')}</p>
            <PurchaseContextFlow
              label={t('aboutHowFlowLabel')}
              steps={[t('aboutFlowPrice'), t('aboutFlowTime'), t('aboutFlowHistory'), t('aboutFlowContext')]}
            />
            <ul className="mt-4 list-disc space-y-1.5 pl-5 marker:text-[#83AAA7]">
              {purchaseContextExamples.map((key) => <li key={key}>{t(key)}</li>)}
            </ul>
          </section>

          <section aria-labelledby="your-decision-heading">
            <h2 id="your-decision-heading" className="text-lg font-semibold tracking-tight text-gray-900">
              {t('aboutDecisionTitle')}
            </h2>
            <p className="mt-2">{t('aboutDecisionBody')}</p>
            <div className="mt-4 border-l-2 border-[#83AAA7] pl-4 text-sm italic text-[#405654]">
              “{t('aboutDecisionExample')}”
            </div>
            <p className="mt-3">{t('aboutDecisionClosing')}</p>
          </section>

          <section aria-labelledby="personal-over-time-heading">
            <h2 id="personal-over-time-heading" className="text-lg font-semibold tracking-tight text-gray-900">
              {t('aboutPersonalTitle')}
            </h2>
            <p className="mt-2">{t('aboutPersonalBody')}</p>
            <p className="mt-3">{t('aboutPersonalGoal')}</p>
          </section>

          <section aria-labelledby="principles-heading">
            <h2 id="principles-heading" className="text-lg font-semibold tracking-tight text-gray-900">
              {t('aboutPrinciplesTitle')}
            </h2>
            <dl className="mt-3 divide-y divide-gray-100 border-y border-gray-100">
              {principles.map(([titleKey, bodyKey]) => (
                <div key={titleKey} className="py-3 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="font-semibold text-gray-900">{t(titleKey)}</dt>
                  <dd className="mt-0.5 text-sm leading-6 text-gray-500 sm:mt-0">{t(bodyKey)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="name-heading">
            <h2 id="name-heading" className="text-lg font-semibold tracking-tight text-gray-900">
              {t('aboutNameTitle')}
            </h2>
            <p className="mt-2 font-semibold text-[#2F7473]">Worth + while.</p>
            <p className="mt-1">{t('aboutNameDefinition')}</p>
            <p className="mt-3">{t('aboutNameBody')}</p>
            <p className="mt-4 border-l-2 border-[#83AAA7] pl-4 font-medium text-[#304D4B]">
              {t('aboutCenterpiece')}
            </p>
          </section>

          <footer className="border-t border-[#E6E8EC] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-gray-900">{PRODUCT_NAME}</span>
              <span className="text-gray-500">{t('earlyBeta')} · {t('versionText', { version: APP_VERSION })}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-400">{t('aboutContextDisclaimer')}</p>
          </footer>
        </div>
      </article>
    </main>
  );
}

export default AboutPage;

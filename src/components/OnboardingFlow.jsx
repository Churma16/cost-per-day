import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IoAdd, IoArrowBack, IoCheckmark, IoClose } from 'react-icons/io5';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'motion/react';
import { PRODUCT_NAME } from '../constants/branding';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';
import { getSupportedCurrencies, useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import CurrencyInput from './common/CurrencyInput';
import { InlineStateNotice, StatePanel } from './ui/AsyncState';
import {
  hasCompletedOnboarding,
  ONBOARDING_COMPLETED_SETTING,
  suggestCurrency,
  suggestLanguage,
} from '../utils/onboarding';

const SUGGESTED_REFERENCES = ['coffee', 'snack', 'lunch'];
const LANGUAGE_LABELS = {
  en: 'English',
  id: 'Bahasa Indonesia',
};

const getDeviceLocales = () => (
  globalThis.navigator?.languages || [globalThis.navigator?.language]
);
const getReferenceTranslationKey = (kind) => (
  `onboardingReference${kind[0].toUpperCase()}${kind.slice(1)}`
);
const emptyReference = (id, name = '', kind = null) => ({ id, kind, name, amount: '' });

const CALM_EASE = [0.16, 1, 0.3, 1];
const CALM_HEIGHT_EASE = [0.22, 1, 0.36, 1];

const LocalizedCopy = ({ language, reduceMotion, children, className = '' }) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.span
      key={language}
      initial={reduceMotion ? false : { opacity: 0, y: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : {
        opacity: 0,
        transition: { duration: 0.14, ease: 'easeOut' },
      }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: CALM_EASE }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.span>
  </AnimatePresence>
);

const OnboardingShell = ({ step, direction, children }) => {
  const shouldReduceMotion = useReducedMotion();
  const [contentNode, setContentNode] = useState(null);
  const [contentHeight, setContentHeight] = useState(null);
  const pageTransition = {
    duration: shouldReduceMotion ? 0 : 0.24,
    ease: CALM_EASE,
  };
  const registerContentNode = useCallback((node) => {
    // During an overlapping exit, React clears the previous node's ref after
    // the next step has mounted. Ignore that stale null so the new step stays
    // connected to adaptive height measurement.
    if (node) setContentNode(node);
  }, []);

  useLayoutEffect(() => {
    if (!contentNode) return undefined;

    const measureContent = () => {
      const nextHeight = contentNode.getBoundingClientRect().height || contentNode.scrollHeight;
      if (nextHeight > 0) {
        setContentHeight((currentHeight) => (
          currentHeight === nextHeight ? currentHeight : nextHeight
        ));
      }
    };

    measureContent();
    const frameId = window.requestAnimationFrame(measureContent);
    if (typeof ResizeObserver === 'undefined') {
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(measureContent);
    observer.observe(contentNode);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [contentNode]);

  return (
    <motion.main
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.34, ease: CALM_EASE }}
      className="h-full overflow-y-auto bg-[#E9EAEC] px-3 py-5 sm:flex sm:items-center sm:justify-center sm:p-6"
    >
      <motion.section
        data-testid="onboarding-shell"
        initial={shouldReduceMotion ? false : { opacity: 0, x: 16, scale: 0.994 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.46,
          ease: CALM_EASE,
          delay: shouldReduceMotion ? 0 : 0.04,
        }}
        className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl bg-[#F8F9FA] shadow-[0_20px_60px_-35px_rgba(27,54,61,0.55)]"
      >
        <div className="flex gap-1.5 px-6 pt-6" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((number) => {
            const isActive = number <= step;
            return (
              <span
                key={number}
                data-testid={`onboarding-progress-${number}`}
                data-active={isActive}
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-gray-200"
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 origin-left rounded-full bg-[#2F7473]"
                  initial={shouldReduceMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: isActive ? 1 : 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.36,
                    ease: CALM_EASE,
                    delay: shouldReduceMotion
                      ? 0
                      : step === 1 && number === 1
                        ? 0.14
                        : Math.max(0, number - step) * 0.035,
                  }}
                />
              </span>
            );
          })}
        </div>
        <motion.div
          data-testid="onboarding-step-viewport"
          className="relative w-full overflow-hidden will-change-[height]"
          initial={false}
          animate={contentHeight ? { height: contentHeight } : undefined}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.48,
            ease: CALM_HEIGHT_EASE,
          }}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={step}
              ref={registerContentNode}
              custom={direction}
              data-testid={`onboarding-step-${step}`}
              className="w-full"
              variants={{
                enter: (travelDirection) => (
                  shouldReduceMotion
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: travelDirection * 14 }
                ),
                center: { opacity: 1, x: 0 },
                exit: (travelDirection) => (
                  shouldReduceMotion
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: travelDirection * -10 }
                ),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.section>
    </motion.main>
  );
};

function OnboardingFlow({ onComplete }) {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const updateSetting = useUpdateSetting();
  const { changeLanguage } = useLanguage();
  const { changeCurrency } = useCurrency();
  const { addEquivalent } = useValueEquivalents();
  const [step, setStep] = useState(1);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [language, setLanguage] = useState(() => suggestLanguage(getDeviceLocales()));
  const initialLanguage = useRef(language);
  const [currency, setCurrency] = useState(() => suggestCurrency(getDeviceLocales()));
  const [references, setReferences] = useState([]);
  const nextReferenceId = useRef(0);
  const savedReferenceIds = useRef(new Set());
  const [, setSavedReferenceRevision] = useState(0);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const currencies = useMemo(() => getSupportedCurrencies().map((item) => ({
    ...item,
    name: t(item.nameKey),
  })), [t, i18n.resolvedLanguage]);
  const calmSelectionTransition = {
    duration: shouldReduceMotion ? 0 : 0.28,
    ease: CALM_EASE,
  };
  const calmLanguageLayoutTransition = {
    layout: {
      duration: shouldReduceMotion ? 0 : 0.36,
      ease: CALM_HEIGHT_EASE,
    },
  };

  useEffect(() => {
    void i18n.changeLanguage(initialLanguage.current);
  }, [i18n]);

  const navigateToStep = (nextStep) => {
    if (nextStep === step) return;
    setTransitionDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  const localizeSuggestedReferences = (code) => {
    const translateToLanguage = i18n.getFixedT(code);
    setReferences((current) => current.map((reference) => (
      reference.kind
        ? { ...reference, name: translateToLanguage(getReferenceTranslationKey(reference.kind)) }
        : reference
    )));
  };

  const selectLanguage = (code) => {
    if (code === language) return;

    setLanguage(code);
    localizeSuggestedReferences(code);
    void i18n.changeLanguage(code);
  };

  const addSuggestedReference = (kind) => {
    const name = t(getReferenceTranslationKey(kind));
    const reference = emptyReference(++nextReferenceId.current, name, kind);
    setReferences((current) => (
      current.length >= 3 || current.some((item) => item.kind === kind)
        ? current
        : [...current, reference]
    ));
  };

  const addCustomReference = () => {
    const reference = emptyReference(++nextReferenceId.current);
    setReferences((current) => (
      current.length >= 3
        ? current
        : [...current, reference]
    ));
  };

  const updateReference = (index, key, value) => {
    setReferences((current) => current.map((reference, referenceIndex) => {
      if (referenceIndex !== index || savedReferenceIds.current.has(reference.id)) {
        return reference;
      }
      return { ...reference, [key]: value, ...(key === 'name' ? { kind: null } : {}) };
    }));
  };

  const removeReference = (index) => {
    setReferences((current) => {
      const reference = current[index];
      if (!reference || savedReferenceIds.current.has(reference.id)) return current;
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const finish = async ({ skipReferences = false } = {}) => {
    if (isSaving) return;
    const referencesToSave = skipReferences
      ? []
      : references.filter((reference) => !savedReferenceIds.current.has(reference.id));
    const invalidReference = referencesToSave.some((reference) => (
      !reference.name.trim() || !Number.isFinite(Number(reference.amount)) || Number(reference.amount) <= 0
    ));
    if (invalidReference) {
      setError(t('onboardingReferenceError'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await changeLanguage(language);
      await changeCurrency(currency);
      for (const reference of referencesToSave) {
        await addEquivalent({
          name: reference.name.trim(),
          amount: Number(reference.amount),
          currencyCode: currency,
        });
        savedReferenceIds.current.add(reference.id);
        setSavedReferenceRevision((revision) => revision + 1);
      }
      await updateSetting.mutateAsync({ key: ONBOARDING_COMPLETED_SETTING, value: 'true' });
      onComplete();
    } catch (saveError) {
      console.error('Error completing onboarding:', saveError);
      setError(t('onboardingSaveError'));
      setIsSaving(false);
    }
  };

  if (step === 1) {
    return (
      <OnboardingShell step={step} direction={transitionDirection}>
        <div className="px-7 pb-8 pt-9 text-center sm:px-10">
          <img src="/logo192.png" alt="" className="mx-auto h-20 w-20" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#2F7473]">
            {t('onboardingWelcomeEyebrow')}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-gray-950">
            {t('onboardingWelcomeTitle', { productName: PRODUCT_NAME })}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">
            {t('onboardingWelcomeBody')}
          </p>
          <button type="button" onClick={() => navigateToStep(2)} className="mt-8 w-full rounded-xl bg-[#2F7473] px-5 py-3 text-sm font-semibold text-white hover:bg-[#265e5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473] focus-visible:ring-offset-2">
            {t('onboardingStart')}
          </button>
          <p className="mt-3 text-xs text-gray-400">{t('onboardingTimeNote')}</p>
        </div>
      </OnboardingShell>
    );
  }

  if (step === 2) {
    return (
      <OnboardingShell step={step} direction={transitionDirection}>
        <div className="px-6 pb-7 pt-6 sm:px-8">
          <button type="button" onClick={() => navigateToStep(1)} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800">
            <IoArrowBack />
            <LocalizedCopy language={i18n.resolvedLanguage} reduceMotion={shouldReduceMotion}>
              {t('back')}
            </LocalizedCopy>
          </button>
          <LayoutGroup id="onboarding-language-layout">
            <motion.div layout transition={calmLanguageLayoutTransition}>
              <h1 className="text-xl font-bold tracking-[-0.02em] text-gray-950">
                <LocalizedCopy language={i18n.resolvedLanguage} reduceMotion={shouldReduceMotion} className="block">
                  {t('onboardingPreferencesTitle')}
                </LocalizedCopy>
              </h1>
              <p className="mt-2 text-sm leading-5 text-gray-600">
                <LocalizedCopy language={i18n.resolvedLanguage} reduceMotion={shouldReduceMotion} className="block">
                  {t('onboardingPreferencesBody')}
                </LocalizedCopy>
              </p>
            </motion.div>

            <motion.fieldset
              layout="position"
              transition={calmLanguageLayoutTransition}
              className="mt-6"
            >
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              <LocalizedCopy language={i18n.resolvedLanguage} reduceMotion={shouldReduceMotion}>
                {t('language')}
              </LocalizedCopy>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2" data-testid="language-options">
              {SUPPORTED_LANGUAGES.map((code) => {
                const isSelected = language === code;
                return (
                  <motion.button
                    key={code}
                    layout={!shouldReduceMotion}
                    initial={false}
                    animate={{ opacity: isSelected ? 1 : 0.76, scale: isSelected ? 1 : 0.985 }}
                    whileHover={shouldReduceMotion ? undefined : { opacity: 0.9, scale: 1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.975 }}
                    transition={calmSelectionTransition}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectLanguage(code)}
                    className={`relative flex min-w-[10rem] flex-1 items-center justify-center whitespace-nowrap rounded-xl border px-3 py-3 text-sm font-medium transition-[border-color,background-color,color,box-shadow] duration-300 ${isSelected ? 'border-[#2F7473] bg-teal-50 text-[#245c5b] shadow-sm' : 'border-gray-200 bg-white text-gray-700'}`}
                  >
                    {LANGUAGE_LABELS[code] ?? code}
                    <AnimatePresence initial={false}>
                      {isSelected && (
                        <motion.span
                          key="selected"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={calmSelectionTransition}
                          className="absolute right-3 flex"
                        >
                          <IoCheckmark aria-hidden="true" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
            </motion.fieldset>

            <motion.div
              layout="position"
              transition={calmLanguageLayoutTransition}
              className="mt-6"
            >
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="onboarding-currency">
              <LocalizedCopy language={i18n.resolvedLanguage} reduceMotion={shouldReduceMotion}>
                {t('currency')}
              </LocalizedCopy>
            </label>
            <select id="onboarding-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#2F7473] focus:outline-none focus:ring-2 focus:ring-[#2F7473]/20">
              {currencies.map((option) => <option key={option.code} value={option.code}>{option.symbol} {option.name}</option>)}
            </select>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              <LocalizedCopy language={i18n.resolvedLanguage} reduceMotion={shouldReduceMotion} className="block">
                {t('onboardingCurrencyHelp')}
              </LocalizedCopy>
            </p>
            </motion.div>

            <motion.button
              layout="position"
              transition={calmLanguageLayoutTransition}
              type="button"
              onClick={() => navigateToStep(3)}
              className="mt-7 w-full rounded-xl bg-[#2F7473] px-5 py-3 text-sm font-semibold text-white hover:bg-[#265e5d]"
            >
              <LocalizedCopy language={i18n.resolvedLanguage} reduceMotion={shouldReduceMotion}>
                {t('continue')}
              </LocalizedCopy>
            </motion.button>
          </LayoutGroup>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step={step} direction={transitionDirection}>
      <div className="px-6 pb-7 pt-6 sm:px-8">
        <button type="button" onClick={() => navigateToStep(2)} disabled={isSaving || savedReferenceIds.current.size > 0} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50">
          <IoArrowBack /> {t('back')}
        </button>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-gray-950">{t('onboardingReferencesTitle')}</h1>
          <span className="mt-0.5 shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t('optional')}</span>
        </div>
        <p className="mt-2 text-sm leading-5 text-gray-600">{t('onboardingReferencesBody')}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTED_REFERENCES.map((kind) => (
            <button key={kind} type="button" disabled={references.length >= 3} onClick={() => addSuggestedReference(kind)} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#83AAA7] disabled:opacity-40">
              + {t(getReferenceTranslationKey(kind))}
            </button>
          ))}
          <button type="button" disabled={references.length >= 3} onClick={addCustomReference} className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#83AAA7] disabled:opacity-40"><IoAdd /> {t('onboardingCustomReference')}</button>
        </div>

        <p className="mt-3 text-xs text-gray-500">{t('onboardingReferencesNote')}</p>

        <div className="mt-4 space-y-3">
          {references.map((reference, index) => {
            const isSaved = savedReferenceIds.current.has(reference.id);
            return (
              <div key={reference.id} className={`rounded-2xl border border-gray-200 bg-white p-3 ${isSaved ? 'opacity-70' : ''}`}>
                {isSaved && (
                  <div className="mb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#2F7473]">
                    {t('saved')}
                  </div>
                )}
                <div className="flex gap-2">
                  <input disabled={isSaved} aria-label={t('equivalentName')} value={reference.name} onChange={(event) => updateReference(index, 'name', event.target.value)} placeholder={t('enterEquivalentName')} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2F7473] focus:outline-none disabled:cursor-not-allowed" />
                  <button type="button" disabled={isSaved} aria-label={t('removeReference')} onClick={() => removeReference(index)} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"><IoClose /></button>
                </div>
                <CurrencyInput disabled={isSaved} aria-label={t('equivalentAmount')} value={reference.amount} onChange={(event) => updateReference(index, 'amount', event.target.value)} currencyCode={currency} placeholder={t('enterEquivalentAmount')} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2F7473] focus:outline-none disabled:cursor-not-allowed" />
              </div>
            );
          })}
        </div>

        {error && (
          <InlineStateNotice
            variant="error"
            message={error}
            className="mt-4"
          />
        )}

        <div className="mt-6 flex gap-3">
          <button type="button" disabled={isSaving} onClick={() => finish({ skipReferences: true })} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50">{t('skipForNow')}</button>
          <button type="button" disabled={isSaving} onClick={() => finish()} className="flex-1 rounded-xl bg-[#2F7473] px-4 py-3 text-sm font-semibold text-white hover:bg-[#265e5d] disabled:opacity-50">{isSaving ? t('saving') : t('onboardingEnter')}</button>
        </div>
      </div>
    </OnboardingShell>
  );
}

export function OnboardingGate({ children }) {
  const { t } = useTranslation();
  const settingsQuery = useSettings();
  const navigate = useNavigate();
  const [, setCompletionRevision] = useState(0);

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#E9EAEC] p-4">
        <div className="w-full max-w-sm">
          <StatePanel
            variant="loading"
            title={t('onboardingLoadingTitle')}
            description={t('onboardingLoadingDescription')}
          />
        </div>
      </main>
    );
  }
  if (settingsQuery.error && !settingsQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#E9EAEC] p-4">
        <div className="w-full max-w-sm">
          <StatePanel
            variant="error"
            title={t('onboardingLoadErrorTitle')}
            description={t('onboardingLoadErrorDescription')}
            actionLabel={t('retry')}
            onAction={() => settingsQuery.refetch()}
          />
        </div>
      </main>
    );
  }
  if (!hasCompletedOnboarding(settingsQuery.data)) {
    return (
      <OnboardingFlow
        onComplete={() => {
          navigate('/', { replace: true });
          setCompletionRevision((revision) => revision + 1);
        }}
      />
    );
  }
  return children;
}

export default OnboardingFlow;

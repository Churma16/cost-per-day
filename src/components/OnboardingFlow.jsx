import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoAdd, IoArrowBack, IoCheckmark, IoClose } from 'react-icons/io5';
import { PRODUCT_NAME } from '../constants/branding';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';
import { getSupportedCurrencies, useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import CurrencyInput from './common/CurrencyInput';
import {
  hasCompletedOnboarding,
  ONBOARDING_COMPLETED_SETTING,
  suggestCurrency,
  suggestLanguage,
} from '../utils/onboarding';

const SUGGESTED_REFERENCES = ['coffee', 'snack', 'lunch'];

const emptyReference = (name = '') => ({ name, amount: '' });

const OnboardingShell = ({ step, children }) => (
  <main className="h-full overflow-y-auto bg-[#E9EAEC] px-3 py-5 sm:flex sm:items-center sm:justify-center sm:p-6">
    <section className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl bg-[#F8F9FA] shadow-[0_20px_60px_-35px_rgba(27,54,61,0.55)]">
      <div className="flex gap-1.5 px-6 pt-6" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((number) => (
          <span
            key={number}
            className={`h-1 flex-1 rounded-full ${number <= step ? 'bg-[#2F7473]' : 'bg-gray-200'}`}
          />
        ))}
      </div>
      {children}
    </section>
  </main>
);

function OnboardingFlow({ onComplete }) {
  const { t, i18n } = useTranslation();
  const settingsQuery = useSettings();
  const updateSetting = useUpdateSetting();
  const { changeLanguage } = useLanguage();
  const { changeCurrency } = useCurrency();
  const { addEquivalent } = useValueEquivalents();
  const locales = globalThis.navigator?.languages || [globalThis.navigator?.language];
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState(
    settingsQuery.data?.language || suggestLanguage(locales),
  );
  const [currency, setCurrency] = useState(
    settingsQuery.data?.currency || suggestCurrency(locales),
  );
  const [references, setReferences] = useState([]);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const currencies = useMemo(() => getSupportedCurrencies().map((item) => ({
    ...item,
    name: t(item.nameKey),
  })), [t, i18n.resolvedLanguage]);

  const addSuggestedReference = (kind) => {
    const name = t(`onboardingReference${kind[0].toUpperCase()}${kind.slice(1)}`);
    setReferences((current) => (
      current.length >= 3 || current.some((item) => item.name === name)
        ? current
        : [...current, emptyReference(name)]
    ));
  };

  const addCustomReference = () => {
    setReferences((current) => (
      current.length >= 3 ? current : [...current, emptyReference()]
    ));
  };

  const updateReference = (index, key, value) => {
    setReferences((current) => current.map((reference, referenceIndex) => (
      referenceIndex === index ? { ...reference, [key]: value } : reference
    )));
  };

  const finish = async ({ skipReferences = false } = {}) => {
    if (isSaving) return;
    const referencesToSave = skipReferences ? [] : references;
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
      }
      await updateSetting.mutateAsync({ key: ONBOARDING_COMPLETED_SETTING, value: 'true' });
      onComplete();
    } catch (saveError) {
      console.error('Error completing onboarding:', saveError);
      setError(saveError.message || t('onboardingSaveError'));
      setIsSaving(false);
    }
  };

  if (step === 1) {
    return (
      <OnboardingShell step={step}>
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
          <button type="button" onClick={() => setStep(2)} className="mt-8 w-full rounded-xl bg-[#2F7473] px-5 py-3 text-sm font-semibold text-white hover:bg-[#265e5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473] focus-visible:ring-offset-2">
            {t('onboardingStart')}
          </button>
          <p className="mt-3 text-xs text-gray-400">{t('onboardingTimeNote')}</p>
        </div>
      </OnboardingShell>
    );
  }

  if (step === 2) {
    return (
      <OnboardingShell step={step}>
        <div className="px-6 pb-7 pt-6 sm:px-8">
          <button type="button" onClick={() => setStep(1)} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800">
            <IoArrowBack /> {t('back')}
          </button>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-gray-950">{t('onboardingPreferencesTitle')}</h1>
          <p className="mt-2 text-sm leading-5 text-gray-600">{t('onboardingPreferencesBody')}</p>

          <fieldset className="mt-6">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('language')}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SUPPORTED_LANGUAGES.map((code) => (
                <button key={code} type="button" aria-pressed={language === code} onClick={() => setLanguage(code)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${language === code ? 'border-[#2F7473] bg-teal-50 text-[#245c5b]' : 'border-gray-200 bg-white text-gray-700'}`}>
                  {code === 'id' ? 'Bahasa Indonesia' : 'English'}
                  {language === code && <IoCheckmark aria-hidden="true" />}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="onboarding-currency">{t('onboardingPrimaryCurrency')}</label>
          <select id="onboarding-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#2F7473] focus:outline-none focus:ring-2 focus:ring-[#2F7473]/20">
            {currencies.map((option) => <option key={option.code} value={option.code}>{option.symbol} {option.name}</option>)}
          </select>
          <p className="mt-2 text-xs leading-5 text-gray-500">{t('onboardingCurrencyHelp')}</p>

          <button type="button" onClick={() => setStep(3)} className="mt-7 w-full rounded-xl bg-[#2F7473] px-5 py-3 text-sm font-semibold text-white hover:bg-[#265e5d]">{t('continue')}</button>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step={step}>
      <div className="px-6 pb-7 pt-6 sm:px-8">
        <button type="button" onClick={() => setStep(2)} disabled={isSaving} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50">
          <IoArrowBack /> {t('back')}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-gray-950">{t('onboardingReferencesTitle')}</h1>
            <p className="mt-2 text-sm leading-5 text-gray-600">{t('onboardingReferencesBody')}</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t('optional')}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTED_REFERENCES.map((kind) => (
            <button key={kind} type="button" disabled={references.length >= 3} onClick={() => addSuggestedReference(kind)} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#83AAA7] disabled:opacity-40">
              + {t(`onboardingReference${kind[0].toUpperCase()}${kind.slice(1)}`)}
            </button>
          ))}
          <button type="button" disabled={references.length >= 3} onClick={addCustomReference} className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#83AAA7] disabled:opacity-40"><IoAdd /> {t('onboardingCustomReference')}</button>
        </div>

        <div className="mt-4 space-y-3">
          {references.map((reference, index) => (
            <div key={index} className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="flex gap-2">
                <input aria-label={t('equivalentName')} value={reference.name} onChange={(event) => updateReference(index, 'name', event.target.value)} placeholder={t('enterEquivalentName')} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2F7473] focus:outline-none" />
                <button type="button" aria-label={t('removeReference')} onClick={() => setReferences((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><IoClose /></button>
              </div>
              <CurrencyInput aria-label={t('equivalentAmount')} value={reference.amount} onChange={(event) => updateReference(index, 'amount', event.target.value)} currencyCode={currency} placeholder={t('enterEquivalentAmount')} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2F7473] focus:outline-none" />
            </div>
          ))}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" disabled={isSaving} onClick={() => finish({ skipReferences: true })} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50">{t('skip')}</button>
          <button type="button" disabled={isSaving} onClick={() => finish()} className="flex-1 rounded-xl bg-[#2F7473] px-4 py-3 text-sm font-semibold text-white hover:bg-[#265e5d] disabled:opacity-50">{isSaving ? t('saving') : t('onboardingEnter')}</button>
        </div>
      </div>
    </OnboardingShell>
  );
}

export function OnboardingGate({ children }) {
  const settingsQuery = useSettings();
  const [, setCompletionRevision] = useState(0);

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return <div className="flex h-screen items-center justify-center text-[#2F7473]">Loading...</div>;
  }
  if (settingsQuery.error && !settingsQuery.data) {
    return <div role="alert" className="flex h-screen items-center justify-center p-6 text-center text-red-700">{settingsQuery.error.message}</div>;
  }
  if (!hasCompletedOnboarding(settingsQuery.data)) {
    return <OnboardingFlow onComplete={() => setCompletionRevision((revision) => revision + 1)} />;
  }
  return children;
}

export default OnboardingFlow;

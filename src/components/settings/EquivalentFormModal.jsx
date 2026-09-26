import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose } from 'react-icons/io5';
import CurrencyInput from '../common/CurrencyInput';
import SettingsModalTransition from './SettingsModalTransition';

const getEquivalentFormValues = (equivalent, defaultCurrency) => ({
  name: equivalent?.name || '',
  amount: equivalent?.amount === null || equivalent?.amount === undefined
    ? ''
    : String(equivalent.amount),
  currency: equivalent?.currencyCode || defaultCurrency,
});

function EquivalentFormModal({
  isOpen,
  equivalent,
  defaultCurrency,
  currencyOptions,
  onCancel,
  onSave,
  onExitComplete,
}) {
  const { t } = useTranslation();
  const initialValues = getEquivalentFormValues(equivalent, defaultCurrency);
  const [formName, setFormName] = useState(initialValues.name);
  const [formAmount, setFormAmount] = useState(initialValues.amount);
  const [formCurrency, setFormCurrency] = useState(initialValues.currency);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const nextValues = getEquivalentFormValues(equivalent, defaultCurrency);
    setFormName(nextValues.name);
    setFormAmount(nextValues.amount);
    setFormCurrency(nextValues.currency);
    setFormError(null);
    setIsSaving(false);
  }, [isOpen, equivalent?.id, defaultCurrency]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError(t('enterItemName'));
      return;
    }

    const numericAmount = Number(formAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError(t('enterPrice'));
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: trimmedName,
        amount: numericAmount,
        currencyCode: formCurrency,
      });
    } catch (saveError) {
      console.error('Error saving value equivalent:', saveError);
      setFormError(saveError.message || t('errorSavingEquivalent'));
      setIsSaving(false);
    }
  };

  return (
    <SettingsModalTransition
      isOpen={isOpen}
      onExitComplete={onExitComplete}
      backdropClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50"
      dialogClassName="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl"
      ariaLabelledby="equivalent-form-title"
    >
      {({ isExiting }) => (
        <>
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 id="equivalent-form-title" className="text-lg font-semibold text-gray-800">
              {equivalent ? t('editEquivalent') : t('addEquivalent')}
            </h2>
            <button
              type="button"
              disabled={isSaving || isExiting}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              onClick={onCancel}
              aria-label={t('cancel')}
            >
              <IoClose className="text-xl" />
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                {t('equivalentName')}
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder={t('enterEquivalentName')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F7473]/30 focus:border-[#2F7473]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                {t('equivalentAmount')}
              </label>
              <CurrencyInput
                required
                value={formAmount}
                onChange={(event) => setFormAmount(event.target.value)}
                currencyCode={formCurrency}
                placeholder={t('enterEquivalentAmount')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F7473]/30 focus:border-[#2F7473]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                {t('currency')}
              </label>
              <select
                value={formCurrency}
                onChange={(event) => setFormCurrency(event.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F7473]/30 focus:border-[#2F7473] bg-white"
              >
                {currencyOptions.map((currencyOption) => (
                  <option key={currencyOption.code} value={currencyOption.code}>
                    {currencyOption.code} ({currencyOption.symbol}) - {currencyOption.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                disabled={isSaving || isExiting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
                onClick={onCancel}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving || isExiting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#2F7473] hover:bg-[#265e5d] text-white font-medium transition-all text-sm disabled:opacity-50 shadow-sm"
              >
                {isSaving ? t('loading') : t('save')}
              </button>
            </div>
          </form>
        </>
      )}
    </SettingsModalTransition>
  );
}

export default EquivalentFormModal;

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose, IoInformationCircleOutline } from 'react-icons/io5';
import CurrencyInput from '../common/CurrencyInput';
import { ActionLoadingContent, ErrorCard } from '../ui/AsyncState';
import { useSlowAction } from '../../hooks/useLoadingPhases';
import SettingsModalTransition from './SettingsModalTransition';

const getEquivalentFormValues = (equivalent, defaultCurrency) => ({
  name: equivalent?.name || '',
  amount: equivalent?.amount === null || equivalent?.amount === undefined
    ? ''
    : String(equivalent.amount),
  currency: equivalent?.currencyCode || defaultCurrency,
});

function FieldError({ id, children }) {
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-xs text-[var(--error-text)]">
      <IoInformationCircleOutline aria-hidden="true" className="h-3.5 w-3.5 flex-none" />
      <span>{children}</span>
    </p>
  );
}

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionError, setActionError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSlowSaving = useSlowAction(isSaving);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const nextValues = getEquivalentFormValues(equivalent, defaultCurrency);
    setFormName(nextValues.name);
    setFormAmount(nextValues.amount);
    setFormCurrency(nextValues.currency);
    setFieldErrors({});
    setActionError(null);
    setIsSaving(false);
  }, [isOpen, equivalent?.id, defaultCurrency]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    const trimmedName = formName.trim();
    const numericAmount = Number(formAmount);
    const nextErrors = {};

    if (!trimmedName) {
      nextErrors.name = t('enterEquivalentNameToContinue');
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = t('enterEquivalentAmountToContinue');
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setActionError(null);
      if (nextErrors.name) nameInputRef.current?.focus();
      else document.getElementById('equivalent-amount')?.focus();
      return;
    }

    setFieldErrors({});
    setActionError(null);
    setIsSaving(true);
    try {
      await onSave({
        name: trimmedName,
        amount: numericAmount,
        currencyCode: formCurrency,
      });
    } catch (saveError) {
      console.error('Error saving value equivalent:', saveError);
      setActionError(
        saveError?.code === 'guest_value_equivalent_limit'
          ? t('guestValueEquivalentLimitReached', { limit: saveError.limit })
          : t('equivalentSaveErrorBody')
      );
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

          {actionError && (
            <ErrorCard
              title={t('notSavedYet')}
              body={actionError}
              onDismiss={() => setActionError(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="equivalent-name" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                {t('equivalentName')}
              </label>
              <input
                ref={nameInputRef}
                id="equivalent-name"
                type="text"
                value={formName}
                onChange={(event) => {
                  setFormName(event.target.value);
                  if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: null }));
                }}
                placeholder={t('enterEquivalentName')}
                aria-invalid={fieldErrors.name ? 'true' : undefined}
                aria-describedby={fieldErrors.name ? 'equivalent-name-error' : undefined}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent)]/20 ${
                  fieldErrors.name
                    ? 'border-[1.5px] border-[var(--error-outline)]'
                    : 'border-[var(--border)] focus:border-[var(--accent)]'
                }`}
              />
              {fieldErrors.name && (
                <FieldError id="equivalent-name-error">{fieldErrors.name}</FieldError>
              )}
            </div>

            <div>
              <label htmlFor="equivalent-amount" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                {t('equivalentAmount')}
              </label>
              <CurrencyInput
                id="equivalent-amount"
                value={formAmount}
                onChange={(event) => {
                  setFormAmount(event.target.value);
                  if (fieldErrors.amount) setFieldErrors((current) => ({ ...current, amount: null }));
                }}
                currencyCode={formCurrency}
                placeholder={t('enterEquivalentAmount')}
                aria-invalid={fieldErrors.amount ? 'true' : undefined}
                aria-describedby={fieldErrors.amount ? 'equivalent-amount-error' : undefined}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent)]/20 ${
                  fieldErrors.amount
                    ? 'border-[1.5px] border-[var(--error-outline)]'
                    : 'border-[var(--border)] focus:border-[var(--accent)]'
                }`}
              />
              {fieldErrors.amount && (
                <FieldError id="equivalent-amount-error">{fieldErrors.amount}</FieldError>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                {t('currency')}
              </label>
              <select
                value={formCurrency}
                onChange={(event) => setFormCurrency(event.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-white"
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
                className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[#F6F7F8] disabled:opacity-50"
                onClick={onCancel}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving || isExiting}
                aria-busy={isSaving ? 'true' : undefined}
                className="flex-1 rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#146E65] disabled:opacity-50"
              >
                {isSaving ? <ActionLoadingContent label={t('saving')} /> : t('save')}
              </button>
            </div>
            {isSlowSaving && (
              <p role="status" className="text-center text-xs text-[var(--text-secondary)]">
                {t('saving')}
              </p>
            )}
          </form>
        </>
      )}
    </SettingsModalTransition>
  );
}

export default EquivalentFormModal;

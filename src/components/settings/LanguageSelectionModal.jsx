import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsModalTransition from './SettingsModalTransition';

function LanguageSelectionModal({
  isOpen,
  languages,
  selectedLanguage,
  onSelect,
  onRequestClose,
  onExitComplete,
}) {
  const { t } = useTranslation();

  return (
    <SettingsModalTransition
      isOpen={isOpen}
      backdropClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      dialogClassName="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      ariaLabelledby="language-selection-title"
      onBackdropClick={onRequestClose}
      onExitComplete={onExitComplete}
    >
      {({ isExiting }) => (
        <>
        <div className="p-3.5 border-b border-gray-100 bg-slate-50">
          <h3 id="language-selection-title" className="text-center font-semibold text-sm text-slate-800">
            {t('selectLanguage')}
          </h3>
        </div>
        {languages.map((languageOption) => (
          <button
            key={languageOption.code}
            type="button"
            className={
              'w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-0 font-medium text-sm flex items-center justify-between ' +
              (languageOption.code === selectedLanguage
                ? 'text-[#2F7473] font-semibold'
                : 'text-gray-700')
            }
            onClick={() => onSelect(languageOption.code)}
            disabled={isExiting}
          >
            <span>{languageOption.name}</span>
            {languageOption.code === selectedLanguage && (
              <span className="w-2 h-2 rounded-full bg-[#2F7473]" />
            )}
          </button>
        ))}
        </>
      )}
    </SettingsModalTransition>
  );
}

export default LanguageSelectionModal;

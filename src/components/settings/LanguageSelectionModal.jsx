import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSelectionModal({
  isOpen,
  isClosing,
  languages,
  selectedLanguage,
  onSelect,
  onRequestClose,
}) {
  const { t } = useTranslation();

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      className={
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 ' +
        (isClosing ? 'animate-calm-backdrop-exit' : 'animate-calm-backdrop')
      }
      onClick={() => {
        if (!isClosing) {
          onRequestClose();
        }
      }}
    >
      <div
        className={
          'w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ' +
          (isClosing
            ? 'animate-calm-modal-exit pointer-events-none'
            : 'animate-calm-modal-glide')
        }
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-selection-title"
      >
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
          >
            <span>{languageOption.name}</span>
            {languageOption.code === selectedLanguage && (
              <span className="w-2 h-2 rounded-full bg-[#2F7473]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSelectionModal;

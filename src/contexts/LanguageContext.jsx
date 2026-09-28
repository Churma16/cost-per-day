import React, { createContext, useContext, useEffect } from 'react';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../constants/preferences';

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES };

export const sanitizeLanguage = (languageCode) => {
  if (languageCode && typeof languageCode === 'string') {
    const normalized = languageCode.trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(normalized)) return normalized;
  }
  return DEFAULT_LANGUAGE;
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const settingsQuery = useSettings();
  const updateSettingMutation = useUpdateSetting();
  const isLoading = settingsQuery.isLoading && !settingsQuery.data;
  const language = settingsQuery.data
    ? sanitizeLanguage(settingsQuery.data.language)
    : sanitizeLanguage(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    if (!settingsQuery.isLoading) i18n.changeLanguage(language);
  }, [language, settingsQuery.isLoading]);

  const changeLanguage = async (languageCode) => {
    const nextLanguage = sanitizeLanguage(languageCode);
    await updateSettingMutation.mutateAsync({ key: 'language', value: nextLanguage });
    await i18n.changeLanguage(nextLanguage);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      isLoading,
      error: settingsQuery.error || updateSettingMutation.error
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

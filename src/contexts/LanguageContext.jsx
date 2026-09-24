import React, { createContext, useContext, useEffect } from 'react';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import i18n from '../i18n';

export const SUPPORTED_LANGUAGES = ['en', 'id'];
export const DEFAULT_LANGUAGE = 'en';

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
  const language = sanitizeLanguage(settingsQuery.data?.language);

  useEffect(() => {
    if (!settingsQuery.isLoading) i18n.changeLanguage(language);
  }, [language, settingsQuery.isLoading]);

  const changeLanguage = async (languageCode) => {
    const nextLanguage = sanitizeLanguage(languageCode);
    await updateSettingMutation.mutateAsync({ key: 'language', value: nextLanguage });
    await i18n.changeLanguage(nextLanguage);
  };

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-purple-600">Loading...</div>
    </div>;
  }

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      error: settingsQuery.error || updateSettingMutation.error
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

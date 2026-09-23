import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSetting, updateSetting } from '../services/api';
import i18n from '../i18n';

export const SUPPORTED_LANGUAGES = ['en', 'id'];
export const DEFAULT_LANGUAGE = 'en';

export const sanitizeLanguage = (languageCode) => {
  if (languageCode && typeof languageCode === 'string') {
    const normalized = languageCode.trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(normalized)) {
      return normalized;
    }
  }
  return DEFAULT_LANGUAGE;
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LANGUAGE);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        setLoading(true);
        setError(null);
        const rawLanguage = await getSetting('language');
        const language = sanitizeLanguage(rawLanguage);
        setCurrentLanguage(language);
        await i18n.changeLanguage(language);
      } catch (loadError) {
        console.error('Error loading language:', loadError);
        setError(loadError);
        await i18n.changeLanguage(DEFAULT_LANGUAGE);
      } finally {
        setLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = async (languageCode) => {
    const sanitizedLanguage = sanitizeLanguage(languageCode);
    try {
      setError(null);
      await updateSetting('language', sanitizedLanguage);
      await i18n.changeLanguage(sanitizedLanguage);
      setCurrentLanguage(sanitizedLanguage);
    } catch (updateError) {
      console.error('Error changing language:', updateError);
      setError(updateError);
      throw updateError;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-purple-600">Loading...</div>
    </div>;
  }

  return (
    <LanguageContext.Provider value={{
      language: currentLanguage,
      changeLanguage,
      error
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

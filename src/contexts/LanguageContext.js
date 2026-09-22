import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSetting, updateSetting } from '../services/api';
import i18n from '../i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        setLoading(true);
        setError(null);
        const language = await getSetting('language') || 'en';
        setCurrentLanguage(language);
        await i18n.changeLanguage(language);
      } catch (loadError) {
        console.error('Error loading language:', loadError);
        setError(loadError);
        await i18n.changeLanguage('en');
      } finally {
        setLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = async (languageCode) => {
    try {
      setError(null);
      await updateSetting('language', languageCode);
      await i18n.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
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

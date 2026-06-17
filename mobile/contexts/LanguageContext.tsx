import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import zh from '../i18n/zh';
import en from '../i18n/en';
import { storage } from '../utils/storage';

const translations: Record<string, Record<string, string>> = { zh, en };

interface LanguageContextType {
  lang: string;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState('zh');

  useEffect(() => {
    storage.getLang().then((savedLang) => {
      if (savedLang) setLang(savedLang);
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'zh' ? 'en' : 'zh';
      storage.setLang(next);
      return next;
    });
  }, []);

  const t = useCallback((key: string) => {
    return translations[lang]?.[key] || translations.en[key] || translations.zh[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
}

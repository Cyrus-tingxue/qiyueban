import { createContext, useContext, useState, useCallback } from 'react';
import zh from '../i18n/zh';
import en from '../i18n/en';

const translations = { zh, en };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => {
        return localStorage.getItem('lang') || 'zh';
    });

    const toggleLang = useCallback(() => {
        setLang(prev => {
            const next = prev === 'zh' ? 'en' : 'zh';
            localStorage.setItem('lang', next);
            return next;
        });
    }, []);

    const t = useCallback((key) => {
        return translations[lang]?.[key] || translations.zh[key] || key;
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

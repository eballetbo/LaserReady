import { useState, useEffect, ReactNode } from 'react';
import { translations } from '../i18n/translations';
import { LanguageContext, Language, TranslationKey } from './language-context';

export type { TranslationKey } from './language-context';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('language') as Language;
        return saved || 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key: TranslationKey): string => {
        const langTrans = translations[language] || translations['en'];
        return langTrans[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

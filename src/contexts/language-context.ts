import { createContext } from 'react';
import { Translation } from '../i18n/en';

type Language = 'en' | 'es' | 'ca';
export type TranslationKey = keyof Translation;

export interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

export type { Language };

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

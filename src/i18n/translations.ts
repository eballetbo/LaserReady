import { en, Translation } from './en';
import { es } from './es';
import { ca } from './ca';

export interface Translations {
    en: Translation;
    es: Translation;
    ca: Translation;
}

export const translations: Translations = {
    en,
    es,
    ca
};

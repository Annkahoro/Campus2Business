import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import en from './locales/en/index.js';
import es from './locales/es/index.js';

export const SUPPORTED_LANGS = ['en', 'es'];

const syncLang = (lng) => {
  const lang = SUPPORTED_LANGS.includes(lng) ? lng : 'en';
  document.documentElement.lang = lang;
  dayjs.locale(lang);
};

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en, es },
  fallbackLng: import.meta.env.VITE_DEFAULT_LANG || 'en',
  supportedLngs: SUPPORTED_LANGS,
  nonExplicitSupportedLngs: true, // "es-ES" → "es"
  load: 'languageOnly',
  ns: ['common', 'auth', 'profile', 'admin', 'org', 'learner', 'pathway', 'learning', 'landing', 'reports', 'account', 'errors', 'notifications'],
  defaultNS: 'common',
  fallbackNS: 'common', // shared keys (actions.*, status.*) resolve from any namespace
  interpolation: { escapeValue: false },
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
});

syncLang(i18n.resolvedLanguage);
i18n.on('languageChanged', syncLang);

export default i18n;

import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { defaultNS, resources } from './resources'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    ns: ['common', 'map', 'places', 'trips', 'auth', 'search', 'layers'],
    // `en` is the only locale today; Spanish arrives by copying the structure.
    supportedLngs: ['en'],
    fallbackLng: 'en',
    interpolation: {
      // React escapes for us.
      escapeValue: false,
    },
  })

export default i18n

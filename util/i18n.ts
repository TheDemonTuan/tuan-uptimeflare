import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from '../locales/vi/common.json'
import en from '../locales/en/common.json'
import zhCN from '../locales/zh-CN/common.json'
import zhTW from '../locales/zh-TW/common.json'
import frFR from '../locales/fr-FR/common.json'
import deDE from '../locales/de-DE/common.json'

export type Locale = 'vi' | 'en' | 'de-DE' | 'fr-FR' | 'zh-CN' | 'zh-TW'

const locales: readonly Locale[] = ['vi', 'en', 'de-DE', 'fr-FR', 'zh-CN', 'zh-TW']

export function resolveLocale(cookieHeader?: string): Locale {
  const cookie = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith('UPTIMEFLARE_LOCALE='))
  if (!cookie) return 'vi'
  try {
    const value = decodeURIComponent(cookie.slice('UPTIMEFLARE_LOCALE='.length))
    return locales.includes(value as Locale) ? (value as Locale) : 'vi'
  } catch {
    return 'vi'
  }
}

export function createI18n(locale: Locale) {
  const instance = createInstance()
  void instance.use(initReactI18next).init({
    lng: locale,
    resources: {
      vi: { common: vi },
      en: { common: en },
      'zh-CN': { common: zhCN },
      zh: { common: zhCN },
      'zh-TW': { common: zhTW },
      fr: { common: frFR },
      'fr-FR': { common: frFR },
      de: { common: deDE },
      'de-DE': { common: deDE },
    },
    ns: ['common'],
    defaultNS: 'common',
    fallbackLng: 'en',
    initAsync: false,
    interpolation: { escapeValue: false },
  })
  return instance
}

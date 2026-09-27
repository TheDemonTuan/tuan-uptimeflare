import '@mantine/core/styles.css'
import type { AppProps } from 'next/app'
import { MantineProvider } from '@mantine/core'
import { useMemo } from 'react'
import { I18nextProvider } from 'react-i18next'
import { createI18n, type Locale } from '@/util/i18n'

export default function App({ Component, pageProps }: AppProps<{ locale?: Locale; accessDenied?: boolean }>) {
  const locale = pageProps.accessDenied ? 'vi' : pageProps.locale ?? 'vi'
  const i18n = useMemo(() => createI18n(locale), [locale])
  return (
    <I18nextProvider i18n={i18n}>
      <MantineProvider defaultColorScheme="auto">
        <Component {...pageProps} />
      </MantineProvider>
    </I18nextProvider>
  )
}

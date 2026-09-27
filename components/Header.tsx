import { Container, Group, Image, useMantineColorScheme } from '@mantine/core'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import classes from '@/styles/Header.module.css'
import { pageConfig } from '@/page.config'
import type { PageConfigLink } from '@/types/config'
import type { Locale } from '@/util/i18n'

const languageOptions: { value: Locale; label: string }[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
]

const controlStyle: CSSProperties = {
  minHeight: 44,
  border: '1px solid var(--mantine-color-default-border)',
  borderRadius: 10,
  color: 'var(--mantine-color-text)',
  background: 'var(--mantine-color-body)',
  padding: '0 8px',
}

export default function Header({ style }: { style?: CSSProperties }) {
  const { t, i18n } = useTranslation('common')
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const links: PageConfigLink[] = [
    { label: t('Overview'), link: '/' },
    { label: t('Incidents & maintenance'), link: '/incidents' },
    ...(pageConfig.links || []),
  ]

  return (
    <header className={classes.header} style={{ height: 'auto', minHeight: 64, marginBottom: 24, ...style }}>
      <Container size={1280} className={classes.inner} style={{ height: 'auto', minHeight: 64, flexWrap: 'wrap', gap: 16, padding: '8px 16px' }}>
        <Link href="/" aria-label={pageConfig.title || 'UptimeFlare'} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, maxWidth: '100%', color: 'inherit', textDecoration: 'none' }}>
          <Image
            src={pageConfig.logo ?? '/logo.svg'}
            h={48}
            w={140}
            fit="contain"
            alt={pageConfig.title || 'UptimeFlare'}
          />
          <span style={{ fontWeight: 700 }}>{pageConfig.title}</span>
        </Link>
        <Group gap={8} wrap="wrap" style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
          {links.map((link) =>
            link.link.startsWith('/') ? (
              <Link key={link.link} href={link.link} className={classes.link} data-active={link.highlight}>
                {link.label}
              </Link>
            ) : (
              <a key={link.link} href={link.link} target="_blank" rel="noopener noreferrer" className={classes.link} data-active={link.highlight}>
                {link.label}
              </a>
            )
          )}
          <select
            aria-label={t('Language')}
            value={i18n.language}
            onChange={(event) => {
              const locale = event.currentTarget.value as Locale
              document.cookie = `UPTIMEFLARE_LOCALE=${encodeURIComponent(locale)}; Path=/; SameSite=Lax; Max-Age=31536000${location.protocol === 'https:' ? '; Secure' : ''}`
              document.documentElement.lang = locale
              void i18n.changeLanguage(locale)
            }}
            style={controlStyle}
          >
            {languageOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            aria-label={t('Theme')}
            value={colorScheme}
            onChange={(event) => setColorScheme(event.currentTarget.value as 'auto' | 'light' | 'dark')}
            style={controlStyle}
          >
            <option value="auto">{t('System')}</option>
            <option value="light">{t('Light')}</option>
            <option value="dark">{t('Dark')}</option>
          </select>
        </Group>
      </Container>
    </header>
  )
}

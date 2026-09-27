import { useMantineColorScheme } from '@mantine/core'
import { IconActivity, IconMoon, IconSun } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
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

export default function Header({ style }: { style?: CSSProperties }) {
  const { t, i18n } = useTranslation('common')
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const router = useRouter()

  const links: PageConfigLink[] = [
    { label: t('Overview'), link: '/' },
    { label: t('Incidents & maintenance'), link: '/incidents' },
    ...(pageConfig.links || []),
  ]

  const title = pageConfig.title || 'Status'

  return (
    <header className={classes.header} style={style}>
      <div className={classes.inner}>
        <Link href="/" className={classes.brand} aria-label={title}>
          <div className={classes.brandBadge}>
            <IconActivity size={18} stroke={2.2} />
          </div>
          <span>{title}</span>
        </Link>

        <nav className={classes.navGroup} aria-label="Main Navigation">
          {links.map((link) => {
            const isInternal = link.link.startsWith('/')
            const isActive = isInternal && (router.asPath === link.link || (link.link === '/' && router.pathname === '/'))
            return isInternal ? (
              <Link
                key={link.link}
                href={link.link}
                className={classes.navLink}
                data-active={isActive ? 'true' : undefined}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.link}
                href={link.link}
                target="_blank"
                rel="noopener noreferrer"
                className={classes.navLink}
              >
                {link.label}
              </a>
            )
          })}

          <select
            aria-label={t('Language')}
            value={i18n.language}
            onChange={(event) => {
              const locale = event.currentTarget.value as Locale
              document.cookie = `UPTIMEFLARE_LOCALE=${encodeURIComponent(locale)}; Path=/; SameSite=Lax; Max-Age=31536000${location.protocol === 'https:' ? '; Secure' : ''}`
              document.documentElement.lang = locale
              void i18n.changeLanguage(locale)
            }}
            className={classes.controlSelect}
          >
            {languageOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label={t('Theme')}
            value={colorScheme}
            onChange={(event) => setColorScheme(event.currentTarget.value as 'auto' | 'light' | 'dark')}
            className={classes.controlSelect}
          >
            <option value="auto">🖥️ {t('System')}</option>
            <option value="light">☀️ {t('Light')}</option>
            <option value="dark">🌙 {t('Dark')}</option>
          </select>
        </nav>
      </div>
    </header>
  )
}

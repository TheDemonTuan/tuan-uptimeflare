import { Divider } from '@mantine/core'
import { pageConfig } from '@/page.config'

export default function Footer() {

  return (
    <>
      <Divider mt="lg" />
      {pageConfig.customFooter !== undefined ? (
        <div dangerouslySetInnerHTML={{ __html: pageConfig.customFooter }} />
      ) : (
        <p style={{ textAlign: 'center', fontSize: 12, marginTop: 10 }}>
          Open-source monitoring and status page powered by{' '}
          <a href="https://github.com/lyc8503/UptimeFlare" target="_blank" rel="noopener noreferrer">Uptimeflare</a>, made with ❤ by{' '}
          <a href="https://github.com/lyc8503" target="_blank" rel="noopener noreferrer">lyc8503</a>.
        </p>
      )}
    </>
  )
}

import { Divider } from '@mantine/core'
import { pageConfig } from '@/page.config'

export default function Footer() {

  return (
    <footer style={{ marginTop: 48, paddingBottom: 32, textAlign: 'center' }}>
      <Divider mb="lg" />
      {pageConfig.customFooter !== undefined ? (
        <div dangerouslySetInnerHTML={{ __html: pageConfig.customFooter }} />
      ) : (
        <p style={{ fontSize: 13, color: 'var(--mantine-color-dimmed)', margin: 0 }}>
          {pageConfig.title ?? 'Status'}
        </p>
      )}
    </footer>
  )
}

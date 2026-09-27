import Document, { Html, Head, Main, NextScript, type DocumentContext } from 'next/document'
import { ColorSchemeScript } from '@mantine/core'
import { resolveLocale, type Locale } from '@/util/i18n'

export default class StatusDocument extends Document<{ locale: Locale }> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps, locale: resolveLocale(ctx.req?.headers.cookie) }
  }

  render() {
    return (
      <Html lang={this.props.locale}>
        <Head>
          <ColorSchemeScript defaultColorScheme="auto" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

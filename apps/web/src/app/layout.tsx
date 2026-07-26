import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

import './globals.css'

const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: {
    template: '%s | RocketReality',
    default: 'RocketReality — reality bez přemrštěných cen',
  },
  description:
    'Prodej a pronájem bytů, domů i pozemků v celé ČR. Soukromá inzerce od 0 Kč, žádné provize platformě.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" className={poppins.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}

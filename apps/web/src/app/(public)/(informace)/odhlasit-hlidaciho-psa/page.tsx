import { getDb, savedSearches } from '@rocket/db'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Odhlášení hlídacího psa',
  robots: { index: false },
}

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string | string[] }>
}

/** Vypne hlídacího psa podle unikátního tokenu z e-mailu — funguje bez přihlášení. */
async function deactivateByToken(token: string): Promise<string | null> {
  const [updated] = await getDb()
    .update(savedSearches)
    .set({ isActive: false })
    .where(eq(savedSearches.unsubscribeToken, token))
    .returning({ name: savedSearches.name })
  return updated?.name ?? null
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams
  const token = Array.isArray(params.token) ? params.token[0] : params.token
  const deactivatedName = token ? await deactivateByToken(token) : null

  return (
    <article>
      <h1 className="text-3xl font-semibold">Odhlášení hlídacího psa</h1>
      {deactivatedName ? (
        <>
          <p className="mt-4 leading-relaxed">
            Hlídací pes <strong>„{deactivatedName}"</strong> byl vypnut. Na tuto adresu už
            upozornění na nové inzeráty chodit nebudou.
          </p>
          <p className="mt-4 leading-relaxed">
            Hlídání můžete kdykoli znovu zapnout ve svém účtu v sekci{' '}
            <Link href="/muj-ucet/hlidaci-pes" className="text-brand-500 hover:text-primary">
              Hlídací pes
            </Link>
            .
          </p>
        </>
      ) : (
        <p className="mt-4 leading-relaxed">
          Odkaz pro odhlášení je neplatný — hlídací pes už možná byl smazán. Svá uložená hledání
          spravujete v sekci{' '}
          <Link href="/muj-ucet/hlidaci-pes" className="text-brand-500 hover:text-primary">
            Hlídací pes
          </Link>
          .
        </p>
      )}
    </article>
  )
}

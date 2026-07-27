import { getDb, importFeeds } from '@rocket/db'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deactivateApiKey } from '@/features/api-keys/actions'
import { CreateApiKeyForm } from '@/features/api-keys/create-api-key-form'
import { requireUser } from '@/lib/require-user'

export const metadata = { title: 'API klíče' }

export default async function ApiKeysPage() {
  const user = await requireUser()
  const db = getDb()
  const keys = await db
    .select({
      id: importFeeds.id,
      label: importFeeds.label,
      isActive: importFeeds.isActive,
      lastRunAt: importFeeds.lastRunAt,
      createdAt: importFeeds.createdAt,
    })
    .from(importFeeds)
    .where(eq(importFeeds.createdByUserId, user.id))
    .orderBy(desc(importFeeds.createdAt))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">API klíče</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Klíčem se autorizuje import inzerátů z realitního softwaru přes{' '}
          <code className="rounded bg-brand-50 px-1 font-mono">POST /api/import/inzeraty</code> —
          postup a formát najdete v{' '}
          <Link href="/api-dokumentace" className="text-brand-500 hover:text-primary">
            dokumentaci API
          </Link>
          . Importované inzeráty se založí pod vaším účtem a projdou běžnou moderací.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nový klíč</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateApiKeyForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vaše klíče</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím nemáte žádný API klíč.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Název</th>
                    <th className="px-4 py-3">Stav</th>
                    <th className="px-4 py-3">Poslední import</th>
                    <th className="px-4 py-3">Vytvořen</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{key.label || 'Bez názvu'}</td>
                      <td className="px-4 py-3">
                        {key.isActive ? (
                          <Badge variant="success">Aktivní</Badge>
                        ) : (
                          <Badge variant="muted">Deaktivovaný</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {key.lastRunAt ? key.lastRunAt.toLocaleString('cs-CZ') : '—'}
                      </td>
                      <td className="px-4 py-3">{key.createdAt.toLocaleDateString('cs-CZ')}</td>
                      <td className="px-4 py-3 text-right">
                        {key.isActive ? (
                          <form
                            action={async () => {
                              'use server'
                              await deactivateApiKey(key.id)
                            }}
                          >
                            <Button type="submit" variant="outline" size="sm">
                              Deaktivovat
                            </Button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

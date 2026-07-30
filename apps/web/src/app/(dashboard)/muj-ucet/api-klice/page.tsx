import { getDb, importFeeds } from '@rocket/db'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deactivateApiKey } from '@/features/api-keys/actions'
import { CreateApiKeyForm } from '@/features/api-keys/create-api-key-form'
import { CreateRpcAccessForm } from '@/features/api-keys/create-rpc-access-form'
import { requireUser } from '@/lib/require-user'

export const metadata = { title: 'Přístupy pro import' }

export default async function ApiKeysPage() {
  const user = await requireUser()
  const db = getDb()
  const keys = await db
    .select({
      id: importFeeds.id,
      label: importFeeds.label,
      type: importFeeds.type,
      clientId: importFeeds.clientId,
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
        <h1 className="text-2xl font-semibold text-heading">Přístupy pro import</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Inzeráty k nám dostanete dvěma způsoby. Pokud váš realitní software umí exportovat na
          realitní portály, použijte <strong className="text-heading">přístup pro export</strong>{' '}
          níže — stačí v něm přidat naši adresu a údaje, žádné programování. Pokud si napojení
          píšete sami, sáhněte po <strong className="text-heading">API klíči</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Přístup pro váš realitní software</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Vystavujeme rozhraní, které běžné exportní programy už umí. V nastavení exportu zadáte
            adresu <code className="rounded bg-brand-50 px-1 font-mono">/RPC2</code> na naší doméně,
            číslo klienta a heslo, které dostanete po zřízení přístupu. Inzeráty i fotky se pak
            přenášejí automaticky a projdou běžnou moderací.
          </p>
          <CreateRpcAccessForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-heading">API klíče</h2>
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
          <CardTitle className="text-base">Vaše přístupy</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím nemáte žádný přístup.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Název</th>
                    <th className="px-4 py-3">Druh</th>
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {key.type === 'xml_rpc'
                          ? `Export ze softwaru (klient ${key.clientId ?? '—'})`
                          : 'API klíč'}
                      </td>
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

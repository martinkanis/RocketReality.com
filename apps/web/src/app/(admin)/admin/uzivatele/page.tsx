import { getDb, listings, users } from '@rocket/db'
import { ACCOUNT_TYPE_LABELS } from '@rocket/shared'
import { desc, eq, sql } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Uživatelé' }

export default async function AdminUsersPage() {
  const db = getDb()
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accountType: users.accountType,
      role: users.role,
      emailVerified: users.emailVerified,
      banned: users.banned,
      createdAt: users.createdAt,
      listingCount: sql<number>`count(${listings.id})::int`,
    })
    .from(users)
    .leftJoin(listings, eq(listings.ownerUserId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(100)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-heading">Uživatelé</h1>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Jméno</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Inzerátů</th>
              <th className="px-4 py-3">Registrace</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {row.name}
                  {row.role === 'superadmin' ? (
                    <Badge variant="accent" className="ml-2">
                      Admin
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">
                  {ACCOUNT_TYPE_LABELS[row.accountType] ?? row.accountType}
                </td>
                <td className="px-4 py-3">
                  {row.banned ? (
                    <Badge variant="destructive">Blokován</Badge>
                  ) : row.emailVerified ? (
                    <Badge variant="success">Ověřen</Badge>
                  ) : (
                    <Badge variant="muted">Neověřen</Badge>
                  )}
                </td>
                <td className="px-4 py-3">{row.listingCount}</td>
                <td className="px-4 py-3">{row.createdAt.toLocaleDateString('cs-CZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

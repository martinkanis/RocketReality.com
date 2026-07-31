import { REWARD_LIMITS } from '@rocket/config'
import { agencies, getDb, users } from '@rocket/db'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/require-user'
import { getAgencyMembership } from '@/lib/session'
import { ChangePasswordForm } from './change-password-form'
import { PayoutIbanForm } from './payout-iban-form'
import { ProfileForm } from './profile-form'
import { SignOutButton } from './sign-out-button'

export const metadata: Metadata = { title: 'Nastavení účtu' }

export default async function AccountSettingsPage() {
  const sessionUser = await requireUser()
  const [user] = await getDb()
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      payoutIban: users.payoutIban,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1)
  if (!user) {
    throw new Error(`Uživatel ${sessionUser.id} ze session nebyl nalezen v databázi`)
  }

  // Inzeráty pod kanceláří odměňují kancelář, takže i účet patří jí.
  const membership = await getAgencyMembership(sessionUser.id)
  const [agency] = membership
    ? await getDb()
        .select({ payoutIban: agencies.payoutIban })
        .from(agencies)
        .where(eq(agencies.id, membership.agencyId))
        .limit(1)
    : []
  const limits = membership ? REWARD_LIMITS.agency : REWARD_LIMITS.private
  const maxRewardCzk = limits.amountCzkPerListing * limits.maxRewardedListings

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-heading">Nastavení účtu</h1>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Osobní údaje</CardTitle>
            <CardDescription>Účet je vedený na e-mail {user.email}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm defaultName={user.name} defaultPhone={user.phone ?? ''} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Účet pro odměny</CardTitle>
            <CardDescription>
              Za každý zveřejněný inzerát vám pošleme {limits.amountCzkPerListing} Kč, nejvýše{' '}
              {maxRewardCzk.toLocaleString('cs-CZ')} Kč
              {membership ? ' na kancelář' : ''}. Účet zadejte jednou — platí pro všechny vaše
              inzeráty. Necháte-li pole prázdné, použije se platební QR kód z fotek inzerátu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayoutIbanForm
              initialIban={(membership ? agency?.payoutIban : user.payoutIban) ?? ''}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Změna hesla</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Odhlášení</CardTitle>
            <CardDescription>Odhlásí vás na tomto zařízení.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smazání účtu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Chcete-li účet smazat, napište nám na podpora@rocketreality.cz — postaráme se o to.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

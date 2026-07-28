'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  banUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  setUserRoleAction,
  unbanUserAction,
  type ResetPasswordResult,
  type UserActionResult,
} from './user-actions'

interface UserManageDialogProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    banned: boolean
  }
  isSelf: boolean
}

/** Správa uživatele z admin výpisu — role, blokace, reset hesla, smazání. */
export function UserManageDialog({ user, isSelf }: UserManageDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [banReason, setBanReason] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">vy</span>
  }

  function run(action: () => Promise<UserActionResult | ResetPasswordResult>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error)
        return
      }
      if ('password' in result) setGeneratedPassword(result.password)
    })
  }

  const isAdmin = user.role === 'admin'

  return (
    <Dialog
      onOpenChange={() => {
        setError(null)
        setGeneratedPassword(null)
        setConfirmDelete(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Spravovat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section className="space-y-2">
            <h3 className="font-medium text-heading">Role</h3>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => run(() => setUserRoleAction(user.id, isAdmin ? 'user' : 'admin'))}
            >
              {isAdmin ? 'Odebrat roli admin' : 'Povýšit na admina'}
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-heading">Přístup</h3>
            {user.banned ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => run(() => unbanUserAction(user.id))}
              >
                Odblokovat účet
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={banReason}
                  onChange={(event) => setBanReason(event.target.value)}
                  placeholder="Důvod blokace (volitelný)"
                  className="h-8 w-56"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(() => banUserAction(user.id, banReason))}
                >
                  Zablokovat
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-heading">Heslo</h3>
            {generatedPassword ? (
              <p className="rounded-md bg-brand-50 p-3">
                Nové heslo: <code className="font-mono font-semibold">{generatedPassword}</code>
                <br />
                <span className="text-muted-foreground">
                  Zobrazí se jen teď — předejte ho uživateli bezpečnou cestou. Ze všech zařízení byl
                  odhlášen.
                </span>
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => run(() => resetUserPasswordAction(user.id))}
              >
                Vygenerovat nové heslo
              </Button>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-heading">Smazání účtu</h3>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(() => deleteUserAction(user.id))}
                >
                  Opravdu smazat
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Zrušit
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                Smazat účet…
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Nevratné. Účet s inzeráty smazat nejde — použijte blokaci.
            </p>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

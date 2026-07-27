import { redirect } from 'next/navigation'
import { getSessionUser, type SessionUser } from './session'

/** Pro server components a actions vyžadující přihlášení — jinak redirect na login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/prihlaseni')
  return user
}

/** Pro admin sekci — vyžaduje roli superadmin. */
export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (!user.isSuperadmin) redirect('/')
  return user
}

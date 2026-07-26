'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Button type="button" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
      <LogOut />
      {isSigningOut ? 'Odhlašuji…' : 'Odhlásit se'}
    </Button>
  )
}

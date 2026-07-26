import type { ReactNode } from 'react'
import { requireUser } from '@/lib/require-user'
import { DashboardNav } from './dashboard-nav'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireUser()
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
      <aside className="shrink-0 lg:w-56">
        <DashboardNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

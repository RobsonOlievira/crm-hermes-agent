export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { AppProviders } from '@/components/providers/app-providers'
import { AppChrome } from '@/components/layout/app-chrome'
import type { ViewRole } from '@/components/providers/view-role-provider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const tenantId = user.tenantId ?? undefined
  const [modules, tenant] = await Promise.all([
    tenantId
      ? prisma.module.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })
      : Promise.resolve([]),
    tenantId ? prisma.tenant.findUnique({ where: { id: tenantId } }) : Promise.resolve(null),
  ])

  const branding = {
    tenantName: tenant?.name ?? 'NexusCRM',
    logoUrl: tenant?.logoUrl ?? null,
    primaryColor: tenant?.primaryColor ?? '#3B82F6',
    secondaryColor: tenant?.secondaryColor ?? '#10B981',
  }

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
  }

  const initialRole: ViewRole = user.role === 'MANAGER' ? 'MANAGER' : user.role === 'MEMBER' ? 'MEMBER' : 'ADMIN'

  return (
    <AppProviders branding={branding} modules={modules as any} role={initialRole}>
      <AppChrome user={currentUser}>{children}</AppChrome>
    </AppProviders>
  )
}

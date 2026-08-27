export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { LeadTypesManager, LeadTypeRow } from '@/components/lead-types/lead-types-manager'

export default async function LeadTypesPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const types = tenantId
    ? await prisma.leadType.findMany({
        where: { tenantId },
        include: { _count: { select: { leads: true, catalogItems: true } } },
        orderBy: { sortOrder: 'asc' },
      })
    : []

  const rows: LeadTypeRow[] = (types as any[]).map((t) => ({
    id: t.id,
    key: t.key,
    label: t.label,
    color: t.color,
    icon: t.icon,
    description: t.description,
    isSystem: t.isSystem,
    isActive: t.isActive,
    leadCount: t._count?.leads ?? 0,
    catalogCount: t._count?.catalogItems ?? 0,
  }))

  return <LeadTypesManager initial={rows} />
}

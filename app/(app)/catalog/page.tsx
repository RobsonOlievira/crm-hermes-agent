export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { CatalogManager, CatalogRow, LeadTypeOption } from '@/components/catalog/catalog-manager'

export default async function CatalogPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null
  const canManage = user?.role !== 'MEMBER'

  const [items, leadTypes] = await Promise.all([
    tenantId
      ? prisma.catalogItem.findMany({
          where: { tenantId },
          include: { leadType: true, _count: { select: { leads: true } } },
          orderBy: { sortOrder: 'asc' },
        })
      : Promise.resolve([]),
    tenantId
      ? prisma.leadType.findMany({ where: { tenantId, isActive: true }, orderBy: { sortOrder: 'asc' } })
      : Promise.resolve([]),
  ])

  const rows: CatalogRow[] = (items as any[]).map((i) => ({
    id: i.id,
    name: i.name,
    kind: i.kind,
    description: i.description,
    price: i.price,
    objective: i.objective,
    leadTypeId: i.leadTypeId,
    leadTypeLabel: i.leadType?.label ?? null,
    leadTypeColor: i.leadType?.color ?? null,
    leadTypeIcon: i.leadType?.icon ?? null,
    isActive: i.isActive,
    leadCount: i._count?.leads ?? 0,
  }))

  const typeOptions: LeadTypeOption[] = (leadTypes as any[]).map((lt) => ({ id: lt.id, label: lt.label, color: lt.color, icon: lt.icon }))

  return <CatalogManager initial={rows} leadTypes={typeOptions} canManage={canManage} />
}

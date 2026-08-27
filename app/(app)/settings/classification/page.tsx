export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { ClassificationManager, RuleRow, LeadTypeOption, CatalogOption } from '@/components/classification/classification-manager'

export default async function ClassificationPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null
  const canManage = user?.role !== 'MEMBER'

  const [rules, leadTypes, catalogItems] = await Promise.all([
    tenantId
      ? prisma.classificationRule.findMany({
          where: { tenantId },
          include: { leadType: true, catalogItem: true },
          orderBy: { priority: 'asc' },
        })
      : Promise.resolve([]),
    tenantId
      ? prisma.leadType.findMany({ where: { tenantId, isActive: true }, orderBy: { sortOrder: 'asc' } })
      : Promise.resolve([]),
    tenantId
      ? prisma.catalogItem.findMany({ where: { tenantId, isActive: true }, orderBy: { sortOrder: 'asc' } })
      : Promise.resolve([]),
  ])

  const rows: RuleRow[] = (rules as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    keywords: r.keywords ?? [],
    matchType: r.matchType,
    source: r.source,
    leadTypeId: r.leadTypeId,
    leadTypeLabel: r.leadType?.label ?? null,
    leadTypeColor: r.leadType?.color ?? null,
    leadTypeIcon: r.leadType?.icon ?? null,
    catalogItemId: r.catalogItemId,
    catalogItemName: r.catalogItem?.name ?? null,
    autoReply: r.autoReply,
    isActive: r.isActive,
    priority: r.priority,
  }))

  const typeOptions: LeadTypeOption[] = (leadTypes as any[]).map((lt) => ({ id: lt.id, label: lt.label, color: lt.color, icon: lt.icon }))
  const catalogOptions: CatalogOption[] = (catalogItems as any[]).map((ci) => ({ id: ci.id, name: ci.name }))

  return <ClassificationManager initial={rows} leadTypes={typeOptions} catalogItems={catalogOptions} canManage={canManage} />
}

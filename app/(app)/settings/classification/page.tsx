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
          include: { leadTypes: { include: { leadType: true } }, catalogItem: true },
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
    leadTypeIds: (r.leadTypes ?? []).map((lt: any) => lt.leadTypeId),
    leadTypeLabels: (r.leadTypes ?? []).map((lt: any) => lt.leadType?.label ?? null),
    leadTypeColors: (r.leadTypes ?? []).map((lt: any) => lt.leadType?.color ?? null),
    leadTypeIcons: (r.leadTypes ?? []).map((lt: any) => lt.leadType?.icon ?? null),
    catalogItemId: r.catalogItemId,
    catalogItemName: r.catalogItem?.name ?? null,
    autoMessages: r.autoMessages ?? [],
    autoReply: r.autoReply ?? null,
    isActive: r.isActive,
    priority: r.priority,
  }))

  const typeOptions: LeadTypeOption[] = (leadTypes as any[]).map((lt) => ({ id: lt.id, label: lt.label, color: lt.color, icon: lt.icon }))
  const catalogOptions: CatalogOption[] = (catalogItems as any[]).map((ci) => ({ id: ci.id, name: ci.name }))

  return <ClassificationManager initial={rows} leadTypes={typeOptions} catalogItems={catalogOptions} canManage={canManage} />
}

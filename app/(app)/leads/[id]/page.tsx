export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { LeadDetail, LeadDetailData, TimelineItem } from '@/components/leads/lead-detail'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null
  if (!tenantId) return notFound()

  const [leadOptions] = await Promise.all([
    tenantId
      ? Promise.all([
          prisma.leadType.findMany({ where: { tenantId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
          prisma.catalogItem.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } }),
          prisma.user.findMany({ where: { tenantId, role: { in: ['ADMIN', 'MANAGER', 'MEMBER'] } }, orderBy: { name: 'asc' } }),
        ])
      : Promise.resolve([[], [], []]),
  ])
  const [leadTypes, catalogItems, members] = leadOptions

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId },
    include: {
      assignedTo: true,
      leadTypes: { include: { leadType: true } },
      catalogItem: true,
      interactions: { orderBy: { createdAt: 'desc' }, include: { user: true } },
      purchases: { orderBy: { createdAt: 'desc' }, include: { catalogItem: true } },
    },
  })

  if (!lead) return notFound()

  const timeline: TimelineItem[] = (lead.interactions as any[]).map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    content: i.content,
    amount: i.amount,
    userName: i.user?.name ?? null,
    createdAt: i.createdAt?.toISOString?.() ?? '',
  }))

  const data: LeadDetailData = {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    companyName: lead.companyName,
    cnpj: lead.cnpj,
    status: lead.status,
    source: lead.source,
    score: lead.score,
    tags: lead.tags ?? [],
    dealValue: lead.dealValue,
    assignedToName: lead.assignedTo?.name ?? null,
    assignedToAvatar: lead.assignedTo?.avatarUrl ?? null,
    createdAt: lead.createdAt?.toISOString?.() ?? '',
    lastInteraction: lead.lastInteraction?.toISOString?.() ?? null,
    socialMedia: (lead as any).socialMedia ?? null,
    objective: (lead as any).objective ?? null,
    leadTypeLabels: ((lead as any).leadTypes ?? []).map((lt: any) => lt.leadType?.label),
    leadTypeColors: ((lead as any).leadTypes ?? []).map((lt: any) => lt.leadType?.color),
    leadTypeIcons: ((lead as any).leadTypes ?? []).map((lt: any) => lt.leadType?.icon),
    leadTypeIds: ((lead as any).leadTypes ?? []).map((lt: any) => lt.leadTypeId),
    assignedToId: (lead as any).assignedToId ?? null,
    catalogItemName: (lead as any).catalogItem?.name ?? null,
    totalPurchased: (lead as any).totalPurchased ?? 0,
    purchases: ((lead as any).purchases as any[] ?? []).map((p) => ({
      id: p.id,
      description: p.description,
      amount: p.amount,
      createdAt: p.createdAt?.toISOString?.() ?? '',
      catalogItemName: p.catalogItem?.name ?? null,
    })),
    timeline,
    leadTypeOptions: (leadTypes as any[]).map((t) => ({ id: t.id, label: t.label, color: t.color, icon: t.icon })),
    catalogOptions: (catalogItems as any[]).map((c) => ({ id: c.id, name: c.name })),
    memberOptions: (members as any[]).map((m) => ({ id: m.id, name: m.name })),
  }

  return <LeadDetail data={data} />
}

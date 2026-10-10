export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { ClientDetail, ClientDetailData, ClientTimelineItem } from '@/components/clients/client-detail'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null
  if (!tenantId) return notFound()

  const [client, members, leadTypes] = await Promise.all([
    prisma.client.findFirst({
      where: { id: params.id, tenantId },
      include: {
        assignedTo: true,
        leadTypes: { select: { leadType: { select: { id: true, label: true, color: true } } } },
        interactions: { orderBy: { createdAt: 'desc' }, include: { user: true } },
      },
    }),
    prisma.user.findMany({
      where: { tenantId, role: { in: ['ADMIN', 'MANAGER', 'MEMBER'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.leadType.findMany({
      where: { tenantId },
      select: { id: true, label: true, color: true },
      orderBy: { label: 'asc' },
    }),
  ])

  if (!client) return notFound()

  const timeline: ClientTimelineItem[] = (client.interactions as any[]).map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    content: i.content,
    amount: i.amount,
    userName: i.user?.name ?? null,
    createdAt: i.createdAt?.toISOString?.() ?? '',
  }))

  const data: ClientDetailData = {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    companyName: client.companyName,
    cnpj: client.cnpj,
    status: client.status,
    segment: client.segment,
    lifetimeValue: client.lifetimeValue,
    assignedToName: client.assignedTo?.name ?? null,
    assignedToAvatar: client.assignedTo?.avatarUrl ?? null,
    assignedToId: (client as any).assignedToId ?? null,
    leadTypeIds: ((client as any).leadTypes ?? []).map((lt: any) => lt.leadType?.id).filter(Boolean),
    leadTypeLabels: ((client as any).leadTypes ?? []).map((lt: any) => lt.leadType?.label).filter(Boolean),
    leadTypeColors: ((client as any).leadTypes ?? []).map((lt: any) => lt.leadType?.color).filter(Boolean),
    createdAt: client.createdAt?.toISOString?.() ?? '',
    updatedAt: client.updatedAt?.toISOString?.() ?? '',
    timeline,
    memberOptions: members.map((m) => ({ id: m.id, name: m.name })),
    leadTypesOptions: leadTypes,
  }

  return <ClientDetail data={data} />
}
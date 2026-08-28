export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { KanbanBoard, KanbanColumn, KanbanCard, ArchivedCard } from '@/components/pipeline/kanban-board'

export default async function PipelinePage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const pipeline = tenantId
    ? await prisma.pipeline.findFirst({
        where: { tenantId },
include: {
            stages: {
              orderBy: { position: 'asc' },
              include: {
                leads: {
                  where: { tenantId, isArchived: false },
                  include: { assignedTo: true, leadTypes: { include: { leadType: true } } },
                  orderBy: { stagePosition: 'asc' },
                },
              },
            },
          },
      })
    : null

  const archivedLeads = tenantId
    ? await prisma.lead.findMany({
        where: { tenantId, isArchived: true },
        include: { assignedTo: true, leadTypes: { include: { leadType: true } }, stage: true },
        orderBy: { archivedAt: 'desc' },
      })
    : []

  const columns: KanbanColumn[] = ((pipeline?.stages as any[]) ?? []).map((s) => {
    const cards: KanbanCard[] = (s.leads as any[]).map((l) => ({
      id: l.id,
      name: l.name,
      companyName: l.companyName,
      dealValue: l.dealValue,
      status: l.status,
      source: l.source,
      assignedToName: l.assignedTo?.name ?? null,
      assignedToAvatar: l.assignedTo?.avatarUrl ?? null,
      leadTypeIds: (l.leadTypes ?? []).map((lt: any) => lt.leadTypeId),
      leadTypeLabels: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.label),
      leadTypeColors: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.color),
      leadTypeIcons: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.icon),
      objective: l.objective ?? null,
      totalPurchased: l.totalPurchased ?? 0,
      createdAt: (l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt)).toISOString(),
    }))
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      cards,
    }
  })

  const archivedCards: ArchivedCard[] = (archivedLeads as any[]).map((l) => ({
    id: l.id,
    name: l.name,
    companyName: l.companyName,
    dealValue: l.dealValue,
    status: l.status,
    source: l.source,
    assignedToName: l.assignedTo?.name ?? null,
    assignedToAvatar: l.assignedTo?.avatarUrl ?? null,
    leadTypeIds: (l.leadTypes ?? []).map((lt: any) => lt.leadTypeId),
    leadTypeLabels: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.label),
    leadTypeColors: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.color),
    leadTypeIcons: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.icon),
    objective: l.objective ?? null,
    totalPurchased: l.totalPurchased ?? 0,
    createdAt: (l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt)).toISOString(),
    stageId: l.stageId ?? null,
    stageName: l.stage?.name ?? null,
    stageColor: l.stage?.color ?? null,
    archivedAt: l.archivedAt ? (l.archivedAt instanceof Date ? l.archivedAt : new Date(l.archivedAt)).toISOString() : null,
  }))

  return (
    <div>
      <PageHeading
        title="Pipeline de Vendas"
        description="Jornada de compra em 6 etapas. Filtre por período, tipo de lead e objetivo, e arraste os cards para mover cada cliente pela jornada."
      />
      <KanbanBoard initialColumns={columns} initialArchived={archivedCards} />
    </div>
  )
}

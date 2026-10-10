export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { ProjectsTable } from '@/components/projects/projects-table'
import { getOrSeedChecklistStages } from '@/lib/project-checklist'

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') redirect('/')

  const tenantId = user?.tenantId ?? null

  const [projects, clients, members, checklistStages] = tenantId
    ? await Promise.all([
        prisma.project.findMany({
          where: { tenantId },
          include: {
            client: { select: { id: true, name: true, phone: true } },
            assignedTo: { select: { id: true, name: true, avatarUrl: true } },
            installments: { orderBy: { number: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.client.findMany({
          where: { tenantId, status: { not: 'CANCELADO' } },
          select: { id: true, name: true, phone: true, email: true },
          orderBy: { name: 'asc' },
        }),
        prisma.user.findMany({
          where: { tenantId, role: { in: ['ADMIN', 'MANAGER', 'MEMBER'] } },
          select: { id: true, name: true, avatarUrl: true },
          orderBy: { name: 'asc' },
        }),
        getOrSeedChecklistStages(tenantId),
      ])
    : [[], [], [], []]

  return (
    <div>
      <PageHeading
        title="Projetos"
        description="Gerencie todos os projetos vinculados aos seus clientes, parcelas e entregas."
      />
      <ProjectsTable
        projects={projects as any}
        clients={clients}
        members={members}
        checklistStages={checklistStages as any}
      />
    </div>
  )
}

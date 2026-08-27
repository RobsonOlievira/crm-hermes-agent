export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { TeamList, TeamMember } from '@/components/team/team-list'
import { DemoActionButton } from '@/components/shared/demo-action-button'

export default async function TeamPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const users = tenantId
    ? await prisma.user.findMany({
        where: { tenantId },
        include: { _count: { select: { assignedLeads: true, assignedClients: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const members: TeamMember[] = (users as any[]).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    jobTitle: u.jobTitle,
    avatarUrl: u.avatarUrl,
    leads: u._count?.assignedLeads ?? 0,
    clients: u._count?.assignedClients ?? 0,
  }))

  return (
    <div>
      <PageHeading
        title="Equipe"
        description="Gerencie os membros da sua equipe e seus níveis de acesso."
        actions={<DemoActionButton label="Convidar membro" icon="UserCog" title="Convite de membros" description="O envio de convites por email e a definição de permissões serão disponibilizados na próxima etapa desta interface." />}
      />
      <TeamList members={members} />
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { InteractionsFeed, FeedItem } from '@/components/interactions/interactions-feed'

export default async function InteractionsPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const interactions = tenantId
    ? await prisma.interaction.findMany({
        where: { tenantId },
        include: { user: true, lead: true, client: true },
        orderBy: { createdAt: 'desc' },
        take: 60,
      })
    : []

  const items: FeedItem[] = (interactions as any[]).map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    content: i.content,
    amount: i.amount,
    userName: i.user?.name ?? null,
    targetName: i.lead?.name ?? i.client?.name ?? null,
    createdAt: i.createdAt?.toISOString?.() ?? '',
  }))

  return (
    <div>
      <PageHeading
        title="Interações"
        description="Acompanhe todas as atividades e o histórico de contatos da sua operação."
      />
      <InteractionsFeed items={items} />
    </div>
  )
}

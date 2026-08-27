export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { listConversations } from '@/lib/conversations'
import { InboxBoard, ConversationRow } from '@/components/whatsapp/inbox-board'

export default async function WhatsappPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const [leads, tenant] = tenantId
    ? await Promise.all([
        listConversations(tenantId, { limit: 100 }),
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { waOutboundWebhook: true },
        }),
      ])
    : [[], null]

  const initialConversations: ConversationRow[] = (leads as any[]).map((l) => ({
    leadId: l.id,
    name: l.name,
    phone: l.phone,
    status: l.status,
    leadTypeLabel: l.leadType?.label ?? null,
    leadTypeColor: l.leadType?.color ?? null,
    assignedToName: l.assignedTo?.name ?? null,
    lastMessageText: l.lastMessageText,
    lastMessageAt: l.lastMessageAt ? l.lastMessageAt.toISOString() : null,
    unreadCount: l.unreadCount ?? 0,
    isArchived: l.isArchived ?? false,
  }))

  return (
    <InboxBoard
      initialConversations={initialConversations}
      currentUserName={user?.name ?? 'Atendente'}
      webhookConfigured={!!tenant?.waOutboundWebhook}
    />
  )
}

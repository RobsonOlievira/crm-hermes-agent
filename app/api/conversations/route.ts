export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { listConversations } from '@/lib/conversations'

// Lista as conversas do tenant (leads com mensagens), ordenadas pela última mensagem.
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim() || undefined
  const onlyUnread = searchParams.get('unread') === '1'
  try {
    const leads = await listConversations(user.tenantId, { search, onlyUnread })
    const conversations = leads.map((l: any) => ({
      leadId: l.id,
      name: l.name,
      phone: l.phone,
      status: l.status,
      leadTypeLabels: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.label),
      leadTypeColors: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.color),
      assignedToName: l.assignedTo?.name ?? null,
      lastMessageText: l.lastMessageText,
      lastMessageAt: l.lastMessageAt ? l.lastMessageAt.toISOString() : null,
      unreadCount: l.unreadCount,
      isArchived: l.isArchived,
    }))
    return NextResponse.json({ conversations })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao carregar conversas' }, { status: 500 })
  }
}

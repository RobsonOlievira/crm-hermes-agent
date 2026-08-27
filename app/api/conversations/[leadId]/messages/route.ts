export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { recordOutboundMessage, notifyOutboundWebhook } from '@/lib/conversations'

// Retorna as mensagens de uma conversa (ordem cronológica).
export async function GET(_req: Request, { params }: { params: { leadId: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const lead = await prisma.lead.findFirst({
    where: { id: params.leadId, tenantId: user.tenantId },
    include: {
      leadType: { select: { label: true, color: true } },
      assignedTo: { select: { name: true } },
    },
  })
  if (!lead) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  const [messages, messageCount] = await Promise.all([
    prisma.message.findMany({
      where: { tenantId: user.tenantId, leadId: params.leadId },
      orderBy: { timestamp: 'asc' },
      take: 500,
    }),
    prisma.message.count({ where: { tenantId: user.tenantId, leadId: params.leadId } }),
  ])
  return NextResponse.json({
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      companyName: lead.companyName,
      status: lead.status,
      source: lead.source,
      score: lead.score,
      tags: lead.tags,
      dealValue: lead.dealValue,
      totalPurchased: lead.totalPurchased,
      objective: lead.objective,
      leadTypeLabel: lead.leadType?.label ?? null,
      leadTypeColor: lead.leadType?.color ?? null,
      assignedToName: lead.assignedTo?.name ?? null,
      firstContactAt: lead.firstContactAt ? lead.firstContactAt.toISOString() : null,
      messageCount,
    },
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      content: m.content,
      status: m.status,
      senderName: m.senderName,
      isFromBot: m.isFromBot,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      timestamp: m.timestamp.toISOString(),
    })),
  })
}

// Envia uma mensagem ao lead a partir do painel (registra + dispara webhook do bot).
export async function POST(req: Request, { params }: { params: { leadId: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const lead = await prisma.lead.findFirst({ where: { id: params.leadId, tenantId: user.tenantId } })
  if (!lead) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  try {
    const body = await req.json()
    const text = String(body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    const { messageId } = await recordOutboundMessage(user.tenantId, params.leadId, {
      text,
      senderName: user.name,
      isFromBot: false,
      status: 'SENT',
    })
    await notifyOutboundWebhook(user.tenantId, {
      leadId: lead.id,
      phone: lead.phone,
      leadName: lead.name,
      text,
      messageId,
      senderName: user.name,
    })
    return NextResponse.json({ ok: true, messageId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao enviar mensagem' }, { status: 500 })
  }
}

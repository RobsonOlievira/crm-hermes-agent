import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// Lógica compartilhada da Central de Conversas (WhatsApp).
// Usada tanto pelas rotas de API (autenticadas por sessão) quanto pelas
// ferramentas MCP (autenticadas por token do tenant / Hermes Agent).
// TODAS as operações são obrigatoriamente restritas ao tenantId.
// ---------------------------------------------------------------------------

export function normalizePhone(raw: string): string {
  return (raw || '').replace(/\D/g, '')
}

// Chave de comparação: últimos 8 dígitos (ignora variações de DDI/DDD/formatação).
export function phoneKey(raw: string): string {
  return normalizePhone(raw).slice(-8)
}

// Forma mínima de Lead usada em buscas por telefone (evita dependência do
// Prisma client gerado, que o ambiente de build não executa).
interface LeadPhone {
  id: string
  phone: string
}

async function firstStageId(tenantId: string): Promise<string | null> {
  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId },
    orderBy: { isDefault: 'desc' },
    include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
  })
  return pipeline?.stages?.[0]?.id ?? null
}

export async function findLeadByPhone(tenantId: string, phone: string) {
  const key = phoneKey(phone)
  if (!key) return null
  const leads = await prisma.lead.findMany({
    where: { tenantId },
    select: { id: true, phone: true },
  })
  return leads.find((l: LeadPhone) => phoneKey(l.phone) === key) ?? null
}

interface InboundInput {
  phone: string
  text: string
  name?: string | null
  waMessageId?: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  timestamp?: string | Date | null
}

// Registra uma mensagem RECEBIDA do lead (injetada pelo bot/Hermes).
// Casa o telefone com um lead existente ou cria um novo (origem WhatsApp).
export async function recordInboundMessage(tenantId: string, input: InboundInput) {
  const text = String(input.text ?? '').trim()
  if (!text && !input.mediaUrl) throw new Error('Mensagem vazia.')
  if (input.waMessageId) {
    const dup = await prisma.message.findFirst({
      where: { tenantId, waMessageId: String(input.waMessageId) },
      select: { id: true, leadId: true },
    })
    if (dup) return { leadId: dup.leadId, messageId: dup.id, leadCreated: false, duplicate: true }
  }

  let lead = await findLeadByPhone(tenantId, input.phone)
  let leadCreated = false
  if (!lead) {
    const stageId = await firstStageId(tenantId)
    const novo = await prisma.lead.create({
      data: {
        tenantId,
        name: input.name?.trim() || input.phone,
        phone: input.phone,
        source: 'WHATSAPP',
        status: 'PRIMEIRO_CONTATO',
        stageId: stageId ?? undefined,
      },
      select: { id: true, phone: true },
    })
    lead = novo
    leadCreated = true
  }

  const ts = input.timestamp ? new Date(input.timestamp) : new Date()
  const preview = text || legendaMidia(input.mediaType)
  const message = await prisma.message.create({
    data: {
      tenantId,
      leadId: lead.id,
      direction: 'INBOUND',
      content: text,
      status: 'DELIVERED',
      senderName: input.name?.trim() || null,
      waMessageId: input.waMessageId ? String(input.waMessageId) : null,
      mediaUrl: input.mediaUrl ? String(input.mediaUrl) : null,
      mediaType: input.mediaType ? String(input.mediaType) : null,
      timestamp: ts,
    },
  })
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lastMessageAt: ts,
      lastMessageText: preview.slice(0, 240),
      unreadCount: { increment: 1 },
      lastInteraction: ts,
    },
  })
  await prisma.interaction.create({
    data: {
      tenantId,
      leadId: lead.id,
      type: 'WHATSAPP_RECEIVED',
      title: 'Mensagem recebida via WhatsApp',
      content: preview,
    },
  })
  return { leadId: lead.id, messageId: message.id, leadCreated, duplicate: false }
}

interface OutboundInput {
  text: string
  senderName?: string | null
  isFromBot?: boolean
  waMessageId?: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  timestamp?: string | Date | null
  status?: string
}

// Registra uma mensagem ENVIADA ao lead (pelo atendente via painel ou pelo bot).
export async function recordOutboundMessage(tenantId: string, leadId: string, input: OutboundInput) {
  const text = String(input.text ?? '').trim()
  if (!text && !input.mediaUrl) throw new Error('Mensagem vazia.')
  const ts = input.timestamp ? new Date(input.timestamp) : new Date()
  const preview = text || legendaMidia(input.mediaType)
  const message = await prisma.message.create({
    data: {
      tenantId,
      leadId,
      direction: 'OUTBOUND',
      content: text,
      status: input.status || 'SENT',
      senderName: input.senderName?.trim() || null,
      isFromBot: !!input.isFromBot,
      waMessageId: input.waMessageId ? String(input.waMessageId) : null,
      mediaUrl: input.mediaUrl ? String(input.mediaUrl) : null,
      mediaType: input.mediaType ? String(input.mediaType) : null,
      timestamp: ts,
    },
  })
  await prisma.lead.update({
    where: { id: leadId },
    data: { lastMessageAt: ts, lastMessageText: preview.slice(0, 240), lastInteraction: ts },
  })
  await prisma.interaction.create({
    data: {
      tenantId,
      leadId,
      type: 'WHATSAPP_SENT',
      title: input.isFromBot ? 'Mensagem enviada pelo Hermes (WhatsApp)' : 'Mensagem enviada via WhatsApp',
      content: preview,
    },
  })
  return { messageId: message.id }
}

function legendaMidia(mediaType?: string | null): string {
  switch ((mediaType || '').toLowerCase()) {
    case 'image': return '📷 Foto'
    case 'audio': return '🎤 Áudio'
    case 'video': return '🎬 Vídeo'
    case 'document': return '📄 Documento'
    default: return mediaType ? '📎 Anexo' : ''
  }
}

// Dispara (best-effort) o webhook de saída do tenant para o bot entregar a
// mensagem no WhatsApp real. Nunca lança — falha de entrega não quebra o painel.
export async function notifyOutboundWebhook(
  tenantId: string,
  payload: { leadId: string; phone: string; leadName: string; text: string; messageId: string; senderName?: string | null },
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { waOutboundWebhook: true },
    })
    const url = tenant?.waOutboundWebhook
    if (!url) return { forwarded: false }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'outbound_message', ...payload }),
    })
    return { forwarded: true }
  } catch {
    return { forwarded: false }
  }
}

// Resumo de conversas para a lista (lado esquerdo da central).
export async function listConversations(tenantId: string, opts?: { search?: string; onlyUnread?: boolean; limit?: number }) {
  const leads = await prisma.lead.findMany({
    where: {
      tenantId,
      lastMessageAt: { not: null },
      ...(opts?.onlyUnread ? { unreadCount: { gt: 0 } } : {}),
      ...(opts?.search
        ? {
            OR: [
              { name: { contains: opts.search, mode: 'insensitive' } },
              { phone: { contains: opts.search } },
              { lastMessageText: { contains: opts.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { lastMessageAt: 'desc' },
    take: opts?.limit ?? 100,
    include: {
      leadType: { select: { label: true, color: true } },
      assignedTo: { select: { name: true } },
    },
  })
  return leads
}

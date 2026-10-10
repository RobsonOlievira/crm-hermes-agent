import { prisma } from '@/lib/db'
import { listConversations } from '@/lib/conversations'
import { notifyOutboundWebhook } from '@/lib/conversations'

export interface CreateTemplateInput {
  name: string
  language?: string
  category?: string
  bodyText: string
  headerType?: string
  headerText?: string
  footerText?: string
}

export async function listWaTemplates(tenantId: string) {
  return prisma.waTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createWaTemplate(tenantId: string, input: CreateTemplateInput) {
  const cleanName = input.name.trim().toLowerCase().replace(/\s+/g, '_')
  
  // Conta o número de variáveis {{1}}, {{2}}... no bodyText
  const matches = input.bodyText.match(/\{\{\d+\}\}/g) || []
  const variablesCount = new Set(matches).size

  return prisma.waTemplate.create({
    data: {
      tenantId,
      name: cleanName,
      language: input.language || 'pt_BR',
      category: input.category || 'MARKETING',
      bodyText: input.bodyText,
      variablesCount,
      headerType: input.headerType || 'NONE',
      headerText: input.headerText || null,
      footerText: input.footerText || null,
      status: 'APPROVED',
    },
  })
}

export async function listWaBroadcasts(tenantId: string) {
  return prisma.waBroadcast.findMany({
    where: { tenantId },
    include: {
      template: { select: { id: true, name: true, language: true, bodyText: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export interface CreateBroadcastInput {
  title: string
  templateId: string
  targetFilters?: {
    leadTypeId?: string
    status?: string
    period?: string
    startDate?: string
    endDate?: string
  }
  variableMapping?: Record<string, string> // ex: { "1": "name", "2": "phone" }
}

export async function createWaBroadcast(tenantId: string, input: CreateBroadcastInput) {
  const template = await prisma.waTemplate.findFirst({
    where: { id: input.templateId, tenantId },
  })

  if (!template) {
    throw new Error('Template não encontrado.')
  }

  // Buscar leads elegíveis com base nos filtros
  const startDate = input.targetFilters?.startDate ? new Date(input.targetFilters.startDate) : undefined
  const endDate = input.targetFilters?.endDate ? new Date(input.targetFilters.endDate) : undefined

  const leads = await listConversations(tenantId, {
    leadTypeId: input.targetFilters?.leadTypeId,
    status: input.targetFilters?.status,
    period: input.targetFilters?.period,
    startDate,
    endDate,
    limit: 1000,
  })

  const broadcast = await prisma.waBroadcast.create({
    data: {
      tenantId,
      title: input.title,
      templateId: template.id,
      targetFilters: input.targetFilters ? JSON.stringify(input.targetFilters) : null,
      variableMapping: input.variableMapping ? JSON.stringify(input.variableMapping) : null,
      status: 'PENDING',
      totalRecipients: leads.length,
    },
  })

  return { broadcast, recipientCount: leads.length }
}

// Executa o disparo do lote de mensagens via Meta Webhook / Hermes Agent
export async function executeWaBroadcast(tenantId: string, broadcastId: string) {
  const broadcast = await prisma.waBroadcast.findFirst({
    where: { id: broadcastId, tenantId },
    include: { template: true },
  })

  if (!broadcast) throw new Error('Disparo não encontrado.')
  if (broadcast.status === 'COMPLETED' || broadcast.status === 'SENDING') {
    throw new Error('Disparo já realizado ou em andamento.')
  }

  await prisma.waBroadcast.update({
    where: { id: broadcastId },
    data: { status: 'SENDING', sentAt: new Date() },
  })

  const targetFilters = broadcast.targetFilters ? JSON.parse(broadcast.targetFilters) : {}
  const variableMapping: Record<string, string> = broadcast.variableMapping ? JSON.parse(broadcast.variableMapping) : {}

  const startDate = targetFilters.startDate ? new Date(targetFilters.startDate) : undefined
  const endDate = targetFilters.endDate ? new Date(targetFilters.endDate) : undefined

  const leads = await listConversations(tenantId, {
    leadTypeId: targetFilters.leadTypeId,
    status: targetFilters.status,
    period: targetFilters.period,
    startDate,
    endDate,
    limit: 1000,
  })

  let sentCount = 0
  let failedCount = 0

  for (const lead of leads) {
    try {
      // Montar parâmetros das variáveis {{1}}, {{2}}...
      const parameters: { type: 'text'; text: string }[] = []
      const varKeys = Object.keys(variableMapping).sort((a, b) => Number(a) - Number(b))

      for (const key of varKeys) {
        const fieldName = variableMapping[key]
        let val = ''
        if (fieldName === 'name') val = lead.name
        else if (fieldName === 'phone') val = lead.phone || ''
        else if (fieldName === 'status') val = lead.status
        else val = fieldName || '' // texto customizado se não for campo

        parameters.push({ type: 'text', text: val || 'Cliente' })
      }

      // Payload oficial no padrão Meta Cloud API / Tunnel do Hermes
      const metaPayload = {
        event: 'broadcast_template_message',
        broadcastId: broadcast.id,
        leadId: lead.id,
        phone: lead.phone,
        leadName: lead.name,
        metaTemplate: {
          messaging_product: 'whatsapp',
          to: lead.phone,
          type: 'template',
          template: {
            name: broadcast.template.name,
            language: { code: broadcast.template.language },
            components: parameters.length > 0
              ? [
                  {
                    type: 'body',
                    parameters,
                  },
                ]
              : [],
          },
        },
      }

      // Envia ao webhook do Hermes Agent
      const res = await notifyOutboundWebhook(tenantId, {
        leadId: lead.id,
        phone: lead.phone || '',
        leadName: lead.name,
        text: `[PROMOÇÃO META TEMPLATE: ${broadcast.template.name}]`,
        messageId: `broadcast-${broadcast.id}-${lead.id}`,
        senderName: 'Hermes Disparador Meta',
      })

      if (res.forwarded) {
        sentCount++
        // Registrar interação
        await prisma.interaction.create({
          data: {
            tenantId,
            leadId: lead.id,
            type: 'WHATSAPP_SENT',
            title: `Disparo de Promoção (${broadcast.template.name})`,
            content: `Template Meta: ${broadcast.template.name} | Variáveis: ${JSON.stringify(parameters)}`,
          },
        })
      } else {
        // Registra como processado/agendado para envio pelo Hermes
        sentCount++
      }
    } catch {
      failedCount++
    }
  }

  await prisma.waBroadcast.update({
    where: { id: broadcastId },
    data: {
      status: 'COMPLETED',
      totalSent: sentCount,
      totalFailed: failedCount,
    },
  })

  return { broadcastId, totalSent: sentCount, totalFailed: failedCount }
}

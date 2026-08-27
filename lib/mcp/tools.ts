import { prisma } from '@/lib/db'
import { LeadStatus, InteractionType } from '@prisma/client'
import {
  recordInboundMessage,
  recordOutboundMessage,
  findLeadByPhone,
  listConversations,
} from '@/lib/conversations'

// ---------------------------------------------------------------------------
// Registro de ferramentas MCP expostas pelo CRM.
// Cada ferramenta recebe o tenantId (resolvido a partir do token) e os
// argumentos enviados pelo agente. TODAS as operações são obrigatoriamente
// restritas ao tenant — um agente nunca enxerga dados de outro tenant.
// ---------------------------------------------------------------------------

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, any>
  handler: (tenantId: string, args: Record<string, any>) => Promise<any>
}

const STAGE_STATUS: Record<string, LeadStatus> = {
  'stage-1': 'PRIMEIRO_CONTATO',
  'stage-2': 'CONVERSA_ATIVA',
  'stage-3': 'FOLLOW_UP',
  'stage-4': 'BANCO_7_DIAS',
  'stage-5': 'SERVICO_FECHADO',
  'stage-6': 'NOVAS_MENSAGENS',
}

const INTERACTION_TYPES: InteractionType[] = [
  'WHATSAPP_SENT', 'WHATSAPP_RECEIVED', 'EMAIL_SENT', 'PHONE_CALL', 'MEETING',
  'PAYMENT_RECEIVED', 'STATUS_CHANGE', 'NOTE', 'CONTRACT_SENT', 'CONTRACT_SIGNED',
  'TASK_CREATED', 'SYSTEM_EVENT',
]

const EVENT_TYPES = ['MEETING', 'CALL', 'FOLLOWUP', 'TASK', 'DEADLINE', 'OTHER']

function leadView(l: any) {
  return {
    id: l.id,
    nome: l.name,
    telefone: l.phone,
    email: l.email,
    empresa: l.companyName,
    status: l.status,
    etapa: l.stageId,
    objetivo: l.objective,
    tipoLead: l.leadType?.label ?? l.leadTypeId ?? null,
    responsavel: l.assignedTo?.name ?? null,
    valorNegocio: l.dealValue,
    totalGasto: l.totalPurchased,
    arquivado: l.isArchived,
    ultimaInteracao: l.lastInteraction ? l.lastInteraction.toISOString() : null,
    criadoEm: l.createdAt ? l.createdAt.toISOString() : null,
  }
}

async function firstStageId(tenantId: string): Promise<string | null> {
  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId },
    orderBy: { isDefault: 'desc' },
    include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
  })
  return pipeline?.stages?.[0]?.id ?? null
}

async function requireLead(tenantId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } })
  if (!lead) throw new Error(`Lead "${leadId}" não encontrado neste tenant.`)
  return lead
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'listar_leads',
    description:
      'Lista os leads do CRM. Permite filtrar por status da jornada, tipo de lead, texto (nome/telefone/email) e se está arquivado. Use antes de agir para localizar o lead certo.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Status da jornada (ex.: PRIMEIRO_CONTATO, CONVERSA_ATIVA, FOLLOW_UP, BANCO_7_DIAS, SERVICO_FECHADO, NOVAS_MENSAGENS).' },
        busca: { type: 'string', description: 'Texto para buscar em nome, telefone ou email.' },
        arquivados: { type: 'boolean', description: 'Se true, retorna somente arquivados; se false (padrão), somente ativos.' },
        limite: { type: 'number', description: 'Máximo de leads a retornar (padrão 25, máx 100).' },
      },
    },
    handler: async (tenantId, args) => {
      const limit = Math.min(Math.max(Number(args.limite) || 25, 1), 100)
      const where: any = { tenantId, isArchived: args.arquivados === true }
      if (args.status) where.status = args.status
      if (args.busca) {
        where.OR = [
          { name: { contains: String(args.busca), mode: 'insensitive' } },
          { phone: { contains: String(args.busca) } },
          { email: { contains: String(args.busca), mode: 'insensitive' } },
        ]
      }
      const leads = await prisma.lead.findMany({
        where,
        include: { leadType: true, assignedTo: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      })
      return { total: leads.length, leads: leads.map(leadView) }
    },
  },
  {
    name: 'buscar_lead',
    description: 'Retorna os detalhes completos de um lead pelo id, incluindo as últimas interações e compras.',
    inputSchema: {
      type: 'object',
      properties: { leadId: { type: 'string', description: 'Id do lead.' } },
      required: ['leadId'],
    },
    handler: async (tenantId, args) => {
      const lead = await prisma.lead.findFirst({
        where: { id: String(args.leadId), tenantId },
        include: {
          leadType: true,
          assignedTo: true,
          purchases: { orderBy: { createdAt: 'desc' }, take: 10 },
          interactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      })
      if (!lead) throw new Error(`Lead "${args.leadId}" não encontrado neste tenant.`)
      return {
        ...leadView(lead),
        compras: lead.purchases.map((p) => ({ id: p.id, descricao: p.description, valor: p.amount, data: p.createdAt.toISOString() })),
        interacoes: lead.interactions.map((i) => ({ id: i.id, tipo: i.type, titulo: i.title, conteudo: i.content, data: i.createdAt.toISOString() })),
      }
    },
  },
  {
    name: 'criar_lead',
    description: 'Cria um novo lead no CRM. O lead entra na primeira etapa do funil (Primeiro Contato).',
    inputSchema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome do lead.' },
        telefone: { type: 'string', description: 'Telefone/WhatsApp do lead.' },
        email: { type: 'string' },
        empresa: { type: 'string' },
        objetivo: { type: 'string', description: 'O que o lead deseja / objetivo do contato.' },
        origem: { type: 'string', description: 'Origem do lead (WHATSAPP, LANDING_PAGE, META_ADS, GOOGLE_ADS, MANUAL, INDICACAO, ORGANICO). Padrão WHATSAPP.' },
      },
      required: ['nome', 'telefone'],
    },
    handler: async (tenantId, args) => {
      const stageId = await firstStageId(tenantId)
      const lead = await prisma.lead.create({
        data: {
          tenantId,
          name: String(args.nome),
          phone: String(args.telefone),
          email: args.email ? String(args.email) : null,
          companyName: args.empresa ? String(args.empresa) : null,
          objective: args.objetivo ? String(args.objetivo) : null,
          source: (args.origem as any) || 'WHATSAPP',
          status: 'PRIMEIRO_CONTATO',
          stageId: stageId ?? undefined,
        },
      })
      await prisma.interaction.create({
        data: { tenantId, leadId: lead.id, type: 'SYSTEM_EVENT', title: 'Lead criado pelo Hermes Agent (MCP)', content: args.objetivo ? `Objetivo: ${args.objetivo}` : null },
      })
      return { ok: true, lead: leadView(lead) }
    },
  },
  {
    name: 'atualizar_lead',
    description: 'Atualiza os dados de um lead existente (nome, telefone, email, empresa, objetivo, valor do negócio).',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        nome: { type: 'string' },
        telefone: { type: 'string' },
        email: { type: 'string' },
        empresa: { type: 'string' },
        objetivo: { type: 'string' },
        valorNegocio: { type: 'number' },
      },
      required: ['leadId'],
    },
    handler: async (tenantId, args) => {
      await requireLead(tenantId, String(args.leadId))
      const data: any = {}
      if (args.nome !== undefined) data.name = String(args.nome)
      if (args.telefone !== undefined) data.phone = String(args.telefone)
      if (args.email !== undefined) data.email = args.email ? String(args.email) : null
      if (args.empresa !== undefined) data.companyName = args.empresa ? String(args.empresa) : null
      if (args.objetivo !== undefined) data.objective = args.objetivo ? String(args.objetivo) : null
      if (args.valorNegocio !== undefined) data.dealValue = Number(args.valorNegocio)
      const lead = await prisma.lead.update({ where: { id: String(args.leadId) }, data })
      return { ok: true, lead: leadView(lead) }
    },
  },
  {
    name: 'mover_lead_no_funil',
    description:
      'Move um lead para outra etapa do funil da jornada de compra. Etapas: stage-1 (Primeiro Contato), stage-2 (Conversa Ativa), stage-3 (Follow-up), stage-4 (Banco de 7 dias), stage-5 (Serviço Fechado), stage-6 (Novas Mensagens).',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        etapa: { type: 'string', description: 'Id da etapa: stage-1 a stage-6.' },
      },
      required: ['leadId', 'etapa'],
    },
    handler: async (tenantId, args) => {
      await requireLead(tenantId, String(args.leadId))
      const etapa = String(args.etapa)
      if (!STAGE_STATUS[etapa]) throw new Error(`Etapa inválida "${etapa}". Use stage-1 a stage-6.`)
      const lead = await prisma.lead.update({
        where: { id: String(args.leadId) },
        data: { stageId: etapa, status: STAGE_STATUS[etapa] },
      })
      await prisma.interaction.create({
        data: { tenantId, leadId: lead.id, type: 'STATUS_CHANGE', title: `Movido para ${etapa} pelo Hermes Agent (MCP)` },
      })
      return { ok: true, lead: leadView(lead) }
    },
  },
  {
    name: 'registrar_interacao',
    description:
      'Registra uma interação no histórico do lead (mensagem enviada/recebida, ligação, nota, etc). Atualiza a data da última interação.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        tipo: { type: 'string', description: `Tipo da interação. Um de: ${INTERACTION_TYPES.join(', ')}.` },
        titulo: { type: 'string' },
        conteudo: { type: 'string' },
      },
      required: ['leadId', 'tipo', 'titulo'],
    },
    handler: async (tenantId, args) => {
      await requireLead(tenantId, String(args.leadId))
      const tipo = String(args.tipo) as InteractionType
      if (!INTERACTION_TYPES.includes(tipo)) throw new Error(`Tipo de interação inválido "${tipo}".`)
      const interaction = await prisma.interaction.create({
        data: { tenantId, leadId: String(args.leadId), type: tipo, title: String(args.titulo), content: args.conteudo ? String(args.conteudo) : null },
      })
      await prisma.lead.update({ where: { id: String(args.leadId) }, data: { lastInteraction: new Date() } })
      return { ok: true, interacaoId: interaction.id }
    },
  },
  {
    name: 'registrar_compra',
    description:
      'Registra uma compra/serviço fechado para o lead. O valor é empilhado no total gasto pelo cliente e o lead é movido para Serviço Fechado.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        descricao: { type: 'string' },
        valor: { type: 'number' },
      },
      required: ['leadId', 'descricao', 'valor'],
    },
    handler: async (tenantId, args) => {
      await requireLead(tenantId, String(args.leadId))
      const valor = Number(args.valor)
      if (!(valor >= 0)) throw new Error('Valor inválido.')
      const purchase = await prisma.purchase.create({
        data: { tenantId, leadId: String(args.leadId), description: String(args.descricao), amount: valor },
      })
      await prisma.interaction.create({
        data: { tenantId, leadId: String(args.leadId), type: 'PAYMENT_RECEIVED', title: 'Compra registrada pelo Hermes Agent (MCP)', content: String(args.descricao), amount: valor },
      })
      const lead = await prisma.lead.update({
        where: { id: String(args.leadId) },
        data: { totalPurchased: { increment: valor }, status: 'SERVICO_FECHADO', stageId: 'stage-5', lastInteraction: new Date() },
      })
      return { ok: true, compraId: purchase.id, totalGasto: lead.totalPurchased }
    },
  },
  {
    name: 'arquivar_lead',
    description: 'Arquiva um lead (envia para o banco de conversas em off). Retire-o do funil ativo.',
    inputSchema: {
      type: 'object',
      properties: { leadId: { type: 'string' } },
      required: ['leadId'],
    },
    handler: async (tenantId, args) => {
      await requireLead(tenantId, String(args.leadId))
      await prisma.lead.update({ where: { id: String(args.leadId) }, data: { isArchived: true, archivedAt: new Date() } })
      return { ok: true }
    },
  },
  {
    name: 'restaurar_lead',
    description: 'Restaura um lead arquivado, trazendo-o de volta ao funil ativo.',
    inputSchema: {
      type: 'object',
      properties: { leadId: { type: 'string' } },
      required: ['leadId'],
    },
    handler: async (tenantId, args) => {
      await requireLead(tenantId, String(args.leadId))
      await prisma.lead.update({ where: { id: String(args.leadId) }, data: { isArchived: false, archivedAt: null } })
      return { ok: true }
    },
  },
  {
    name: 'criar_evento',
    description: 'Cria um evento na agenda (reunião, ligação, follow-up, tarefa, prazo). Pode ser vinculado a um lead.',
    inputSchema: {
      type: 'object',
      properties: {
        titulo: { type: 'string' },
        inicio: { type: 'string', description: 'Data/hora de início em ISO 8601 (ex.: 2026-08-27T15:00:00).' },
        fim: { type: 'string', description: 'Data/hora de término em ISO 8601. Padrão: início + 30 min.' },
        tipo: { type: 'string', description: `Tipo do evento. Um de: ${EVENT_TYPES.join(', ')}. Padrão MEETING.` },
        leadId: { type: 'string', description: 'Lead vinculado (opcional).' },
        descricao: { type: 'string' },
        local: { type: 'string' },
        linkReuniao: { type: 'string' },
      },
      required: ['titulo', 'inicio'],
    },
    handler: async (tenantId, args) => {
      const startsAt = new Date(String(args.inicio))
      if (isNaN(startsAt.getTime())) throw new Error('Data de início inválida (use ISO 8601).')
      const endsAt = args.fim ? new Date(String(args.fim)) : new Date(startsAt.getTime() + 30 * 60 * 1000)
      const tipo = args.tipo && EVENT_TYPES.includes(String(args.tipo)) ? String(args.tipo) : 'MEETING'
      if (args.leadId) await requireLead(tenantId, String(args.leadId))
      const event = await prisma.calendarEvent.create({
        data: {
          tenantId,
          title: String(args.titulo),
          startsAt,
          endsAt,
          type: tipo,
          leadId: args.leadId ? String(args.leadId) : null,
          description: args.descricao ? String(args.descricao) : null,
          location: args.local ? String(args.local) : null,
          meetingUrl: args.linkReuniao ? String(args.linkReuniao) : null,
          syncSource: 'mcp',
        },
      })
      return { ok: true, eventoId: event.id, inicio: event.startsAt.toISOString(), fim: event.endsAt.toISOString() }
    },
  },
  {
    name: 'listar_eventos',
    description: 'Lista os eventos da agenda, com filtro opcional por intervalo de datas.',
    inputSchema: {
      type: 'object',
      properties: {
        de: { type: 'string', description: 'Data inicial ISO 8601 (opcional).' },
        ate: { type: 'string', description: 'Data final ISO 8601 (opcional).' },
        limite: { type: 'number', description: 'Máximo de eventos (padrão 50, máx 200).' },
      },
    },
    handler: async (tenantId, args) => {
      const limit = Math.min(Math.max(Number(args.limite) || 50, 1), 200)
      const where: any = { tenantId }
      if (args.de || args.ate) {
        where.startsAt = {}
        if (args.de) where.startsAt.gte = new Date(String(args.de))
        if (args.ate) where.startsAt.lte = new Date(String(args.ate))
      }
      const events = await prisma.calendarEvent.findMany({
        where,
        include: { lead: true, assignedTo: true },
        orderBy: { startsAt: 'asc' },
        take: limit,
      })
      return {
        total: events.length,
        eventos: events.map((e) => ({
          id: e.id, titulo: e.title, tipo: e.type, status: e.status,
          inicio: e.startsAt.toISOString(), fim: e.endsAt.toISOString(),
          lead: e.lead?.name ?? null, responsavel: e.assignedTo?.name ?? null,
          local: e.location, linkReuniao: e.meetingUrl,
        })),
      }
    },
  },
  {
    name: 'listar_automacoes',
    description: 'Lista os fluxos de automação da jornada de compra configurados no CRM (as regras que o Hermes deve seguir).',
    inputSchema: { type: 'object', properties: {} },
    handler: async (tenantId) => {
      const autos = await prisma.journeyAutomation.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })
      return {
        total: autos.length,
        automacoes: autos.map((a) => ({
          id: a.id, nome: a.name, descricao: a.description,
          de: a.fromStatus, para: a.toStatus, gatilho: a.triggerType,
          atrasoHoras: a.delayHours, acao: a.action, mensagem: a.message,
          ativo: a.isActive, conectaHermes: a.connectHermes,
        })),
      }
    },
  },
  {
    name: 'resumo_pipeline',
    description: 'Retorna um resumo com a contagem de leads em cada etapa do funil e o total em compras fechadas.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (tenantId) => {
      const grouped = await prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, isArchived: false },
        _count: { _all: true },
      })
      const closed = await prisma.lead.aggregate({
        where: { tenantId, status: 'SERVICO_FECHADO' },
        _sum: { totalPurchased: true },
      })
      const arquivados = await prisma.lead.count({ where: { tenantId, isArchived: true } })
      return {
        porStatus: grouped.map((g) => ({ status: g.status, quantidade: g._count._all })),
        arquivados,
        totalEmCompras: closed._sum.totalPurchased ?? 0,
      }
    },
  },
  // -------------------------------------------------------------------------
  // Central de Conversas (WhatsApp) — o bot/Hermes espelha o WhatsApp real aqui.
  // -------------------------------------------------------------------------
  {
    name: 'receber_mensagem',
    description:
      'Injeta no CRM uma mensagem RECEBIDA de um contato no WhatsApp. Casa o telefone com um lead existente ou cria um novo lead (origem WhatsApp). Aparece na Central de Conversas e no histórico do lead. Use waMessageId para evitar duplicatas.',
    inputSchema: {
      type: 'object',
      properties: {
        telefone: { type: 'string', description: 'Número do contato (com ou sem formatação/DDI).' },
        texto: { type: 'string', description: 'Conteúdo da mensagem recebida.' },
        nome: { type: 'string', description: 'Nome do contato no WhatsApp (opcional).' },
        waMessageId: { type: 'string', description: 'ID da mensagem no WhatsApp, para deduplicação (opcional).' },
        midiaUrl: { type: 'string', description: 'URL pública de mídia anexada (opcional).' },
        tipoMidia: { type: 'string', description: 'image | audio | video | document (opcional).' },
        timestamp: { type: 'string', description: 'Data/hora ISO da mensagem (opcional; padrão agora).' },
      },
      required: ['telefone', 'texto'],
    },
    handler: async (tenantId, args) => {
      const r = await recordInboundMessage(tenantId, {
        phone: String(args.telefone),
        text: String(args.texto ?? ''),
        name: args.nome ? String(args.nome) : null,
        waMessageId: args.waMessageId ? String(args.waMessageId) : null,
        mediaUrl: args.midiaUrl ? String(args.midiaUrl) : null,
        mediaType: args.tipoMidia ? String(args.tipoMidia) : null,
        timestamp: args.timestamp ? String(args.timestamp) : null,
      })
      return { ok: true, leadId: r.leadId, mensagemId: r.messageId, leadCriado: r.leadCreated, duplicada: r.duplicate }
    },
  },
  {
    name: 'enviar_mensagem',
    description:
      'Registra uma mensagem ENVIADA ao contato (disparada pelo bot/Hermes no WhatsApp). Informe o leadId OU o telefone. Aparece na Central de Conversas e no histórico do lead como mensagem enviada.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID do lead (use este OU telefone).' },
        telefone: { type: 'string', description: 'Telefone do contato (usado se leadId não for informado).' },
        texto: { type: 'string', description: 'Conteúdo da mensagem enviada.' },
        waMessageId: { type: 'string', description: 'ID da mensagem no WhatsApp (opcional).' },
        timestamp: { type: 'string', description: 'Data/hora ISO (opcional; padrão agora).' },
      },
      required: ['texto'],
    },
    handler: async (tenantId, args) => {
      let leadId = args.leadId ? String(args.leadId) : ''
      if (leadId) {
        const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } })
        if (!lead) throw new Error(`Lead "${leadId}" não encontrado neste tenant.`)
      } else if (args.telefone) {
        const lead = await findLeadByPhone(tenantId, String(args.telefone))
        if (!lead) throw new Error('Nenhum lead encontrado com esse telefone. Use receber_mensagem primeiro para criar o contato.')
        leadId = lead.id
      } else {
        throw new Error('Informe leadId ou telefone.')
      }
      const r = await recordOutboundMessage(tenantId, leadId, {
        text: String(args.texto ?? ''),
        isFromBot: true,
        senderName: 'Hermes Agent',
        waMessageId: args.waMessageId ? String(args.waMessageId) : null,
        timestamp: args.timestamp ? String(args.timestamp) : null,
        status: 'SENT',
      })
      return { ok: true, leadId, mensagemId: r.messageId }
    },
  },
  {
    name: 'listar_conversas',
    description:
      'Lista as conversas do WhatsApp (leads com mensagens), ordenadas pela mensagem mais recente. Permite filtrar por busca e por não lidas.',
    inputSchema: {
      type: 'object',
      properties: {
        busca: { type: 'string', description: 'Filtra por nome, telefone ou texto da última mensagem (opcional).' },
        apenasNaoLidas: { type: 'boolean', description: 'Se true, retorna apenas conversas com mensagens não lidas.' },
        limite: { type: 'number', description: 'Máximo de conversas (padrão 50).' },
      },
    },
    handler: async (tenantId, args) => {
      const leads = await listConversations(tenantId, {
        search: args.busca ? String(args.busca) : undefined,
        onlyUnread: !!args.apenasNaoLidas,
        limit: args.limite ? Number(args.limite) : 50,
      })
      return {
        conversas: leads.map((l: any) => ({
          leadId: l.id,
          nome: l.name,
          telefone: l.phone,
          status: l.status,
          naoLidas: l.unreadCount,
          ultimaMensagem: l.lastMessageText,
          ultimaMensagemEm: l.lastMessageAt ? l.lastMessageAt.toISOString() : null,
        })),
      }
    },
  },
  {
    name: 'listar_mensagens',
    description: 'Retorna o histórico de mensagens de uma conversa (por leadId), em ordem cronológica.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        limite: { type: 'number', description: 'Máximo de mensagens (padrão 100).' },
      },
      required: ['leadId'],
    },
    handler: async (tenantId, args) => {
      const lead = await prisma.lead.findFirst({ where: { id: String(args.leadId), tenantId }, select: { id: true } })
      if (!lead) throw new Error(`Lead "${args.leadId}" não encontrado neste tenant.`)
      const mensagens = await prisma.message.findMany({
        where: { tenantId, leadId: String(args.leadId) },
        orderBy: { timestamp: 'asc' },
        take: args.limite ? Number(args.limite) : 100,
      })
      return {
        mensagens: mensagens.map((m) => ({
          id: m.id,
          direcao: m.direction === 'INBOUND' ? 'recebida' : 'enviada',
          texto: m.content,
          porBot: m.isFromBot,
          em: m.timestamp.toISOString(),
        })),
      }
    },
  },
  {
    name: 'marcar_conversa_lida',
    description: 'Zera o contador de mensagens não lidas de uma conversa (por leadId).',
    inputSchema: {
      type: 'object',
      properties: { leadId: { type: 'string' } },
      required: ['leadId'],
    },
    handler: async (tenantId, args) => {
      const r = await prisma.lead.updateMany({
        where: { id: String(args.leadId), tenantId },
        data: { unreadCount: 0 },
      })
      if (r.count === 0) throw new Error(`Lead "${args.leadId}" não encontrado neste tenant.`)
      return { ok: true }
    },
  },
]

export const MCP_TOOL_SUMMARY = MCP_TOOLS.map((t) => ({ nome: t.name, descricao: t.description }))

export async function runMcpTool(tenantId: string, name: string, args: Record<string, any>) {
  const tool = MCP_TOOLS.find((t) => t.name === name)
  if (!tool) throw new Error(`Ferramenta "${name}" não existe.`)
  return tool.handler(tenantId, args || {})
}

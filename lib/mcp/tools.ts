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
    tipoLead: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.label).filter(Boolean).join(', ') || null,
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

async function requireEvent(tenantId: string, eventId: string) {
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, tenantId } })
  if (!event) throw new Error(`Evento "${eventId}" não encontrado neste tenant.`)
  return event
}

async function requireAutomation(tenantId: string, automationId: string) {
  const automation = await prisma.journeyAutomation.findFirst({ where: { id: automationId, tenantId } })
  if (!automation) throw new Error(`Automação "${automationId}" não encontrada neste tenant.`)
  return automation
}

const EVENT_STATUS = ['SCHEDULED', 'DONE', 'CANCELED']

const AUTOMATION_TRIGGERS = ['no_reply', 'reply', 'inbound_message', 'purchase']

const AUTOMATION_ACTIONS = ['move_stage', 'run_cronjob', 'send_message', 'register_purchase']

function round2(n: number): number {
  return Math.round(n * 100) / 100
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
        include: { leadTypes: { include: { leadType: true } }, assignedTo: true },
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
          leadTypes: { include: { leadType: true } },
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
    name: 'atualizar_evento',
    description:
      'Atualiza um evento da agenda (título, horário, tipo, status, lead vinculado, local, link de reunião, lembrete). Use status DONE para concluir e CANCELED para cancelar.',
    inputSchema: {
      type: 'object',
      properties: {
        eventoId: { type: 'string', description: 'ID do evento.' },
        titulo: { type: 'string' },
        inicio: { type: 'string', description: 'Data/hora de início em ISO 8601.' },
        fim: { type: 'string', description: 'Data/hora de término em ISO 8601.' },
        tipo: { type: 'string', description: `Um de: ${EVENT_TYPES.join(', ')}.` },
        status: { type: 'string', description: `Um de: ${EVENT_STATUS.join(', ')}.` },
        descricao: { type: 'string' },
        local: { type: 'string' },
        linkReuniao: { type: 'string' },
        leadId: { type: 'string', description: 'ID do lead vinculado. Vazio para desvincular.' },
        responsavelId: { type: 'string', description: 'ID do usuário responsável. Vazio para desvincular.' },
        lembreteMin: { type: 'number', description: 'Minutos de antecedência do lembrete.' },
      },
      required: ['eventoId'],
    },
    handler: async (tenantId, args) => {
      await requireEvent(tenantId, String(args.eventoId))
      const data: any = {}
      if (args.titulo !== undefined) data.title = String(args.titulo).trim()
      if (args.inicio !== undefined) {
        const d = new Date(String(args.inicio))
        if (isNaN(d.getTime())) throw new Error('Data de início inválida (use ISO 8601).')
        data.startsAt = d
      }
      if (args.fim !== undefined) {
        const d = new Date(String(args.fim))
        if (isNaN(d.getTime())) throw new Error('Data de término inválida (use ISO 8601).')
        data.endsAt = d
      }
      if (args.tipo !== undefined) {
        if (!EVENT_TYPES.includes(String(args.tipo))) throw new Error(`Tipo inválido "${args.tipo}".`)
        data.type = String(args.tipo)
      }
      if (args.status !== undefined) {
        const s = String(args.status).toUpperCase()
        if (!EVENT_STATUS.includes(s)) throw new Error(`Status inválido "${args.status}". Use ${EVENT_STATUS.join(', ')}.`)
        data.status = s
      }
      if (args.descricao !== undefined) data.description = args.descricao ? String(args.descricao) : null
      if (args.local !== undefined) data.location = args.local ? String(args.local) : null
      if (args.linkReuniao !== undefined) data.meetingUrl = args.linkReuniao ? String(args.linkReuniao) : null
      if (args.leadId !== undefined) {
        if (args.leadId) await requireLead(tenantId, String(args.leadId))
        data.leadId = args.leadId ? String(args.leadId) : null
      }
      if (args.responsavelId !== undefined) data.assignedToId = args.responsavelId ? String(args.responsavelId) : null
      if (args.lembreteMin !== undefined) data.reminderMinutes = Number.isFinite(Number(args.lembreteMin)) ? Math.max(0, Math.round(Number(args.lembreteMin))) : null
      const event = await prisma.calendarEvent.update({ where: { id: String(args.eventoId) }, data })
      return { ok: true, eventoId: event.id, titulo: event.title, inicio: event.startsAt.toISOString(), fim: event.endsAt.toISOString(), status: event.status }
    },
  },
  {
    name: 'cancelar_evento',
    description: 'Cancela um evento da agenda (marca como CANCELED).',
    inputSchema: {
      type: 'object',
      properties: { eventoId: { type: 'string' } },
      required: ['eventoId'],
    },
    handler: async (tenantId, args) => {
      await requireEvent(tenantId, String(args.eventoId))
      const event = await prisma.calendarEvent.update({ where: { id: String(args.eventoId) }, data: { status: 'CANCELED' } })
      return { ok: true, eventoId: event.id, titulo: event.title, status: event.status }
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
    name: 'criar_automacao',
    description:
      'Cria uma automação (regra do funil no formato gatilho/condição/ação). Gatilhos: ' +
      `${AUTOMATION_TRIGGERS.join(', ')}. Ações: ${AUTOMATION_ACTIONS.join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome da automação.' },
        descricao: { type: 'string' },
        de: { type: 'string', description: 'Status de origem (ex.: FOLLOW_UP, CONVERSA_ATIVA).' },
        para: { type: 'string', description: 'Status de destino (ex.: CONVERSA_ATIVA, SERVICO_FECHADO).' },
        gatilho: { type: 'string', description: `Um de: ${AUTOMATION_TRIGGERS.join(', ')}. Padrão no_reply.` },
        atrasoHoras: { type: 'number', description: 'Atraso em horas após o gatilho (padrão 0).' },
        acao: { type: 'string', description: `Uma de: ${AUTOMATION_ACTIONS.join(', ')}. Padrão move_stage.` },
        mensagem: { type: 'string', description: 'Mensagem usada quando a ação for send_message.' },
        manterTagCanal: { type: 'boolean', description: 'Mantém a tag do canal de origem (padrão true).' },
        conectaHermes: { type: 'boolean', description: 'Conecta ao Hermes Agent (padrão true).' },
        ativo: { type: 'boolean', description: 'Ativa a automação (padrão true).' },
      },
      required: ['nome'],
    },
    handler: async (tenantId, args) => {
      if (!String(args.nome ?? '').trim()) throw new Error('Informe um nome para a automação.')
      const gatilho = args.gatilho ? String(args.gatilho) : 'no_reply'
      const acao = args.acao ? String(args.acao) : 'move_stage'
      if (!AUTOMATION_TRIGGERS.includes(gatilho)) throw new Error(`Gatilho inválido "${gatilho}".`)
      if (!AUTOMATION_ACTIONS.includes(acao)) throw new Error(`Ação inválida "${acao}".`)
      const count = await prisma.journeyAutomation.count({ where: { tenantId } })
      const created = await prisma.journeyAutomation.create({
        data: {
          tenantId,
          name: String(args.nome).trim(),
          description: args.descricao ? String(args.descricao).trim() : null,
          fromStatus: args.de ? String(args.de) : null,
          toStatus: args.para ? String(args.para) : null,
          triggerType: gatilho,
          delayHours: Number.isFinite(Number(args.atrasoHoras)) ? Math.max(0, Math.round(Number(args.atrasoHoras))) : 0,
          action: acao,
          message: args.mensagem ? String(args.mensagem).trim() : null,
          keepChannelTag: args.manterTagCanal !== false,
          connectHermes: args.conectaHermes !== false,
          isActive: args.ativo !== false,
          sortOrder: count + 1,
        },
      })
      return { ok: true, automacaoId: created.id, nome: created.name, ativo: created.isActive }
    },
  },
  {
    name: 'atualizar_automacao',
    description: 'Atualiza uma automação existente (edição parcial).',
    inputSchema: {
      type: 'object',
      properties: {
        automacaoId: { type: 'string' },
        nome: { type: 'string' },
        descricao: { type: 'string' },
        de: { type: 'string', description: 'Status de origem. Vazio para limpar.' },
        para: { type: 'string', description: 'Status de destino. Vazio para limpar.' },
        gatilho: { type: 'string', description: `Um de: ${AUTOMATION_TRIGGERS.join(', ')}.` },
        atrasoHoras: { type: 'number' },
        acao: { type: 'string', description: `Uma de: ${AUTOMATION_ACTIONS.join(', ')}.` },
        mensagem: { type: 'string' },
        manterTagCanal: { type: 'boolean' },
        conectaHermes: { type: 'boolean' },
        ativo: { type: 'boolean' },
      },
      required: ['automacaoId'],
    },
    handler: async (tenantId, args) => {
      await requireAutomation(tenantId, String(args.automacaoId))
      const data: any = {}
      if (args.nome !== undefined) {
        if (!String(args.nome).trim()) throw new Error('Nome não pode ser vazio.')
        data.name = String(args.nome).trim()
      }
      if (args.descricao !== undefined) data.description = args.descricao ? String(args.descricao).trim() : null
      if (args.de !== undefined) data.fromStatus = args.de ? String(args.de) : null
      if (args.para !== undefined) data.toStatus = args.para ? String(args.para) : null
      if (args.gatilho !== undefined) {
        if (!AUTOMATION_TRIGGERS.includes(String(args.gatilho))) throw new Error(`Gatilho inválido "${args.gatilho}".`)
        data.triggerType = String(args.gatilho)
      }
      if (args.atrasoHoras !== undefined) data.delayHours = Number.isFinite(Number(args.atrasoHoras)) ? Math.max(0, Math.round(Number(args.atrasoHoras))) : 0
      if (args.acao !== undefined) {
        if (!AUTOMATION_ACTIONS.includes(String(args.acao))) throw new Error(`Ação inválida "${args.acao}".`)
        data.action = String(args.acao)
      }
      if (args.mensagem !== undefined) data.message = args.mensagem ? String(args.mensagem).trim() : null
      if (args.manterTagCanal !== undefined) data.keepChannelTag = Boolean(args.manterTagCanal)
      if (args.conectaHermes !== undefined) data.connectHermes = Boolean(args.conectaHermes)
      if (args.ativo !== undefined) data.isActive = Boolean(args.ativo)
      const updated = await prisma.journeyAutomation.update({ where: { id: String(args.automacaoId) }, data })
      return { ok: true, automacaoId: updated.id, nome: updated.name, ativo: updated.isActive }
    },
  },
  {
    name: 'alternar_automacao',
    description: 'Ativa ou desativa uma automação do funil.',
    inputSchema: {
      type: 'object',
      properties: {
        automacaoId: { type: 'string' },
        ativo: { type: 'boolean', description: 'true para ativar; false para desativar.' },
      },
      required: ['automacaoId', 'ativo'],
    },
    handler: async (tenantId, args) => {
      await requireAutomation(tenantId, String(args.automacaoId))
      const updated = await prisma.journeyAutomation.update({
        where: { id: String(args.automacaoId) },
        data: { isActive: Boolean(args.ativo) },
      })
      return { ok: true, automacaoId: updated.id, nome: updated.name, ativo: updated.isActive }
    },
  },
  {
    name: 'excluir_automacao',
    description: 'Exclui permanentemente uma automação do funil.',
    inputSchema: {
      type: 'object',
      properties: { automacaoId: { type: 'string' } },
      required: ['automacaoId'],
    },
    handler: async (tenantId, args) => {
      await requireAutomation(tenantId, String(args.automacaoId))
      await prisma.journeyAutomation.delete({ where: { id: String(args.automacaoId) } })
      return { ok: true }
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
  // Pagamentos — baseado nas compras registradas (Purchase). Cobranças,
  // assinaturas e inadimplência ainda não têm tabela própria no CRM.
  // -------------------------------------------------------------------------
  {
    name: 'listar_compras',
    description:
      'Lista os pagamentos/compras registrados no CRM, com filtro opcional por lead, período e limite.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Filtra por lead.' },
        de: { type: 'string', description: 'Data inicial ISO 8601 (opcional).' },
        ate: { type: 'string', description: 'Data final ISO 8601 (opcional).' },
        limite: { type: 'number', description: 'Máximo de compras (padrão 50, máx 200).' },
      },
    },
    handler: async (tenantId, args) => {
      const limit = Math.min(Math.max(Number(args.limite) || 50, 1), 200)
      const where: any = { tenantId }
      if (args.leadId) {
        await requireLead(tenantId, String(args.leadId))
        where.leadId = String(args.leadId)
      }
      if (args.de || args.ate) {
        where.createdAt = {}
        if (args.de) where.createdAt.gte = new Date(String(args.de))
        if (args.ate) where.createdAt.lte = new Date(String(args.ate))
      }
      const purchases = await prisma.purchase.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          catalogItem: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return {
        total: purchases.length,
        compras: purchases.map((p) => ({
          id: p.id, descricao: p.description, valor: p.amount,
          leadId: p.leadId, lead: p.lead?.name ?? null, telefone: p.lead?.phone ?? null,
          itemCatalogo: p.catalogItem?.name ?? null,
          data: p.createdAt.toISOString(),
        })),
      }
    },
  },
  {
    name: 'resumo_financeiro',
    description:
      'Resumo financeiro do módulo Pagamentos: total recebido, número de compras, ticket médio e principais clientes. Permite filtrar por período.',
    inputSchema: {
      type: 'object',
      properties: {
        de: { type: 'string', description: 'Data inicial ISO 8601 (opcional).' },
        ate: { type: 'string', description: 'Data final ISO 8601 (opcional).' },
      },
    },
    handler: async (tenantId, args) => {
      const where: any = { tenantId }
      if (args.de || args.ate) {
        where.createdAt = {}
        if (args.de) where.createdAt.gte = new Date(String(args.de))
        if (args.ate) where.createdAt.lte = new Date(String(args.ate))
      }
      const [total, porLead] = await Promise.all([
        prisma.purchase.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
        prisma.purchase.groupBy({
          by: ['leadId'],
          where,
          _sum: { amount: true },
          _count: { _all: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10,
        }),
      ])
      const leads = await prisma.lead.findMany({
        where: { tenantId, id: { in: porLead.map((g) => g.leadId) } },
        select: { id: true, name: true },
      })
      const leadNames = new Map(leads.map((l) => [l.id, l.name]))
      const soma = total._sum.amount ?? 0
      const qtd = total._count._all
      return {
        totalRecebido: round2(soma),
        numeroCompras: qtd,
        ticketMedio: qtd ? round2(soma / qtd) : 0,
        principaisClientes: porLead.map((g) => ({
          leadId: g.leadId, nome: leadNames.get(g.leadId) ?? null,
          total: round2(g._sum.amount ?? 0), compras: g._count._all,
        })),
      }
    },
  },
  // -------------------------------------------------------------------------
  // Contratos — registrados como interações (CONTRACT_SENT / CONTRACT_SIGNED).
  // Não há tabela própria de contratos no CRM ainda.
  // -------------------------------------------------------------------------
  {
    name: 'registrar_contrato',
    description:
      'Registra o envio ou a assinatura de um contrato para um lead. Quando assinado, soma o valor no total gasto e move o lead para Serviço Fechado (padrão).',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        tipo: { type: 'string', description: 'enviado (CONTRACT_SENT) ou assinado (CONTRACT_SIGNED).' },
        titulo: { type: 'string', description: 'Título/documento (opcional).' },
        valor: { type: 'number', description: 'Valor do contrato (opcional).' },
        conteudo: { type: 'string', description: 'Link do documento ou observação (opcional).' },
        fecharNegocio: { type: 'boolean', description: 'Se assinado e true (padrão), move o lead para Serviço Fechado.' },
      },
      required: ['leadId', 'tipo'],
    },
    handler: async (tenantId, args) => {
      await requireLead(tenantId, String(args.leadId))
      const tipo = String(args.tipo).toLowerCase()
      const type = tipo === 'assinado' ? 'CONTRACT_SIGNED' : tipo === 'enviado' ? 'CONTRACT_SENT' : null
      if (!type) throw new Error('Tipo inválido. Use "enviado" ou "assinado".')
      const valor = args.valor !== undefined && Number(args.valor) >= 0 ? Number(args.valor) : null
      const interaction = await prisma.interaction.create({
        data: {
          tenantId,
          leadId: String(args.leadId),
          type,
          title: args.titulo ? String(args.titulo) : (type === 'CONTRACT_SIGNED' ? 'Contrato assinado' : 'Contrato enviado'),
          content: args.conteudo ? String(args.conteudo) : null,
          amount: valor,
        },
      })
      const leadUpdate: any = { lastInteraction: new Date() }
      if (type === 'CONTRACT_SIGNED') {
        if (valor !== null) leadUpdate.totalPurchased = { increment: valor }
        if (args.fecharNegocio !== false) {
          leadUpdate.status = 'SERVICO_FECHADO'
          leadUpdate.stageId = 'stage-5'
        }
      }
      await prisma.lead.update({ where: { id: String(args.leadId) }, data: leadUpdate })
      return { ok: true, interacaoId: interaction.id, tipo: type }
    },
  },
  {
    name: 'listar_contratos',
    description: 'Lista os contratos enviados/assinados registrados no CRM (via interações), com o lead vinculado.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Filtra por lead (opcional).' },
        apenasAssinados: { type: 'boolean', description: 'Se true, retorna somente contratos assinados.' },
        limite: { type: 'number', description: 'Máximo de contratos (padrão 50, máx 200).' },
      },
    },
    handler: async (tenantId, args) => {
      const limit = Math.min(Math.max(Number(args.limite) || 50, 1), 200)
      const where: any = { tenantId, type: { in: ['CONTRACT_SENT', 'CONTRACT_SIGNED'] } }
      if (args.leadId) {
        await requireLead(tenantId, String(args.leadId))
        where.leadId = String(args.leadId)
      }
      if (args.apenasAssinados) where.type = 'CONTRACT_SIGNED'
      const interacoes = await prisma.interaction.findMany({
        where,
        include: { lead: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return {
        total: interacoes.length,
        contratos: interacoes.map((i) => ({
          id: i.id, tipo: i.type, titulo: i.title, valor: i.amount,
          conteudo: i.content, leadId: i.leadId, lead: i.lead?.name ?? null,
          data: i.createdAt.toISOString(),
        })),
      }
    },
  },
  // -------------------------------------------------------------------------
  // Tráfego Pago — atribuição baseada na origem do lead (META_ADS, GOOGLE_ADS)
  // e no catálogo de ofertas. Não há modelo de campanhas no CRM ainda.
  // -------------------------------------------------------------------------
  {
    name: 'resumo_trafego_pago',
    description:
      'Resumo de Tráfego Pago: quantos leads, negócios fechados e receita vieram de cada origem de anúncio (Meta Ads, Google Ads, etc.), com base na atribuição registrada no lead.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (tenantId) => {
      const grouped = await prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId },
        _count: { _all: true },
        _sum: { totalPurchased: true },
      })
      const porOrigem = grouped
        .map((g) => ({ origem: g.source, leads: g._count._all, receita: round2(g._sum.totalPurchased ?? 0) }))
        .sort((a, b) => b.leads - a.leads)
      return { totalLeads: porOrigem.reduce((acc, o) => acc + o.leads, 0), porOrigem }
    },
  },
  {
    name: 'listar_catalogo',
    description:
      'Lista o catálogo de produtos/serviços do CRM. Útil para identificar as ofertas disponíveis e atribuí-las a leads no atendimento ou no Tráfego Pago.',
    inputSchema: {
      type: 'object',
      properties: {
        apenasAtivos: { type: 'boolean', description: 'Se true, retorna somente itens ativos (padrão true).' },
        busca: { type: 'string', description: 'Filtra por nome do item (opcional).' },
        tipo: { type: 'string', description: 'PRODUTO ou SERVICO.' },
      },
    },
    handler: async (tenantId, args) => {
      const where: any = { tenantId }
      if (args.apenasAtivos !== false) where.isActive = true
      if (args.busca) where.name = { contains: String(args.busca), mode: 'insensitive' }
      if (args.tipo) where.kind = String(args.tipo).toUpperCase()
      const items = await prisma.catalogItem.findMany({
        where,
        include: { leadTypes: { select: { leadType: { select: { label: true } } } } },
        orderBy: { sortOrder: 'asc' },
      })
      return {
        total: items.length,
        itens: items.map((i) => ({
          id: i.id, nome: i.name, tipo: i.kind, preco: i.price,
          descricao: i.description, ativo: i.isActive,
          tiposLead: i.leadTypes.map((lt) => lt.leadType.label),
        })),
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

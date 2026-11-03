import type { McpTool } from '../tools'
import { prisma } from '@/lib/db'
import { EMAIL_CATEGORIES, EMAIL_CAMPAIGN_STATUS_META } from '@/lib/crm-constants'
import { buildSegmentWhere } from '@/lib/email-segment'
import {
  audienceWhere,
  campaignSegments,
  campaignStats,
  duplicateCampaign,
  sendCampaignBatch,
  type CampaignSegment,
} from '@/lib/services/email/campaigns'

// ---------------------------------------------------------------------------
// Ferramentas MCP de E-mail Marketing.
// Leitura da estrutura (categorias, segmentos, formulários, templates),
// criação/edição de campanhas, gestão de listas e exclusões, e envio em lotes.
// Tudo restrito ao tenant do token.
// ---------------------------------------------------------------------------

const SEGMENT_TYPES: Record<string, string> = {
  ALL: 'Todos os leads',
  STATUS: 'Status da jornada',
  SOURCE: 'Origem do lead',
  LEAD_TYPE: 'Tipo de lead',
  TAG: 'Tag',
  FORMULARIO: 'Formulário',
  COMPANY: 'Empresa',
  CNPJ: 'CNPJ',
  CATALOG_ITEM: 'Item do catálogo',
  OBJECTIVE: 'Objetivo',
  DEAL_VALUE: 'Valor do negócio (mínimo)',
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
}

function parseSegments(args: Record<string, any>): CampaignSegment[] {
  const out: CampaignSegment[] = []
  const push = (type?: unknown, value?: unknown) => {
    const t = text(type).toUpperCase()
    if (!t) return
    const v = text(value)
    out.push({ segmentType: t, segmentValue: v || null })
  }

  const list = args.segmentos ?? args.listas
  if (Array.isArray(list)) {
    for (const item of list) {
      if (typeof item === 'string') {
        const [type, ...rest] = item.split(':')
        push(type, rest.join(':') || null)
      } else if (item && typeof item === 'object') {
        push(item.segmentType ?? item.tipo, item.segmentValue ?? item.valor)
      }
    }
  }

  const single = args.segmento
  if (typeof single === 'string' && single.trim()) {
    const [type, ...rest] = single.split(':')
    push(type, rest.join(':') || null)
  } else if (single && typeof single === 'object') {
    push(single.segmentType ?? single.tipo, single.segmentValue ?? single.valor)
  }

  if (args.formulario) push('FORMULARIO', args.formulario)
  if (args.status) push('STATUS', args.status)
  if (args.tag) push('TAG', args.tag)
  if (args.origem) push('SOURCE', args.origem)
  if (args.tipoLeadId) push('LEAD_TYPE', args.tipoLeadId)
  if (args.cnpj) push('CNPJ', args.cnpj)
  if (args.empresa) push('COMPANY', args.empresa)
  if (args.catalogoItemId) push('CATALOG_ITEM', args.catalogoItemId)

  if (out.length === 0) out.push({ segmentType: 'ALL', segmentValue: null })
  return out
}

function segmentLabel(s: CampaignSegment): string {
  if (s.segmentType === 'ALL') return 'Todos os leads'
  return `${SEGMENT_TYPES[s.segmentType] || s.segmentType}${s.segmentValue ? `: ${s.segmentValue}` : ''}`
}

function campaignView(c: any) {
  const segments = campaignSegments(c)
  return {
    id: c.id,
    nome: c.name,
    assunto: c.subject,
    categoria: c.category,
    categoriaLabel: EMAIL_CATEGORIES[c.category]?.label || c.category,
    status: c.status,
    statusLabel: EMAIL_CAMPAIGN_STATUS_META[c.status]?.label || c.status,
    remetenteNome: c.senderName,
    remetenteEmail: c.senderEmail,
    listas: segments.map((s) => ({ tipo: s.segmentType, valor: s.segmentValue, descricao: segmentLabel(s) })),
    totais: {
      destinatarios: c.totalRecipients,
      enviados: c.totalSent,
      falhas: c.totalFailed,
      abertos: c.totalOpened,
      cliques: c.totalClicked,
      bounced: c.totalBounced,
      registros: c._count?.recipients ?? undefined,
    },
    agendadaPara: c.scheduledAt ? c.scheduledAt.toISOString() : null,
    enviadaEm: c.sentAt ? c.sentAt.toISOString() : null,
    criadaEm: c.createdAt ? c.createdAt.toISOString() : null,
  }
}

async function requireCampaign(tenantId: string, id: string) {
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, tenantId },
    include: { audiences: true, _count: { select: { recipients: true } } },
  })
  if (!campaign) throw new Error(`Campanha "${id}" não encontrada neste tenant.`)
  return campaign
}

async function tenantResend(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { resendApiKey: true, resendFrom: true, resendReplyTo: true, resendEnabled: true },
  })
}

export const emailMarketingMcpTools: McpTool[] = [
  // ------------------------------------------------------------------ leitura
  {
    name: 'listar_templates_email',
    description:
      'Lista os templates de e-mail do tenant (nome, assunto, categoria e HTML). Use para reaproveitar um layout ao criar campanhas.',
    inputSchema: {
      type: 'object',
      properties: {
        incluirHtml: { type: 'boolean', description: 'Se true (padrão), retorna o HTML de cada template.' },
      },
    },
    handler: async (tenantId, args) => {
      const templates = await prisma.emailTemplate.findMany({
        where: { tenantId },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      })
      return {
        total: templates.length,
        templates: templates.map((t) => ({
          id: t.id,
          nome: t.name,
          assunto: t.subject,
          categoria: t.category,
          categoriaLabel: EMAIL_CATEGORIES[t.category]?.label || t.category,
          variaveis: t.variables,
          padrao: t.isDefault,
          html: args.incluirHtml === false ? undefined : t.htmlBody,
        })),
      }
    },
  },
  {
    name: 'listar_categorias_segmentos',
    description:
      'Mostra as categorias de campanha e todos os tipos de segmento disponíveis, com os valores que existem hoje na base (status, origens, tags, formulários, empresas, CNPJs, objetivos, tipos de lead e itens do catálogo).',
    inputSchema: { type: 'object', properties: {} },
    handler: async (tenantId) => {
      const [leads, leadTypes, catalogItems] = await Promise.all([
        prisma.lead.findMany({
          where: { tenantId, isArchived: false },
          select: { status: true, source: true, tags: true, formulario: true, companyName: true, cnpj: true, objective: true },
        }),
        prisma.leadType.findMany({ where: { tenantId }, select: { id: true, label: true }, orderBy: { label: 'asc' } }),
        prisma.catalogItem.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      ])
      const uniq = (arr: Array<string | null | undefined>) =>
        [...new Set(arr.filter(Boolean) as string[])].sort()
      return {
        categorias: Object.entries(EMAIL_CATEGORIES).map(([key, v]) => ({ chave: key, nome: v.label })),
        segmentos: Object.entries(SEGMENT_TYPES).map(([key, label]) => ({
          tipo: key,
          nome: label,
          valores:
            key === 'STATUS' ? uniq(leads.map((l) => l.status)) :
            key === 'SOURCE' ? uniq(leads.map((l) => l.source)) :
            key === 'TAG' ? uniq(leads.flatMap((l) => l.tags || [])) :
            key === 'FORMULARIO' ? uniq(leads.map((l) => l.formulario)) :
            key === 'COMPANY' ? uniq(leads.map((l) => l.companyName)) :
            key === 'CNPJ' ? uniq(leads.map((l) => l.cnpj)) :
            key === 'OBJECTIVE' ? uniq(leads.map((l) => l.objective)) :
            key === 'LEAD_TYPE' ? leadTypes.map((t) => ({ id: t.id, nome: t.label })) :
            key === 'CATALOG_ITEM' ? catalogItems.map((c) => ({ id: c.id, nome: c.name })) :
            undefined,
        })),
      }
    },
  },
  {
    name: 'listar_formularios',
    description:
      'Lista os formulários/origens de captação presentes nos leads (ex.: comunidade-olha-o-foguete) com a quantidade de leads com e-mail em cada um. Use o valor em contar_audiencia ou criar_campanha_email.',
    inputSchema: {
      type: 'object',
      properties: {
        incluirSemFormulario: { type: 'boolean', description: 'Inclui os leads sem formulário preenchido.' },
      },
    },
    handler: async (tenantId, args) => {
      const leads = await prisma.lead.findMany({
        where: { tenantId, isArchived: false, email: { not: null } },
        select: { formulario: true, emailOptOut: true },
      })
      const map = new Map<string, { total: number; comEmail: number; descadastrados: number }>()
      for (const l of leads) {
        const key = l.formulario || (args.incluirSemFormulario ? '(sem formulário)' : null)
        if (!key) continue
        const item = map.get(key) || { total: 0, comEmail: 0, descadastrados: 0 }
        item.total++
        item.comEmail++
        if (l.emailOptOut) item.descadastrados++
        map.set(key, item)
      }
      return {
        total: map.size,
        formularios: [...map.entries()]
          .map(([formulario, v]) => ({ formulario, ...v }))
          .sort((a, b) => b.comEmail - a.comEmail),
      }
    },
  },
  {
    name: 'contar_audiencia',
    description:
      'Calcula quantos destinatários uma campanha teria (sem enviar). Aceita várias listas (união) e exclusões. Exclui quem não tem e-mail, está arquivado, se descadastrou ou foi removido manualmente.',
    inputSchema: {
      type: 'object',
      properties: {
        segmentos: {
          type: 'array',
          description: 'Listas da campanha (união). Ex.: [{segmentType:"FORMULARIO",segmentValue:"comunidade-olha-o-foguete"},{segmentType:"TAG",segmentValue:"vip"}]',
          items: { type: 'object' },
        },
        segmento: { type: 'string', description: 'Atalho para uma lista só, no formato TIPO:VALOR (ex.: FORMULARIO:comunidade-olha-o-foguete).' },
        formulario: { type: 'string', description: 'Atalho: filtra por formulário.' },
        status: { type: 'string', description: 'Atalho: filtra por status da jornada.' },
        tag: { type: 'string', description: 'Atalho: filtra por tag.' },
        origem: { type: 'string', description: 'Atalho: filtra por origem do lead.' },
        excluirLeads: { type: 'array', items: { type: 'string' }, description: 'IDs de leads a excluir da contagem.' },
        excluirEmails: { type: 'array', items: { type: 'string' }, description: 'E-mails a excluir da contagem.' },
      },
    },
    handler: async (tenantId, args) => {
      const segments = parseSegments(args)
      const where: any = audienceWhere(tenantId, segments)
      const leadIds = Array.isArray(args.excluirLeads) ? args.excluirLeads.map(text).filter(Boolean) : []
      const emails = Array.isArray(args.excluirEmails) ? args.excluirEmails.map((e: any) => text(e).toLowerCase()).filter(Boolean) : []
      if (leadIds.length) where.id = { notIn: leadIds }
      if (emails.length) where.email = { not: null, notIn: emails }

      const total = await prisma.lead.count({ where })
      const porFormulario = await prisma.lead.groupBy({
        by: ['formulario'],
        where,
        _count: { _all: true },
      })
      return {
        total,
        listas: segments.map((s) => ({ ...s, descricao: segmentLabel(s) })),
        exclusoes: { leads: leadIds.length, emails: emails.length },
        porFormulario: porFormulario
          .map((g) => ({ formulario: g.formulario || '(sem formulário)', total: g._count._all }))
          .sort((a, b) => b.total - a.total),
      }
    },
  },
  {
    name: 'listar_campanhas_email',
    description: 'Lista as campanhas de e-mail com status, listas e totais (enviados, falhas, aberturas, cliques).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtra por status: DRAFT, SCHEDULED, SENDING, SENT, PAUSED ou CANCELLED.' },
        limite: { type: 'number', description: 'Máximo de campanhas (padrão 25, máx 100).' },
        pagina: { type: 'number', description: 'Página (padrão 1).' },
      },
    },
    handler: async (tenantId, args) => {
      const limit = Math.min(Math.max(Number(args.limite) || 25, 1), 100)
      const page = Math.max(Number(args.pagina) || 1, 1)
      const where: any = { tenantId }
      if (args.status) where.status = text(args.status).toUpperCase()
      const [total, campaigns] = await Promise.all([
        prisma.emailCampaign.count({ where }),
        prisma.emailCampaign.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { audiences: true, _count: { select: { recipients: true } } },
        }),
      ])
      return {
        total,
        pagina: page,
        temMais: page * limit < total,
        campanhas: campaigns.map(campaignView),
      }
    },
  },
  {
    name: 'buscar_campanha_email',
    description: 'Retorna os detalhes completos de uma campanha (HTML incluso), por id ou por nome.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string', description: 'ID da campanha.' },
        nome: { type: 'string', description: 'Nome (ou parte do nome) da campanha.' },
      },
    },
    handler: async (tenantId, args) => {
      let campaign: any = null
      if (args.campanhaId) {
        campaign = await requireCampaign(tenantId, text(args.campanhaId))
      } else if (args.nome) {
        campaign = await prisma.emailCampaign.findFirst({
          where: { tenantId, name: { contains: text(args.nome), mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          include: { audiences: true, _count: { select: { recipients: true } } },
        })
        if (!campaign) throw new Error(`Nenhuma campanha encontrada com nome "${args.nome}".`)
      } else {
        throw new Error('Informe campanhaId ou nome.')
      }
      return {
        ...campaignView(campaign),
        html: campaign.htmlBody,
        exclusoes: await prisma.emailCampaignExclusion.count({ where: { campaignId: campaign.id } }),
      }
    },
  },
  {
    name: 'status_campanha_email',
    description:
      'Mostra o andamento de uma campanha: total do público, enviados, pendentes, falhas, descadastros, aberturas e cliques. Use depois de cada lote para acompanhar.',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string', description: 'ID da campanha.' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      const stats = await campaignStats(campaign as any)
      return {
        campanhaId: campaign.id,
        nome: campaign.name,
        statusLabel: EMAIL_CAMPAIGN_STATUS_META[campaign.status]?.label || campaign.status,
        listas: campaignSegments(campaign as any).map((s) => ({ ...s, descricao: segmentLabel(s) })),
        ...stats,
      }
    },
  },

  // ------------------------------------------------------------------ escrita
  {
    name: 'criar_campanha_email',
    description:
      'Cria uma campanha de e-mail como RASCUNHO (não envia). Aceita uma ou várias listas. Se informar templateId, usa assunto/HTML do template quando não vierem no argumento.',
    inputSchema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome interno da campanha.' },
        assunto: { type: 'string', description: 'Assunto do e-mail.' },
        html: { type: 'string', description: 'HTML do e-mail. Aceita {{nome}}, {{primeiro_nome}} e {{email}}.' },
        categoria: { type: 'string', description: 'Categoria: broadcast, novidade, lembrete, reativacao, venda, nurturing.' },
        segmentos: { type: 'array', items: { type: 'object' }, description: 'Listas (união): [{segmentType, segmentValue}].' },
        segmento: { type: 'string', description: 'Atalho TIPO:VALOR para uma lista.' },
        formulario: { type: 'string', description: 'Atalho: público do formulário.' },
        templateId: { type: 'string', description: 'ID do template base (opcional).' },
        remetenteNome: { type: 'string', description: 'Nome do remetente (opcional).' },
        remetenteEmail: { type: 'string', description: 'E-mail de resposta (opcional).' },
      },
      required: ['nome'],
    },
    handler: async (tenantId, args) => {
      const segments = parseSegments(args)
      let subject = text(args.assunto)
      let html = text(args.html)

      if (args.templateId) {
        const template = await prisma.emailTemplate.findFirst({ where: { id: text(args.templateId), tenantId } })
        if (!template) throw new Error(`Template "${args.templateId}" não encontrado neste tenant.`)
        if (!subject) subject = template.subject
        if (!html) html = template.htmlBody
      }
      if (!subject) throw new Error('Informe o assunto do e-mail.')
      if (!html) throw new Error('Informe o HTML do e-mail (ou um templateId).')

      const category = text(args.categoria) || 'broadcast'
      if (!EMAIL_CATEGORIES[category]) {
        throw new Error(`Categoria "${category}" inválida. Use: ${Object.keys(EMAIL_CATEGORIES).join(', ')}.`)
      }

      const created = await prisma.emailCampaign.create({
        data: {
          tenantId,
          name: text(args.nome),
          subject,
          htmlBody: html,
          category,
          templateId: args.templateId ? text(args.templateId) : null,
          senderName: text(args.remetenteNome) || null,
          senderEmail: text(args.remetenteEmail) || null,
          status: 'DRAFT',
          segmentType: segments[0].segmentType,
          segmentValue: segments[0].segmentValue || null,
          createdById: null,
          audiences: {
            create: segments.map((s) => ({
              tenantId,
              segmentType: s.segmentType,
              segmentValue: s.segmentValue || null,
            })),
          },
        },
        include: { audiences: true, _count: { select: { recipients: true } } },
      })

      const where: any = audienceWhere(tenantId, segments)
      const total = await prisma.lead.count({ where })
      return { ok: true, campanha: campaignView(created), audiencia: total, enviada: false }
    },
  },
  {
    name: 'atualizar_campanha_email',
    description:
      'Atualiza nome, assunto, HTML, categoria, listas ou remetente de uma campanha. Só permitido em rascunho, pausada ou agendada.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string' },
        nome: { type: 'string' },
        assunto: { type: 'string' },
        html: { type: 'string' },
        categoria: { type: 'string' },
        segmentos: { type: 'array', items: { type: 'object' }, description: 'Substitui todas as listas.' },
        formulario: { type: 'string', description: 'Atalho para substituir as listas por um formulário.' },
        remetenteNome: { type: 'string' },
        remetenteEmail: { type: 'string' },
      },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      if (!['DRAFT', 'PAUSED', 'SCHEDULED'].includes(campaign.status)) {
        throw new Error(`Campanha em status ${campaign.status} não pode ser editada.`)
      }
      const segments = args.segmentos || args.formulario ? parseSegments(args) : null
      const data: any = {}
      if (args.nome) data.name = text(args.nome)
      if (args.assunto) data.subject = text(args.assunto)
      if (args.html) data.htmlBody = text(args.html)
      if (args.categoria) {
        const category = text(args.categoria)
        if (!EMAIL_CATEGORIES[category]) throw new Error(`Categoria "${category}" inválida.`)
        data.category = category
      }
      if ('remetenteNome' in args) data.senderName = text(args.remetenteNome) || null
      if ('remetenteEmail' in args) data.senderEmail = text(args.remetenteEmail) || null
      if (segments) {
        data.segmentType = segments[0].segmentType
        data.segmentValue = segments[0].segmentValue || null
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (segments) {
          await tx.emailCampaignAudience.deleteMany({ where: { campaignId: campaign.id } })
          await tx.emailCampaignAudience.createMany({
            data: segments.map((s) => ({
              tenantId,
              campaignId: campaign.id,
              segmentType: s.segmentType,
              segmentValue: s.segmentValue || null,
            })),
          })
        }
        return tx.emailCampaign.update({
          where: { id: campaign.id },
          data,
          include: { audiences: true, _count: { select: { recipients: true } } },
        })
      })
      return { ok: true, campanha: campaignView(updated) }
    },
  },
  {
    name: 'pausar_campanha_email',
    description: 'Pausa uma campanha em andamento. Novos lotes ficam bloqueados até retomar.',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      if (campaign.status === 'CANCELLED' || campaign.status === 'SENT') {
        throw new Error(`Campanha em status ${campaign.status} não pode ser pausada.`)
      }
      const updated = await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: 'PAUSED' } })
      return { ok: true, campanhaId: updated.id, status: updated.status }
    },
  },
  {
    name: 'retomar_campanha_email',
    description: 'Retoma uma campanha pausada (volta para SENDING).',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      if (campaign.status !== 'PAUSED') throw new Error('Só é possível retomar campanhas pausadas.')
      const updated = await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: 'SENDING' } })
      return { ok: true, campanhaId: updated.id, status: updated.status }
    },
  },
  {
    name: 'cancelar_campanha_email',
    description: 'Cancela a campanha. Quem ainda não recebeu não recebe mais. Para disparar de novo, duplique a campanha.',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      const updated = await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: 'CANCELLED' } })
      return { ok: true, campanhaId: updated.id, status: updated.status }
    },
  },
  {
    name: 'duplicar_campanha_email',
    description:
      'Cria uma nova campanha em rascunho copiando conteúdo/HTML da original, com listas novas (ou as mesmas). Use para redisparar para outra lista sem reenviar para quem já recebeu.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string', description: 'Campanha original.' },
        novoNome: { type: 'string', description: 'Nome da nova campanha (opcional).' },
        segmentos: { type: 'array', items: { type: 'object' }, description: 'Listas da nova campanha.' },
        formulario: { type: 'string', description: 'Atalho para uma lista por formulário.' },
      },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const segments = args.segmentos || args.formulario ? parseSegments(args) : undefined
      const created = await duplicateCampaign({
        tenantId,
        campaignId: text(args.campanhaId),
        name: args.novoNome ? text(args.novoNome) : undefined,
        segments,
      })
      const where: any = audienceWhere(tenantId, campaignSegments(created as any))
      const total = await prisma.lead.count({ where })
      return { ok: true, campanha: campaignView(created), audiencia: total, enviada: false }
    },
  },
  {
    name: 'adicionar_lista_campanha',
    description: 'Adiciona uma ou mais listas (segmentos) a uma campanha. O público passa a ser a união das listas.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string' },
        segmentos: { type: 'array', items: { type: 'object' } },
        formulario: { type: 'string' },
        segmento: { type: 'string', description: 'Atalho TIPO:VALOR.' },
      },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      const segments = parseSegments(args)
      const existing = new Set(campaign.audiences.map((a) => `${a.segmentType}|${a.segmentValue || ''}`))
      const toCreate = segments.filter((s) => !existing.has(`${s.segmentType}|${s.segmentValue || ''}`))
      if (toCreate.length) {
        await prisma.emailCampaignAudience.createMany({
          data: toCreate.map((s) => ({
            tenantId,
            campaignId: campaign.id,
            segmentType: s.segmentType,
            segmentValue: s.segmentValue || null,
          })),
        })
      }
      const updated = await requireCampaign(tenantId, campaign.id)
      return {
        ok: true,
        adicionadas: toCreate.map((s) => segmentLabel(s)),
        listas: campaignSegments(updated as any).map((s) => ({ ...s, descricao: segmentLabel(s) })),
        audiencia: await prisma.lead.count({ where: audienceWhere(tenantId, campaignSegments(updated as any)) as any }),
      }
    },
  },
  {
    name: 'remover_lista_campanha',
    description: 'Remove uma lista de uma campanha, pelo id da lista ou pelo tipo/valor do segmento.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string' },
        listaId: { type: 'string', description: 'ID da lista (ver listar_listas_campanha).' },
        segmentType: { type: 'string' },
        segmentValue: { type: 'string' },
      },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      let where: any
      if (args.listaId) where = { id: text(args.listaId), campaignId: campaign.id }
      else if (args.segmentType) {
        where = {
          campaignId: campaign.id,
          segmentType: text(args.segmentType).toUpperCase(),
          segmentValue: text(args.segmentValue) || null,
        }
      } else throw new Error('Informe listaId ou segmentType.')
      const removed = await prisma.emailCampaignAudience.deleteMany({ where })
      if (removed.count === 0) throw new Error('Lista não encontrada nesta campanha.')
      const updated = await requireCampaign(tenantId, campaign.id)
      return {
        ok: true,
        removidas: removed.count,
        listas: campaignSegments(updated as any).map((s) => ({ ...s, descricao: segmentLabel(s) })),
      }
    },
  },
  {
    name: 'listar_listas_campanha',
    description: 'Lista as listas/segmentos de uma campanha, com a contagem de leads de cada uma.',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      const listas = await Promise.all(
        campaign.audiences.map(async (a) => ({
          id: a.id,
          tipo: a.segmentType,
          valor: a.segmentValue,
          descricao: segmentLabel({ segmentType: a.segmentType, segmentValue: a.segmentValue }),
          leads: await prisma.lead.count({
            where: {
              ...buildSegmentWhere(tenantId, a.segmentType, a.segmentValue),
              email: { not: null },
              isArchived: false,
              emailOptOut: false,
            },
          }),
        }))
      )
      return { campanhaId: campaign.id, total: listas.length, listas }
    },
  },
  {
    name: 'excluir_leads_campanha',
    description:
      'Remove leads (por id ou e-mail) do público de uma campanha, sem apagar o lead do CRM. Eles não recebem esta campanha.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string' },
        leadIds: { type: 'array', items: { type: 'string' } },
        emails: { type: 'array', items: { type: 'string' } },
        motivo: { type: 'string' },
      },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      const leadIds = Array.isArray(args.leadIds) ? args.leadIds.map(text).filter(Boolean) : []
      const emails = Array.isArray(args.emails) ? args.emails.map((e: any) => text(e).toLowerCase()).filter(Boolean) : []
      if (!leadIds.length && !emails.length) throw new Error('Informe leadIds ou emails.')

      if (leadIds.length) {
        const found = await prisma.lead.findMany({ where: { id: { in: leadIds }, tenantId }, select: { id: true } })
        const valid = new Set(found.map((l) => l.id))
        const invalid = leadIds.filter((id) => !valid.has(id))
        if (invalid.length) throw new Error(`Leads não encontrados neste tenant: ${invalid.join(', ')}`)
      }

      await prisma.emailCampaignExclusion.createMany({
        data: [
          ...leadIds.map((leadId) => ({
            tenantId,
            campaignId: campaign.id,
            leadId,
            reason: text(args.motivo) || null,
          })),
          ...emails.map((email) => ({
            tenantId,
            campaignId: campaign.id,
            email,
            reason: text(args.motivo) || null,
          })),
        ],
      })
      const stats = await campaignStats((await requireCampaign(tenantId, campaign.id)) as any)
      return { ok: true, excluidos: leadIds.length + emails.length, ...stats }
    },
  },
  {
    name: 'listar_exclusoes_campanha',
    description: 'Lista os leads/e-mails removidos manualmente do público de uma campanha.',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      const exclusions = await prisma.emailCampaignExclusion.findMany({
        where: { campaignId: campaign.id },
        orderBy: { createdAt: 'desc' },
      })
      const leadIds = exclusions.map((e) => e.leadId).filter(Boolean) as string[]
      const leads = leadIds.length
        ? await prisma.lead.findMany({ where: { id: { in: leadIds }, tenantId }, select: { id: true, name: true, email: true } })
        : []
      const byId = new Map(leads.map((l) => [l.id, l]))
      return {
        total: exclusions.length,
        exclusoes: exclusions.map((e) => ({
          id: e.id,
          leadId: e.leadId,
          nome: e.leadId ? byId.get(e.leadId)?.name ?? null : null,
          email: e.email || (e.leadId ? byId.get(e.leadId)?.email ?? null : null),
          motivo: e.reason,
          criadaEm: e.createdAt.toISOString(),
        })),
      }
    },
  },
  {
    name: 'incluir_leads_campanha',
    description: 'Desfaz uma exclusão: devolve leads/e-mails ao público da campanha.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string' },
        leadIds: { type: 'array', items: { type: 'string' } },
        emails: { type: 'array', items: { type: 'string' } },
        exclusaoIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, text(args.campanhaId))
      const exclusaoIds = Array.isArray(args.exclusaoIds) ? args.exclusaoIds.map(text).filter(Boolean) : []
      const leadIds = Array.isArray(args.leadIds) ? args.leadIds.map(text).filter(Boolean) : []
      const emails = Array.isArray(args.emails) ? args.emails.map((e: any) => text(e).toLowerCase()).filter(Boolean) : []
      const removed = await prisma.emailCampaignExclusion.deleteMany({
        where: {
          campaignId: campaign.id,
          OR: [
            ...(exclusaoIds.length ? [{ id: { in: exclusaoIds } }] : []),
            ...(leadIds.length ? [{ leadId: { in: leadIds } }] : []),
            ...(emails.length ? [{ email: { in: emails } }] : []),
          ],
        },
      })
      return { ok: true, reincluidos: removed.count }
    },
  },

  // -------------------------------------------------------------------- envio
  {
    name: 'enviar_lote_campanha',
    description:
      'Envia apenas o PRÓXIMO lote de destinatários que ainda não receberam a campanha e retorna os totais e quantos faltam. Pode ser chamada repetidamente (ex.: cron a cada 10 min) até restantes = 0. Nunca reenvia para quem já foi processado e ignora descadastrados e exclusões.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string', description: 'ID da campanha.' },
        tamanho: { type: 'number', description: 'Tamanho do lote (padrão 25, máx 100).' },
      },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      return sendCampaignBatch({
        tenantId,
        campaignId: text(args.campanhaId),
        limit: Number(args.tamanho) || 25,
      })
    },
  },
]

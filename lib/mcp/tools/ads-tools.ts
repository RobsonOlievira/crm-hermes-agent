import type { McpTool } from '../tools'
import { prisma } from '@/lib/db'
import { checkAlerts } from '@/lib/ads/alerts'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

async function requireCampaign(tenantId: string, campaignId: string) {
  const campaign = await prisma.adCampaign.findFirst({ where: { id: campaignId, tenantId } })
  if (!campaign) throw new Error(`Campanha "${campaignId}" não encontrada neste tenant.`)
  return campaign
}

export const adsMcpTools: McpTool[] = [
  {
    name: 'listar_adsets',
    description: 'Lista os conjuntos de anúncios (AdSets) de uma campanha, com gasto, cliques e leads.',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string', description: 'ID da campanha.' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      await requireCampaign(tenantId, String(args.campanhaId))
      const adSets = await prisma.adSet.findMany({
        where: { tenantId, campaignId: String(args.campanhaId) },
        orderBy: { totalSpend: 'desc' },
      })
      return {
        total: adSets.length,
        conjuntos: adSets.map((a) => ({
          id: a.id,
          nome: a.name,
          status: a.status,
          orcamentoDiario: a.dailyBudget,
          gasto: round2(a.totalSpend),
          cliques: a.totalClicks,
          leads: a.totalLeads,
        })),
      }
    },
  },
  {
    name: 'listar_alertas_orcamento',
    description: 'Lista alertas de orçamento/CPL/ROI das campanhas (estouro, CPL alto, ROI negativo). Permite filtrar só os não lidos.',
    inputSchema: {
      type: 'object',
      properties: {
        apenasNaoLidos: { type: 'boolean', description: 'Se true, retorna apenas alertas não lidos.' },
        limite: { type: 'number', description: 'Máximo de alertas (padrão 50).' },
      },
    },
    handler: async (tenantId, args) => {
      const where: any = { tenantId }
      if (args.apenasNaoLidos) where.isRead = false
      const alerts = await prisma.adBudgetAlert.findMany({
        where,
        include: { campaign: { select: { name: true } } },
        orderBy: { triggeredAt: 'desc' },
        take: Math.min(Math.max(Number(args.limite) || 50, 1), 200),
      })
      return {
        total: alerts.length,
        alertas: alerts.map((a) => ({
          id: a.id,
          tipo: a.type,
          severidade: a.severity,
          mensagem: a.message,
          campanha: a.campaign?.name ?? null,
          lido: a.isRead,
          em: a.triggeredAt.toISOString(),
        })),
      }
    },
  },
  {
    name: 'verificar_alertas_campanha',
    description:
      'Reavalia uma campanha e gera alertas de orçamento/CPL/ROI se os limites forem atingidos (sem duplicar no mesmo dia). Use para checar saúde de uma campanha sob demanda.',
    inputSchema: {
      type: 'object',
      properties: { campanhaId: { type: 'string' } },
      required: ['campanhaId'],
    },
    handler: async (tenantId, args) => {
      const campaign = await requireCampaign(tenantId, String(args.campanhaId))
      await checkAlerts(campaign)
      const alerts = await prisma.adBudgetAlert.findMany({
        where: { tenantId, campaignId: campaign.id, isRead: false },
        orderBy: { triggeredAt: 'desc' },
      })
      return {
        ok: true,
        campanha: campaign.name,
        alertasAtivos: alerts.map((a) => ({ tipo: a.type, severidade: a.severity, mensagem: a.message })),
      }
    },
  },
  {
    name: 'alterar_status_campanha',
    description:
      'Altera o status da campanha REGISTRADO NO CRM (ACTIVE, PAUSED, ARCHIVED, DELETED). ATENÇÃO: isto NÃO pausa o gasto no Meta/Google — serve para organização/relatórios no CRM. Para pausar o gasto de verdade, faça na plataforma de anúncios.',
    inputSchema: {
      type: 'object',
      properties: {
        campanhaId: { type: 'string' },
        status: { type: 'string', description: 'ACTIVE, PAUSED, ARCHIVED ou DELETED.' },
      },
      required: ['campanhaId', 'status'],
    },
    handler: async (tenantId, args) => {
      await requireCampaign(tenantId, String(args.campanhaId))
      const status = String(args.status).toUpperCase()
      if (!['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'].includes(status)) {
        throw new Error('Status inválido. Use ACTIVE, PAUSED, ARCHIVED ou DELETED.')
      }
      const updated = await prisma.adCampaign.update({
        where: { id: String(args.campanhaId) },
        data: { status: status as any },
      })
      return { ok: true, campanhaId: updated.id, status: updated.status, aviso: 'Status alterado apenas no CRM — não afeta o gasto na plataforma.' }
    },
  },
  {
    name: 'registrar_gasto_ads',
    description:
      'Registra/atualiza o GASTO de tráfego pago (Meta/Google Ads) de um mês e o lança automaticamente como DESPESA no fluxo de caixa (categoria "Tráfego Pago", variável). É assim que o gasto de anúncios entra no fluxo de caixa. Idempotente: por padrão SUBSTITUI o valor do mês para aquela plataforma (use quando o Hermes reenvia o gasto ACUMULADO do mês, sem duplicar); use modo "somar" para acrescentar um gasto pontual ao que já foi lançado no mês.',
    inputSchema: {
      type: 'object',
      properties: {
        valor: { type: 'number', description: 'Valor gasto em reais (ex.: 850.00).' },
        mes: { type: 'number', description: 'Mês de competência (1 = Janeiro ... 12 = Dezembro).' },
        ano: { type: 'number', description: 'Ano de competência (ex.: 2026).' },
        plataforma: { type: 'string', description: 'META, GOOGLE ou OUTRO. Usado na descrição da despesa. Padrão META.' },
        descricao: { type: 'string', description: 'Descrição da despesa (opcional). Padrão: "<Plataforma> Ads". Serve como chave para não duplicar no mês.' },
        modo: { type: 'string', description: '"substituir" (padrão: o valor passa a ser o total do mês para essa fonte) ou "somar" (acrescenta ao já lançado no mês).' },
      },
      required: ['valor', 'mes', 'ano'],
    },
    handler: async (tenantId, args) => {
      const valor = Number(args.valor)
      if (!Number.isFinite(valor) || valor < 0) throw new Error('Valor inválido. Informe um número maior ou igual a zero.')
      const mes = Number(args.mes)
      if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error('Mês inválido. Use 1 (Janeiro) a 12 (Dezembro).')
      const ano = Number(args.ano)
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) throw new Error('Ano inválido.')
      const month0 = mes - 1

      const plataforma = String(args.plataforma || 'META').toUpperCase()
      const platformLabel =
        plataforma === 'META' ? 'Meta' : plataforma === 'GOOGLE' ? 'Google' : plataforma.charAt(0) + plataforma.slice(1).toLowerCase()
      const descricao = args.descricao ? String(args.descricao).trim() : `${platformLabel} Ads`
      const modo = String(args.modo || 'substituir').toLowerCase()
      if (!['substituir', 'somar'].includes(modo)) throw new Error('Modo inválido. Use "substituir" ou "somar".')

      const categoria = 'Tráfego Pago'

      // Garante que o mês existe no fluxo de caixa
      const cf = await prisma.monthlyCashFlow.upsert({
        where: { tenantId_year_month: { tenantId, year: ano, month: month0 } },
        create: { tenantId, year: ano, month: month0 },
        update: {},
      })

      // Procura uma despesa existente dessa mesma fonte no mês (idempotência)
      const existing = await prisma.cashFlowExpense.findFirst({
        where: { cashFlowId: cf.id, category: categoria, description: descricao },
      })

      let expense
      if (existing) {
        const novoValor = modo === 'somar' ? existing.amount + valor : valor
        expense = await prisma.cashFlowExpense.update({
          where: { id: existing.id },
          data: { amount: round2(novoValor) },
        })
      } else {
        expense = await prisma.cashFlowExpense.create({
          data: { cashFlowId: cf.id, category: categoria, description: descricao, amount: round2(valor), isFixed: false },
        })
      }

      // Total de despesas do mês após o lançamento
      const totalDespesas = await prisma.cashFlowExpense.aggregate({
        where: { cashFlowId: cf.id },
        _sum: { amount: true },
      })

      return {
        ok: true,
        mes,
        ano,
        categoria,
        descricao,
        modo,
        valorInformado: round2(valor),
        gastoAdsNoMes: round2(expense.amount),
        totalDespesasDoMes: round2(totalDespesas._sum.amount ?? 0),
        mensagem: `Gasto de ${descricao} (${String(mes).padStart(2, '0')}/${ano}) ${
          existing ? (modo === 'somar' ? 'somado ao' : 'atualizado no') : 'lançado no'
        } fluxo de caixa.`,
      }
    },
  },
]

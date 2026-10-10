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
]

import { prisma } from '@/lib/db'
import { AdCampaign } from '@prisma/client'

/**
 * Calcula CPL médio do tenant para comparação
 */
async function getAvgCPL(tenantId: string): Promise<number> {
  const totals = await prisma.adCampaign.aggregate({
    where: { tenantId },
    _sum: { totalSpend: true, totalLeads: true },
  })
  const spend = totals._sum.totalSpend || 0
  const leads = totals._sum.totalLeads || 0
  return leads > 0 ? spend / leads : 0
}

/**
 * Verifica e gera alertas de orçamento, CPL e ROI para uma campanha
 */
export async function checkAlerts(campaign: AdCampaign) {
  const alerts: { type: string; message: string; severity: string }[] = []

  // Check Orçamento
  const budget = campaign.dailyBudget || campaign.lifetimeBudget || 0
  if (budget > 0) {
    const pct = (campaign.totalSpend / budget) * 100
    if (pct >= 100) {
      alerts.push({
        type: 'BUDGET_100',
        message: `"${campaign.name}" esgotou o orçamento (${pct.toFixed(0)}%)`,
        severity: 'critical',
      })
    } else if (pct >= 80) {
      alerts.push({
        type: 'BUDGET_80',
        message: `"${campaign.name}" consumiu ${pct.toFixed(0)}% do orçamento`,
        severity: 'warning',
      })
    }
  }

  // Check CPL alto
  if (campaign.totalLeads > 0) {
    const cpl = campaign.totalSpend / campaign.totalLeads
    const avgCPL = await getAvgCPL(campaign.tenantId)
    if (avgCPL > 0 && cpl > avgCPL * 2) {
      alerts.push({
        type: 'CPL_HIGH',
        message: `CPL de "${campaign.name}" (R$ ${cpl.toFixed(2)}) está ${(cpl / avgCPL).toFixed(1)}x acima da média`,
        severity: 'warning',
      })
    }
  }

  // Check ROI negativo
  if (campaign.totalSpend > 0 && campaign.totalRevenue > 0) {
    const roi = ((campaign.totalRevenue - campaign.totalSpend) / campaign.totalSpend) * 100
    if (roi < 0) {
      alerts.push({
        type: 'ROI_LOW',
        message: `"${campaign.name}" está com ROI negativo (${roi.toFixed(0)}%)`,
        severity: 'critical',
      })
    }
  }

  // Persistir evitando duplicatas no mesmo dia
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const a of alerts) {
    const exists = await prisma.adBudgetAlert.findFirst({
      where: {
        campaignId: campaign.id,
        type: a.type,
        triggeredAt: { gte: today },
      },
    })
    if (!exists) {
      await prisma.adBudgetAlert.create({
        data: {
          tenantId: campaign.tenantId,
          campaignId: campaign.id,
          type: a.type,
          message: a.message,
          severity: a.severity,
        },
      })
    }
  }
}

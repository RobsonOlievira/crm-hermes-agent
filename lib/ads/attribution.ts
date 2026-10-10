import { prisma } from '@/lib/db'
import { Lead } from '@prisma/client'

/**
 * Tenta vincular um lead a uma campanha de anúncios cadastrada.
 * Prioridade:
 * 1. adId no lead -> externalId da AdCampaign
 * 2. utmCampaign no lead -> nome da AdCampaign (contém/fuzzy)
 */
export async function attributeLeadToCampaign(lead: Lead): Promise<string | null> {
  if (!lead.tenantId) return null

  // Prioridade 1: adId -> externalId
  if (lead.adId) {
    const campaign = await prisma.adCampaign.findFirst({
      where: { tenantId: lead.tenantId, externalId: lead.adId },
    })
    if (campaign) return campaign.id
  }

  // Prioridade 2: utmCampaign -> nome da campanha
  if (lead.utmCampaign) {
    const campaign = await prisma.adCampaign.findFirst({
      where: {
        tenantId: lead.tenantId,
        name: { contains: lead.utmCampaign, mode: 'insensitive' },
      },
    })
    if (campaign) return campaign.id
  }

  return null
}

/**
 * Executa atribuição e atualiza os totais acumulados da campanha.
 */
export async function runAttribution(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return null

  const campaignId = await attributeLeadToCampaign(lead)
  if (campaignId && lead.adCampaignId !== campaignId) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { adCampaignId: campaignId },
    })

    // Recalcular totais da campanha
    const count = await prisma.lead.count({ where: { adCampaignId: campaignId } })
    const converted = await prisma.lead.count({
      where: {
        adCampaignId: campaignId,
        status: { in: ['SERVICO_FECHADO', 'PAGAMENTO_CONFIRMADO'] },
      },
    })
    const revenue = await prisma.lead.aggregate({
      where: {
        adCampaignId: campaignId,
        status: { in: ['SERVICO_FECHADO', 'PAGAMENTO_CONFIRMADO'] },
      },
      _sum: { totalPurchased: true },
    })

    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: {
        totalLeads: count,
        totalConversions: converted,
        totalRevenue: revenue._sum.totalPurchased || 0,
      },
    })
  }

  return campaignId
}

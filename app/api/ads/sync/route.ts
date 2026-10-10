export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { checkAlerts } from '@/lib/ads/alerts'

export async function POST() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const accounts = await prisma.adAccount.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      include: { campaigns: true },
    })

    const now = new Date()

    // Atualiza o horário de último sync de todas as contas e roda checagem de alertas
    for (const acc of accounts) {
      await prisma.adAccount.update({
        where: { id: acc.id },
        data: { lastSyncAt: now, syncError: null },
      })

      for (const campaign of acc.campaigns) {
        await checkAlerts(campaign)
      }
    }

    return NextResponse.json({
      ok: true,
      syncedAccounts: accounts.length,
      syncedAt: now.toISOString(),
      message: 'Sincronização concluída com sucesso.',
    })
  } catch (error) {
    console.error('Erro ao sincronizar anúncios:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar contas' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const accounts = await prisma.adAccount.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        externalId: true,
        name: true,
        currency: true,
        timezone: true,
        isActive: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        _count: { select: { campaigns: true } },
      },
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Erro ao listar contas de anúncios:', error)
    return NextResponse.json({ error: 'Erro ao listar contas de anúncios' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { platform, externalId, name, accessToken } = body

    if (!platform || !['META', 'GOOGLE'].includes(platform)) {
      return NextResponse.json({ error: 'Plataforma inválida' }, { status: 400 })
    }
    if (!externalId || !name) {
      return NextResponse.json({ error: 'ID externo e nome da conta são obrigatórios' }, { status: 400 })
    }

    const account = await prisma.adAccount.upsert({
      where: {
        tenantId_platform_externalId: {
          tenantId: user.tenantId,
          platform,
          externalId,
        },
      },
      update: {
        name,
        accessToken: accessToken || null,
        isActive: true,
        syncError: null,
      },
      create: {
        tenantId: user.tenantId,
        platform,
        externalId,
        name,
        accessToken: accessToken || null,
        isActive: true,
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Erro ao salvar conta de anúncio:', error)
    return NextResponse.json({ error: 'Erro ao salvar conta de anúncio' }, { status: 500 })
  }
}

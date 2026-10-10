export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { searchProspects } from '@/lib/services/prospecting/aisa-service'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { nicho, cidade, quantos = 10, simular = false } = body

    if (!nicho || !cidade) {
      return NextResponse.json(
        { error: 'Nicho e Cidade são obrigatórios para a prospecção' },
        { status: 400 }
      )
    }

    // Busca a chave AIsa configurada no tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { aisaApiKey: true, niche: true },
    })

    const aisaApiKey = tenant?.aisaApiKey || process.env.AISA_API_KEY || null

    const prospects = await searchProspects({
      nicho,
      cidade,
      quantos: Math.min(Number(quantos) || 10, 30),
      aisaApiKey,
      simular: simular || !aisaApiKey,
    })

    return NextResponse.json({
      ok: true,
      nicho,
      cidade,
      total: prospects.length,
      prospects,
    })
  } catch (e: any) {
    console.error('Erro na API de prospecção:', e)
    return NextResponse.json(
      { error: e?.message || 'Erro ao realizar prospecção' },
      { status: 500 }
    )
  }
}

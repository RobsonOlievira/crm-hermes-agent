export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { aisaApiKey: true, niche: true },
    })

    const apiKey = tenant?.aisaApiKey || process.env.AISA_API_KEY || ''
    // Retorna uma versão mascarada da chave para segurança no frontend
    const maskedKey = apiKey
      ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
      : ''

    return NextResponse.json({
      hasKey: Boolean(apiKey),
      maskedKey,
      niche: tenant?.niche || '',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao carregar configurações' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { aisaApiKey, niche } = await req.json()

    const dataToUpdate: any = {}
    if (typeof aisaApiKey === 'string') dataToUpdate.aisaApiKey = aisaApiKey.trim()
    if (typeof niche === 'string') dataToUpdate.niche = niche.trim()

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: dataToUpdate,
    })

    return NextResponse.json({
      ok: true,
      message: 'Configurações do AIsa atualizadas com sucesso!',
      hasKey: Boolean(dataToUpdate.aisaApiKey || process.env.AISA_API_KEY),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao salvar configurações' }, { status: 500 })
  }
}

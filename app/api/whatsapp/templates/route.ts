export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { listWaTemplates, createWaTemplate } from '@/lib/whatsapp-broadcast'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const templates = await listWaTemplates(user.tenantId)
    return NextResponse.json({ templates })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao listar templates' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.name || !body.bodyText) {
      return NextResponse.json({ error: 'Nome do template e Texto do corpo são obrigatórios' }, { status: 400 })
    }

    const template = await createWaTemplate(user.tenantId, {
      name: body.name,
      language: body.language,
      category: body.category,
      bodyText: body.bodyText,
      headerType: body.headerType,
      headerText: body.headerText,
      footerText: body.footerText,
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao cadastrar template' }, { status: 500 })
  }
}

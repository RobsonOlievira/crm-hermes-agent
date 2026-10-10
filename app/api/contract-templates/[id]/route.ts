export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const b = await req.json()

  try {
    // Se for default, remover o default dos outros
    if (b.isDefault) {
      await prisma.contractTemplate.updateMany({
        where: { tenantId: user.tenantId, isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      })
    }

    const template = await prisma.contractTemplate.update({
      where: { id: params.id, tenantId: user.tenantId },
      data: {
        name: b.name,
        description: b.description ?? null,
        body: b.body,
        isDefault: b.isDefault ?? false,
        isActive: b.isActive ?? true,
      },
    })

    return NextResponse.json({ template })
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'Erro desconhecido ao salvar o modelo'
    return NextResponse.json({ error: 'Erro ao salvar o modelo', detail }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.contractTemplate.delete({
    where: { id: params.id, tenantId: user.tenantId },
  })

  return NextResponse.json({ ok: true })
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// ── GET — Listar fontes de receita do tenant ──
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const sources = await prisma.revenueSource.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(sources)
  } catch (err) {
    console.error('[GET /api/cashflow/revenue-sources]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── PUT — Substituir todas as fontes de receita ──
// body: { sources: [{ id?, name, icon?, isRecurring, isActive, sortOrder }] }
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { sources } = await req.json()

    // Obter IDs existentes para saber quais deletar
    const existing = await prisma.revenueSource.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((e) => e.id))
    const incomingIds = new Set((sources as any[]).filter((s) => s.id).map((s) => s.id))

    // Deletar os que foram removidos
    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await prisma.revenueSource.deleteMany({ where: { id: { in: toDelete } } })
    }

    // Upsert cada fonte
    for (let i = 0; i < (sources as any[]).length; i++) {
      const s = (sources as any[])[i]
      if (s.id && existingIds.has(s.id)) {
        await prisma.revenueSource.update({
          where: { id: s.id },
          data: {
            name: s.name,
            icon: s.icon || null,
            isRecurring: s.isRecurring ?? false,
            isActive: s.isActive ?? true,
            sortOrder: i,
          },
        })
      } else {
        await prisma.revenueSource.create({
          data: {
            tenantId: user.tenantId,
            name: s.name,
            icon: s.icon || null,
            isRecurring: s.isRecurring ?? false,
            isActive: s.isActive ?? true,
            sortOrder: i,
          },
        })
      }
    }

    const updated = await prisma.revenueSource.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/cashflow/revenue-sources]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

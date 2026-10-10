import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getOrSeedChecklistStages } from '@/lib/project-checklist'

// ── GET — Etapas do checklist do tenant (semeia padrões na 1ª vez) ──
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const stages = await getOrSeedChecklistStages(user.tenantId)
    return NextResponse.json({ stages })
  } catch (err) {
    console.error('[GET /api/projects/checklist-stages]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── PUT — Substituir a lista de etapas do tenant ──
// body: { stages: [{ id?, label, sortOrder, isActive }] }
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const tenantId = user.tenantId

    const { stages = [] } = await req.json()
    const clean = (Array.isArray(stages) ? stages : [])
      .map((s: any, i: number) => ({
        label: typeof s.label === 'string' ? s.label.trim() : '',
        sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : i,
        isActive: s.isActive !== false,
      }))
      .filter((s: any) => s.label)

    // Recriar (delete + create) — simples para edição inline, como no padrão de despesas.
    await prisma.projectChecklistStage.deleteMany({ where: { tenantId } })
    if (clean.length > 0) {
      await prisma.projectChecklistStage.createMany({
        data: clean.map((s: any) => ({
          tenantId,
          label: s.label,
          sortOrder: s.sortOrder,
          isActive: s.isActive,
          isSystem: false,
        })),
      })
    }

    const result = await prisma.projectChecklistStage.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ stages: result })
  } catch (err) {
    console.error('[PUT /api/projects/checklist-stages]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

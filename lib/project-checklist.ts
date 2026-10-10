import { prisma } from '@/lib/db'
import { DEFAULT_PROJECT_CHECKLIST_STAGES } from '@/lib/crm-constants'

export type ChecklistStage = {
  id: string
  label: string
  sortOrder: number
  isActive: boolean
  isSystem: boolean
}

export type ChecklistItem = {
  stageId: string
  label: string
  done: boolean
  doneAt: string | null
}

// Retorna as etapas do checklist do tenant. Na primeira vez (nenhuma cadastrada),
// semeia as etapas padrão (idempotente por tenant).
export async function getOrSeedChecklistStages(tenantId: string): Promise<ChecklistStage[]> {
  const existing = await prisma.projectChecklistStage.findMany({
    where: { tenantId },
    orderBy: { sortOrder: 'asc' },
  })
  if (existing.length > 0) return existing

  await prisma.projectChecklistStage.createMany({
    data: DEFAULT_PROJECT_CHECKLIST_STAGES.map((label, i) => ({
      tenantId,
      label,
      sortOrder: i,
      isActive: true,
      isSystem: true,
    })),
  })

  return prisma.projectChecklistStage.findMany({
    where: { tenantId },
    orderBy: { sortOrder: 'asc' },
  })
}

// Gera o snapshot de checklist (JSON) a partir das etapas ativas do tenant.
export function buildChecklistSnapshot(stages: ChecklistStage[]): ChecklistItem[] {
  return stages
    .filter((s) => s.isActive)
    .map((s) => ({ stageId: s.id, label: s.label, done: false, doneAt: null }))
}

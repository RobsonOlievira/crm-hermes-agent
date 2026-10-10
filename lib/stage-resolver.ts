import { prisma } from '@/lib/db'
import { normalizeStageKey, stripStagePrefix } from '@/lib/lead-stages'

// Etapas do pipeline padrão do tenant (fonte de verdade no banco).
export async function findTenantStages(tenantId: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId },
    orderBy: { isDefault: 'desc' },
    include: { stages: { orderBy: { position: 'asc' } } },
  })
  return pipeline?.stages ?? []
}

// Resolve uma etapa do tenant por id (slug/legado), nome ou status.
export async function resolveTenantStage(tenantId: string, reference: string) {
  const stages = await findTenantStages(tenantId)
  const ref = reference.trim()
  const refKey = normalizeStageKey(ref)
  const refBare = normalizeStageKey(stripStagePrefix(ref))
  return (
    stages.find((s) => s.id === ref) ??
    stages.find((s) => s.name === ref) ??
    stages.find((s) => normalizeStageKey(s.name) === refKey) ??
    stages.find((s) => normalizeStageKey(s.name) === refBare) ??
    stages.find((s) => normalizeStageKey(stripStagePrefix(s.id)) === refBare) ??
    null
  )
}

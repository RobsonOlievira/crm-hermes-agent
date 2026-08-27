export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { JourneyAutomationsManager, AutomationRow } from '@/components/automations/journey-automations-manager'

export default async function AutomationsPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null
  const canManage = user?.role !== 'MEMBER'

  const automations = tenantId
    ? await prisma.journeyAutomation.findMany({
        where: { tenantId },
        orderBy: { sortOrder: 'asc' },
      })
    : []

  const rows: AutomationRow[] = (automations as any[]).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    fromStatus: a.fromStatus,
    toStatus: a.toStatus,
    triggerType: a.triggerType,
    delayHours: a.delayHours,
    action: a.action,
    message: a.message,
    keepChannelTag: a.keepChannelTag,
    connectHermes: a.connectHermes,
    isActive: a.isActive,
    sortOrder: a.sortOrder,
  }))

  return <JourneyAutomationsManager initial={rows} canManage={canManage} />
}

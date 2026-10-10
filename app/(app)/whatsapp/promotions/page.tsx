export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { listWaTemplates, listWaBroadcasts } from '@/lib/whatsapp-broadcast'
import { BroadcastManager, WaTemplateRow, WaBroadcastRow } from '@/components/whatsapp/broadcast-manager'

export default async function WhatsappPromotionsPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const [rawTemplates, rawBroadcasts, leadTypes] = tenantId
    ? await Promise.all([
        listWaTemplates(tenantId),
        listWaBroadcasts(tenantId),
        prisma.leadType.findMany({
          where: { tenantId },
          select: { id: true, label: true, color: true },
          orderBy: { label: 'asc' },
        }),
      ])
    : [[], [], []]

  const templates: WaTemplateRow[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    language: t.language,
    category: t.category,
    bodyText: t.bodyText,
    variablesCount: t.variablesCount,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }))

  const broadcasts: WaBroadcastRow[] = rawBroadcasts.map((b) => ({
    id: b.id,
    title: b.title,
    status: b.status,
    totalRecipients: b.totalRecipients,
    totalSent: b.totalSent,
    totalFailed: b.totalFailed,
    sentAt: b.sentAt ? b.sentAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
    template: {
      id: b.template.id,
      name: b.template.name,
      language: b.template.language,
      bodyText: b.template.bodyText,
    },
  }))

  return (
    <div className="p-6">
      <BroadcastManager
        initialTemplates={templates}
        initialBroadcasts={broadcasts}
        leadTypesOptions={leadTypes}
      />
    </div>
  )
}

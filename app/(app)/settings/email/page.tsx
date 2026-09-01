export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { EmailSettings } from '@/components/settings/email-settings'

function maskKey(key: string | null): string {
  if (!key) return ''
  if (key.length <= 10) return '•'.repeat(key.length)
  return `${key.slice(0, 6)}${'•'.repeat(20)}${key.slice(-4)}`
}

export default async function EmailSettingsPage() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return null

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      resendApiKey: true,
      resendEnabled: true,
      resendFrom: true,
      resendReplyTo: true,
      resendSetAt: true,
    },
  })

  return (
    <EmailSettings
      initialEnabled={tenant?.resendEnabled ?? false}
      initialKeySet={Boolean(tenant?.resendApiKey)}
      initialKeyMasked={maskKey(tenant?.resendApiKey ?? null)}
      initialFrom={tenant?.resendFrom ?? null}
      initialReplyTo={tenant?.resendReplyTo ?? null}
      setAt={tenant?.resendSetAt ? tenant.resendSetAt.toISOString() : null}
    />
  )
}

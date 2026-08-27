export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { MCP_TOOL_SUMMARY } from '@/lib/mcp/tools'
import { McpSettings } from '@/components/settings/mcp-settings'

export default async function McpSettingsPage() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return null

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { mcpEnabled: true, mcpToken: true, mcpTokenSetAt: true },
  })

  const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  const endpoint = `${baseUrl}/api/mcp`

  return (
    <McpSettings
      endpoint={endpoint}
      initialEnabled={tenant?.mcpEnabled ?? false}
      initialToken={tenant?.mcpToken ?? null}
      tokenSetAt={tenant?.mcpTokenSetAt ? tenant.mcpTokenSetAt.toISOString() : null}
      tools={MCP_TOOL_SUMMARY}
    />
  )
}

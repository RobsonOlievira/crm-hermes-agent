import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'

// Gera um token de conexão MCP para o tenant.
// Formato: mcp_<48 hex chars> — aleatório e não adivinhável.
export function generateMcpToken(): string {
  return `mcp_${randomBytes(24).toString('hex')}`
}

// Resolve o tenant a partir do token Bearer. Retorna null se inválido,
// ausente, ou se a integração MCP estiver desativada para o tenant.
export async function resolveTenantByToken(authHeader: string | null): Promise<{ id: string; name: string } | null> {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match ? match[1].trim() : authHeader.trim()
  if (!token || !token.startsWith('mcp_')) return null
  const tenant = await prisma.tenant.findFirst({
    where: { mcpToken: token, mcpEnabled: true },
    select: { id: true, name: true },
  })
  return tenant ?? null
}

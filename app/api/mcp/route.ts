export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveTenantByToken } from '@/lib/mcp/auth'
import { MCP_TOOLS, runMcpTool } from '@/lib/mcp/tools'

// ---------------------------------------------------------------------------
// Servidor MCP (Model Context Protocol) do CRM — transporte HTTP stateless.
// Fala JSON-RPC 2.0. Métodos suportados: initialize, notifications/initialized,
// ping, tools/list, tools/call.
// Autenticação por Bearer token, um por tenant. Todas as ações ficam restritas
// ao tenant dono do token. Este endpoint é pensado para o Hermes Agent operar
// o CRM de forma autônoma.
// ---------------------------------------------------------------------------

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'nexuscrm-mcp', version: '1.0.0' }

function rpcResult(id: any, result: any) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function rpcError(id: any, code: number, message: string, httpStatus = 200) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status: httpStatus })
}

function unauthorized() {
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Token de conexão MCP ausente ou inválido.' } },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="nexuscrm-mcp"' } },
  )
}

function toolList() {
  return MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
}

export async function POST(req: Request) {
  const tenant = await resolveTenantByToken(req.headers.get('authorization'))
  if (!tenant) return unauthorized()

  let body: any
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'JSON inválido.')
  }

  // Suporta batch (array de requests).
  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((m) => handleMessage(tenant.id, m)))
    const filtered = responses.filter((r) => r !== null)
    return NextResponse.json(filtered)
  }

  const single = await handleMessage(tenant.id, body)
  if (single === null) return new NextResponse(null, { status: 202 })
  return NextResponse.json(single)
}

async function handleMessage(tenantId: string, msg: any): Promise<any | null> {
  const { id, method, params } = msg || {}

  // Notificações (sem id) não retornam corpo.
  if (id === undefined || id === null) {
    return null
  }

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions:
            'Servidor MCP do NexusCRM. Use tools/list para descobrir as ferramentas disponíveis e tools/call para executar ações no CRM (leads, funil, agenda, interações, compras e automações). Todas as ações ficam restritas ao tenant do token.',
        },
      }

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: toolList() } }

    case 'tools/call': {
      const name = params?.name
      const args = params?.arguments || {}
      if (!name) return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Parâmetro "name" ausente.' } }
      try {
        const data = await runMcpTool(tenantId, name, args)
        return {
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false },
        }
      } catch (e: any) {
        return {
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: `Erro: ${e?.message || 'falha ao executar a ferramenta.'}` }], isError: true },
        }
      }
    }

    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Método "${method}" não suportado.` } }
  }
}

// GET simples para health-check / descoberta amigável.
export async function GET(req: Request) {
  const tenant = await resolveTenantByToken(req.headers.get('authorization'))
  if (!tenant) return unauthorized()
  return NextResponse.json({
    server: SERVER_INFO,
    protocolVersion: PROTOCOL_VERSION,
    transport: 'streamable-http (JSON-RPC 2.0 via POST)',
    tenant: tenant.name,
    tools: toolList().map((t) => t.name),
  })
}

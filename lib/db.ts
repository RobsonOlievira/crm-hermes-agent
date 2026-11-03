import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Detecta o runtime do Cloudflare Workers.
// Atenção: com `nodejs_compat` recente, `navigator` global é o do Node
// (userAgent "Node.js/xx"), então checar só o userAgent dá falso negativo.
// `WebSocketPair` só existe no workerd e é o sinal confiável.
const isWorkers =
  typeof (globalThis as any).WebSocketPair !== 'undefined' ||
  (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers')

// O cliente é gerado com `engineType = "client"` (sem binário Rust), então o
// driver adapter pg é obrigatório em todos os runtimes — Workers e desktop.
// No Workers conexões não podem ser reaproveitadas entre requisições:
// um cliente por requisição. No Node reaproveitamos um cliente global.
const perRequest = new WeakMap<object, PrismaClient>()

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: isWorkers ? 1 : 5,
  })
  return new PrismaClient({ adapter })
}

function workersClient(): PrismaClient {
  const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')]?.ctx as object | undefined
  const cached = ctx && perRequest.get(ctx)
  if (cached) return cached
  const client = createClient()
  if (ctx) perRequest.set(ctx, client)
  return client
}

function nodeClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient()
  return globalForPrisma.prisma
}

export const prisma: PrismaClient = isWorkers
  ? new Proxy({} as PrismaClient, {
      get(_target, prop) {
        const client = workersClient() as any
        const value = client[prop]
        return typeof value === 'function' ? value.bind(client) : value
      },
    })
  : nodeClient()

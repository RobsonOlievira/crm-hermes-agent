import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isWorkers = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

// No Workers o engine binário do Prisma não roda e conexões não podem ser
// reaproveitadas entre requisições: um cliente por requisição, via driver pg.
const perRequest = new WeakMap<object, PrismaClient>()

function workersClient(): PrismaClient {
  const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')]?.ctx as object | undefined
  const cached = ctx && perRequest.get(ctx)
  if (cached) return cached
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 })
  const client = new PrismaClient({ adapter })
  if (ctx) perRequest.set(ctx, client)
  return client
}

function nodeClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient()
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

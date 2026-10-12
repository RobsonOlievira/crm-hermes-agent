// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover. Devolve só contagens, tempos e erros.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const TOKEN = '12da8f312c0039bbda96614f077400003d1c'

export async function GET(req: Request) {
  if (req.headers.get('x-diag') !== TOKEN) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const only = new URL(req.url).searchParams.get('t')
  const out: Record<string, string> = {}
  const run = async (name: string, fn: () => Promise<any>) => {
    if (only && only !== name) return
    const s = Date.now()
    try {
      const r = await fn()
      out[name] = 'OK ' + (Array.isArray(r) ? r.length : '') + ' ' + (Date.now() - s) + 'ms'
    } catch (e: any) {
      out[name] = 'FALHOU ' + (Date.now() - s) + 'ms: ' + String(e?.message ?? e).replace(/\s+/g, ' ').slice(-220)
    }
  }
  const inc = { assignedTo: true, leadTypes: { include: { leadType: true } } }
  await run('count', () => prisma.lead.count())
  await run('take50', () => prisma.lead.findMany({ take: 50 }))
  await run('take500', () => prisma.lead.findMany({ take: 500 }))
  await run('take500_select', () => prisma.lead.findMany({ take: 500, select: { id: true } }))
  await run('all_select_id', () => prisma.lead.findMany({ select: { id: true } }))
  await run('all', () => prisma.lead.findMany())
  await run('take100_inc', () => prisma.lead.findMany({ take: 100, include: inc }))
  await run('take500_inc', () => prisma.lead.findMany({ take: 500, include: inc }))
  await run('all_inc', () => prisma.lead.findMany({ include: inc }))
  await run('paralelo3', () => Promise.all([prisma.lead.count(), prisma.user.findMany(), prisma.leadType.findMany()]))
  await run('paralelo_take50x3', () => Promise.all([prisma.lead.findMany({ take: 50 }), prisma.lead.findMany({ take: 50 }), prisma.lead.findMany({ take: 50 })]))
  return NextResponse.json(out)
}

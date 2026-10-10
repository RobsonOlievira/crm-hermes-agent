import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// ── POST — Gerar extrato de cobranças para um cliente ──
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { clientId } = body

    if (!clientId) return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 })

    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId: user.tenantId },
    })
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    // Buscar parcelas pendentes do cliente
    const pendingInstallments = await prisma.projectInstallment.findMany({
      where: {
        tenantId: user.tenantId,
        project: { clientId },
        paid: false,
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    if (!pendingInstallments.length) {
      return NextResponse.json({
        message: 'Nenhuma parcela pendente para este cliente.',
        text: null,
        whatsappUrl: null,
        total: 0,
        installmentCount: 0,
      })
    }

    // Agrupar por mês
    const grouped: Record<string, typeof pendingInstallments> = {}
    for (const inst of pendingInstallments) {
      const key = new Date(inst.dueDate).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(inst)
    }

    // Buscar nome do tenant
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })

    // Montar texto formatado para WhatsApp
    let text = `📋 *${tenant?.name || 'Empresa'} — Extrato de Pendências*\n`
    text += `\n👤 *Cliente:* ${client.name}\n`
    text += `━━━━━━━━━━━━━━━━━━━━\n`

    let total = 0
    const now = new Date()

    for (const [monthLabel, installments] of Object.entries(grouped)) {
      const capitalLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      text += `\n📅 *${capitalLabel}*\n`

      for (const inst of installments) {
        const valor = inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const venc = new Date(inst.dueDate).toLocaleDateString('pt-BR')
        const atrasado = new Date(inst.dueDate) < now ? ' ⚠️ *VENCIDA*' : ''
        text += `  • ${inst.project.name} — Parcela ${inst.number}\n`
        text += `    Valor: *${valor}* | Venc: ${venc}${atrasado}\n`
        total += inst.amount
      }
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`
    text += `💰 *Total pendente:* ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`
    text += `\n_Enviado via ${tenant?.name || 'CRM'}_`

    const phoneClean = client.phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`

    return NextResponse.json({
      text,
      whatsappUrl,
      client: { name: client.name, phone: client.phone },
      total,
      installmentCount: pendingInstallments.length,
    })
  } catch (err) {
    console.error('[POST /api/billing/generate]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

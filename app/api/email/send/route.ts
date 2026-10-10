import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { sendEmailFromAccount } from '@/lib/services/email/email-service'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { accountId, to, subject, html, leadId, clientId } = body

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Campos obrigatórios: to, subject, html' }, { status: 400 })
    }

    const message = await sendEmailFromAccount({
      tenantId: user.tenantId,
      accountId,
      to,
      subject,
      html,
      leadId,
      clientId,
      userId: user.id,
    })

    return NextResponse.json(message, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/email/send]', err)
    return NextResponse.json({ error: err?.message || 'Erro ao enviar email' }, { status: 500 })
  }
}

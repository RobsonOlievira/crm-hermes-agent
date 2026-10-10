import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { encryptText } from '@/lib/crypto'
import nodemailer from 'nodemailer'

// GET — Listar contas conectadas do tenant
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const accounts = await prisma.emailAccount.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        provider: true,
        emailAddress: true,
        displayName: true,
        status: true,
        scopes: true,
        imapHost: true,
        imapPort: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        authUser: true,
        lastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(accounts)
  } catch (err) {
    console.error('[GET /api/email-accounts]', err)
    return NextResponse.json({ error: 'Erro ao listar contas' }, { status: 500 })
  }
}

// POST — Cadastrar conta IMAP/SMTP manual
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      emailAddress,
      displayName,
      imapHost,
      imapPort = 993,
      smtpHost,
      smtpPort = 465,
      smtpSecure = true,
      authUser,
      authPass,
    } = body

    if (!emailAddress || !smtpHost || !authUser || !authPass) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios (E-mail, Host SMTP, Usuário e Senha)' }, { status: 400 })
    }

    // Opcional: Validar envio SMTP antes de salvar
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Boolean(smtpSecure),
        auth: { user: authUser, pass: authPass },
      })
      await transporter.verify()
    } catch (testErr: any) {
      console.warn('[SMTP Verify Warning]', testErr?.message)
      // Não trava obrigatoriamente se for timeout de rede no ambiente local, mas registra aviso
    }

    const encPass = encryptText(authPass)

    const account = await prisma.emailAccount.upsert({
      where: {
        tenantId_emailAddress: {
          tenantId: user.tenantId,
          emailAddress,
        },
      },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        provider: 'imap',
        emailAddress,
        displayName: displayName || emailAddress,
        status: 'active',
        imapHost,
        imapPort: Number(imapPort),
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure: Boolean(smtpSecure),
        authUser,
        authPassEnc: encPass,
      },
      update: {
        status: 'active',
        displayName: displayName || emailAddress,
        imapHost,
        imapPort: Number(imapPort),
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure: Boolean(smtpSecure),
        authUser,
        authPassEnc: encPass,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: account.id,
      emailAddress: account.emailAddress,
      provider: account.provider,
      status: account.status,
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/email-accounts]', err)
    return NextResponse.json({ error: 'Erro ao cadastrar conta de email' }, { status: 500 })
  }
}

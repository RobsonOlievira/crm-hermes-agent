import { prisma } from '@/lib/db'
import { decryptText, encryptText } from '@/lib/crypto'
import { sendGmailMessage } from './adapters/google-adapter'
import { sendMicrosoftGraphMessage } from './adapters/microsoft-adapter'
import { sendSmtpMessage } from './adapters/imap-smtp-adapter'
import { sendEmail as sendResendEmail, defaultConfig } from '@/lib/resend'

export interface SendEmailInput {
  tenantId: string
  accountId?: string // se não informado, usa a primeira conta ativa do tenant
  to: string
  subject: string
  html: string
  leadId?: string
  clientId?: string
  userId?: string
}

// Renova token do Google caso expirado
async function getOrRefreshGoogleToken(account: any): Promise<string> {
  const currentAccess = decryptText(account.accessToken || '')
  const currentRefresh = decryptText(account.refreshToken || '')

  if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) > new Date()) {
    return currentAccess
  }

  if (!currentRefresh) {
    throw new Error('Refresh token não disponível para a conta do Google. É necessário reconectar.')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      refresh_token: currentRefresh,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error('Erro ao renovar token de acesso do Google')
  }

  const newEncAccess = encryptText(data.access_token)
  const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000)

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: newEncAccess,
      tokenExpiresAt: newExpiresAt,
      status: 'active',
    },
  })

  return data.access_token
}

// Renova token da Microsoft caso expirado
async function getOrRefreshMicrosoftToken(account: any): Promise<string> {
  const currentAccess = decryptText(account.accessToken || '')
  const currentRefresh = decryptText(account.refreshToken || '')

  if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) > new Date()) {
    return currentAccess
  }

  if (!currentRefresh) {
    throw new Error('Refresh token não disponível para a conta Microsoft.')
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      refresh_token: currentRefresh,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error('Erro ao renovar token de acesso da Microsoft')
  }

  const newEncAccess = encryptText(data.access_token)
  const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000)

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: newEncAccess,
      tokenExpiresAt: newExpiresAt,
      status: 'active',
    },
  })

  return data.access_token
}

export async function sendEmailFromAccount(input: SendEmailInput) {
  const { tenantId, accountId, to, subject, html, leadId, clientId, userId } = input

  let account = null
  if (accountId) {
    account = await prisma.emailAccount.findFirst({
      where: { id: accountId, tenantId, status: 'active' },
    })
  } else {
    account = await prisma.emailAccount.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    })
  }

  let message: { id: string; sentAt: Date | null }

  if (!account) {
    // Sem caixa conectada: tenta o Resend configurado no tenant (Configurações → Email).
    if (accountId) {
      throw new Error('Conta de e-mail informada não encontrada ou inativa neste tenant.')
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { resendApiKey: true, resendEnabled: true, resendFrom: true, resendReplyTo: true },
    })
    const fallback = defaultConfig()
    const apiKey = tenant?.resendApiKey || fallback.apiKey
    if (!apiKey) {
      throw new Error('Nenhuma conta de e-mail ativa nem chave do Resend configurada. Configure em Configurações → Email (Resend) ou conecte uma conta em Configurações → Contas de Email.')
    }
    if (tenant?.resendApiKey && !tenant.resendEnabled) {
      throw new Error('Envio via Resend está desativado para este tenant (Configurações → Email) e não há conta de e-mail ativa.')
    }
    const res = await sendResendEmail(
      { to, subject, html, tags: [{ name: 'type', value: 'mcp-1to1' }] },
      {
        apiKey,
        from: tenant?.resendApiKey ? tenant.resendFrom || fallback.from : fallback.from,
        replyTo: tenant?.resendReplyTo || tenant?.resendFrom || fallback.replyTo,
      }
    )
    if (!res.ok) {
      throw new Error('Falha no envio via Resend: ' + (res.error || 'erro desconhecido'))
    }
    // EmailMessage exige accountId: o histórico fica na Interaction abaixo.
    message = { id: res.id || 'resend', sentAt: new Date() }
  } else {
    let externalResultId: string | null = null

    if (account.provider === 'google') {
      const accessToken = await getOrRefreshGoogleToken(account)
      const res = await sendGmailMessage({
        accessToken,
        from: account.displayName ? `"${account.displayName}" <${account.emailAddress}>` : account.emailAddress,
        to,
        subject,
        html,
      })
      externalResultId = res.id
    } else if (account.provider === 'microsoft') {
      const accessToken = await getOrRefreshMicrosoftToken(account)
      await sendMicrosoftGraphMessage({ accessToken, to, subject, html })
    } else if (account.provider === 'imap') {
      const authPass = decryptText(account.authPassEnc || '')
      const res = await sendSmtpMessage({
        smtpHost: account.smtpHost || '',
        smtpPort: account.smtpPort || 587,
        smtpSecure: account.smtpSecure ?? true,
        authUser: account.authUser || account.emailAddress,
        authPass,
        from: account.displayName ? `"${account.displayName}" <${account.emailAddress}>` : account.emailAddress,
        to,
        subject,
        html,
      })
      externalResultId = res.messageId
    } else {
      throw new Error(`Provedor de e-mail desconhecido: "${account.provider}".`)
    }

    message = await prisma.emailMessage.create({
      data: {
        tenantId,
        accountId: account.id,
        leadId,
        clientId,
        direction: 'outbound',
        externalId: externalResultId,
        fromAddress: account.emailAddress,
        toAddresses: [to],
        subject,
        bodyHtml: html,
        snippet: html.replace(/<[^>]*>?/gm, '').slice(0, 150),
        isRead: true,
        sentAt: new Date(),
      },
    })
  }

  // Criar interação na linha do tempo do Lead ou Client
  await prisma.interaction.create({
    data: {
      tenantId,
      leadId,
      clientId,
      userId,
      type: 'EMAIL_SENT',
      title: `E-mail enviado: ${subject}`,
      content: html.replace(/<[^>]*>?/gm, '').slice(0, 300),
    },
  })

  // Atualizar data da última interação do lead
  if (leadId) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastInteraction: new Date(),
        lastMessageAt: new Date(),
        lastMessageText: `E-mail: ${subject}`,
      },
    })
  }

  return message
}

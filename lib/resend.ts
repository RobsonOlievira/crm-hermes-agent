const RESEND_URL = 'https://api.resend.com/emails'

export interface ResendResult {
  ok: boolean
  id?: string
  error?: string
}

export interface ResendConfig {
  apiKey: string
  from: string
  replyTo: string
}

// Fallback para variáveis de ambiente (conveniência inicial). O source of
// truth é a configuração do tenant gravada no banco (ver app/api/settings/email).
export function defaultConfig(): ResendConfig {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'NexusCRM <onboarding@resend.dev>',
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || '',
  }
}

// É permitido enviar quando há chave configurada (tenant + fallback env).
export function isResendConfigured(config?: ResendConfig): boolean {
  return Boolean((config && config.apiKey) || process.env.RESEND_API_KEY)
}

async function sendWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  attempts = 3
): Promise<ResendResult> {
  let lastErr: string | null = null
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        return { ok: true, id: data.id }
      }
      const text = await res.text()
      lastErr = `${res.status} ${text}`
      // 4xx (exceto 429) não adianta re-tentar
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { ok: false, error: lastErr }
      }
    } catch (e: any) {
      lastErr = e?.message || String(e)
    }
    if (i < attempts - 1) {
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)))
    }
  }
  return { ok: false, error: lastErr || 'unknown' }
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string | null
  replyTo?: string
  tags?: { name: string; value: string }[]
}

// Envia um email via Resend. Aceita a configuração do tenant; se não for
// passada, usa o fallback de variáveis de ambiente.
export async function sendEmail(input: SendEmailInput, config?: ResendConfig): Promise<ResendResult> {
  const cfg = config || defaultConfig()
  const apiKey = cfg.apiKey || process.env.RESEND_API_KEY || ''
  if (!apiKey) {
    return { ok: false, error: 'Resend não configurado. Vá em Configurações → Email para adicionar sua chave da API.' }
  }
  const payload: Record<string, unknown> = {
    from: cfg.from || 'NexusCRM <onboarding@resend.dev>',
    to: [input.to],
    reply_to: input.replyTo ? [input.replyTo] : [cfg.replyTo || process.env.EMAIL_REPLY_TO || ''].filter(Boolean),
    subject: input.subject,
    html: input.html,
  }
  if (input.text) payload.text = input.text
  if (input.tags?.length) payload.tags = input.tags

  return sendWithRetry(payload, apiKey, 3)
}

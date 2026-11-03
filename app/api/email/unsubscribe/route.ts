export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { verifyUnsubscribeToken } from '@/lib/services/email/campaigns'

function page(title: string, message: string, status: number) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;max-width:460px;text-align:center;box-shadow:0 10px 30px rgba(15,23,42,.06)}
  h1{font-size:20px;margin:0 0 12px}
  p{font-size:15px;line-height:1.6;color:#475569;margin:0}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

// Descadastro público. O token é assinado (campanha + e-mail), então não dá
// para descadastrar terceiros só chutando um endereço.
async function unsubscribe(token: string) {
  const data = verifyUnsubscribeToken(token)
  if (!data) return page('Link inválido', 'Este link de descadastro não é válido ou expirou.', 400)

  const lead = await prisma.lead.findFirst({
    where: { email: { equals: data.email, mode: 'insensitive' } },
    select: { id: true },
  })

  if (lead) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { emailOptOut: true, emailOptOutAt: new Date() },
    })
  }

  await prisma.emailRecipient.updateMany({
    where: { campaignId: data.campaignId, email: data.email },
    data: { status: 'UNSUBSCRIBED' },
  })

  return page(
    'Descadastro confirmado',
    `O e-mail <strong>${data.email}</strong> não vai receber novas campanhas deste CRM. Para voltar a receber, basta falar com a equipe.`,
    200
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  try {
    return await unsubscribe(searchParams.get('t') || '')
  } catch {
    return page('Não foi possível descadastrar', 'Tente novamente mais tarde.', 500)
  }
}

// Alguns provedores disparam o descadastro em um clique via POST.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  try {
    return await unsubscribe(searchParams.get('t') || '')
  } catch {
    return page('Não foi possível descadastrar', 'Tente novamente mais tarde.', 500)
  }
}

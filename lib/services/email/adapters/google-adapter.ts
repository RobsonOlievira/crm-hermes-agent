export interface SendMailParams {
  accessToken: string
  from: string
  to: string
  subject: string
  html: string
}

export async function sendGmailMessage({ accessToken, from, to, subject, html }: SendMailParams) {
  const mimeLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(html).toString('base64'),
  ]

  const rawMime = mimeLines.join('\r\n')
  const base64Url = Buffer.from(rawMime)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64Url }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Falha ao enviar email via Gmail API: ${res.status} ${errText}`)
  }

  const data = await res.json()
  return { id: data.id, threadId: data.threadId }
}

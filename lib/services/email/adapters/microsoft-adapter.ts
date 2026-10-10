export interface SendMicrosoftMailParams {
  accessToken: string
  to: string
  subject: string
  html: string
}

export async function sendMicrosoftGraphMessage({ accessToken, to, subject, html }: SendMicrosoftMailParams) {
  const payload = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: html,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
    saveToSentItems: 'true',
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Falha ao enviar email via Microsoft Graph: ${res.status} ${errText}`)
  }

  return { ok: true }
}

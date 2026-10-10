import nodemailer from 'nodemailer'

export interface SendSmtpMailParams {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  authUser: string
  authPass: string
  from: string
  to: string
  subject: string
  html: string
}

export async function sendSmtpMessage({
  smtpHost,
  smtpPort,
  smtpSecure,
  authUser,
  authPass,
  from,
  to,
  subject,
  html,
}: SendSmtpMailParams) {
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: authUser,
      pass: authPass,
    },
  })

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  })

  return { messageId: info.messageId }
}

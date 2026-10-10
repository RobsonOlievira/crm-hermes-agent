import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'MICROSOFT_CLIENT_ID não configurado no ambiente' }, { status: 400 })
    }

    const { origin } = new URL(req.url)
    const redirectUri = `${origin}/api/oauth/microsoft/callback`

    const scopes = [
      'Mail.Send',
      'Mail.Read',
      'Mail.ReadWrite',
      'Calendars.ReadWrite',
      'offline_access',
      'openid',
      'email',
      'profile',
      'User.Read',
    ].join(' ')

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('response_mode', 'query')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', JSON.stringify({ tenantId: user.tenantId, userId: user.id }))

    return NextResponse.redirect(authUrl.toString())
  } catch (err) {
    console.error('[GET /api/oauth/microsoft/start]', err)
    return NextResponse.json({ error: 'Erro ao iniciar autorização Microsoft' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'GOOGLE_CLIENT_ID não configurado no ambiente' }, { status: 400 })
    }

    const { origin } = new URL(req.url)
    const redirectUri = `${origin}/api/oauth/google/callback`

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy',
      'openid',
      'email',
      'profile',
    ].join(' ')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', JSON.stringify({ tenantId: user.tenantId, userId: user.id }))

    return NextResponse.redirect(authUrl.toString())
  } catch (err) {
    console.error('[GET /api/oauth/google/start]', err)
    return NextResponse.json({ error: 'Erro ao iniciar autorização Google' }, { status: 500 })
  }
}

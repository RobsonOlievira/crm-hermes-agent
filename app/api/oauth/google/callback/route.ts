export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encryptText } from '@/lib/crypto'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=${encodeURIComponent(error || 'Código de autorização ausente')}`)
    }

    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.redirect(`${origin}/login`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${origin}/api/oauth/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=Configuracao_Google_Incompleta`)
    }

    // Trocar código por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Google Callback Error]', tokenData)
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=Falha_ao_obter_tokens`)
    }

    // Obter informações do usuário no Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const userData = await userRes.json()
    const emailAddress = userData.email
    const displayName = userData.name || emailAddress

    if (!emailAddress) {
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=Email_nao_encontrado`)
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null

    const encAccess = encryptText(tokenData.access_token)
    const encRefresh = tokenData.refresh_token ? encryptText(tokenData.refresh_token) : null

    // Buscar conta existente para manter o refresh token se não foi reenviado
    const existing = await prisma.emailAccount.findUnique({
      where: {
        tenantId_emailAddress: {
          tenantId: user.tenantId,
          emailAddress,
        },
      },
    })

    await prisma.emailAccount.upsert({
      where: {
        tenantId_emailAddress: {
          tenantId: user.tenantId,
          emailAddress,
        },
      },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        provider: 'google',
        emailAddress,
        displayName,
        status: 'active',
        accessToken: encAccess,
        refreshToken: encRefresh,
        tokenExpiresAt: expiresAt,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
      },
      update: {
        status: 'active',
        accessToken: encAccess,
        ...(encRefresh ? { refreshToken: encRefresh } : existing?.refreshToken ? {} : {}),
        tokenExpiresAt: expiresAt,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
        updatedAt: new Date(),
      },
    })

    return NextResponse.redirect(`${origin}/settings/email-accounts?success=google`)
  } catch (err) {
    console.error('[GET /api/oauth/google/callback]', err)
    return NextResponse.redirect('/settings/email-accounts?error=Erro_interno')
  }
}

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
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=${encodeURIComponent(error || 'Código ausente')}`)
    }

    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.redirect(`${origin}/login`)
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    const redirectUri = `${origin}/api/oauth/microsoft/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=Configuracao_Microsoft_Incompleta`)
    }

    // Trocar código por tokens no endpoint Microsoft Graph
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Microsoft Callback Error]', tokenData)
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=Falha_ao_obter_tokens_ms`)
    }

    // Obter perfil do usuário
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const userData = await userRes.json()
    const emailAddress = userData.mail || userData.userPrincipalName
    const displayName = userData.displayName || emailAddress

    if (!emailAddress) {
      return NextResponse.redirect(`${origin}/settings/email-accounts?error=Email_ms_nao_encontrado`)
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null

    const encAccess = encryptText(tokenData.access_token)
    const encRefresh = tokenData.refresh_token ? encryptText(tokenData.refresh_token) : null

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
        provider: 'microsoft',
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
        ...(encRefresh ? { refreshToken: encRefresh } : {}),
        tokenExpiresAt: expiresAt,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
        updatedAt: new Date(),
      },
    })

    return NextResponse.redirect(`${origin}/settings/email-accounts?success=microsoft`)
  } catch (err) {
    console.error('[GET /api/oauth/microsoft/callback]', err)
    return NextResponse.redirect('/settings/email-accounts?error=Erro_interno')
  }
}

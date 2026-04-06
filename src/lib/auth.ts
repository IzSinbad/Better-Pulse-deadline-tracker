// Microsoft OAuth helpers — wraps the MSAL node library
// Conestoga students use their @conestogac.on.ca Microsoft accounts
// so we hook into their existing SSO instead of making them create new accounts

import { ConfidentialClientApplication, AuthorizationCodeRequest } from '@azure/msal-node'

function getMsalConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Microsoft OAuth env vars missing — check MICROSOFT_CLIENT_ID, CLIENT_SECRET, TENANT_ID')
  }

  return {
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  }
}

// scopes we need — just basic profile + email, nothing crazy
const SCOPES = ['openid', 'profile', 'email', 'User.Read']

// build the Microsoft login URL to redirect the user to
export async function getMicrosoftLoginUrl(): Promise<string> {
  const msalApp = new ConfidentialClientApplication(getMsalConfig())

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback`

  const authUrl = await msalApp.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri,
    responseMode: 'query',
  })

  return authUrl
}

export interface MicrosoftUserInfo {
  id: string           // the stable Microsoft user ID — we use this as our primary key
  email: string
  displayName: string
}

// exchange the auth code for user info
export async function exchangeCodeForUser(
  code: string
): Promise<MicrosoftUserInfo> {
  const msalApp = new ConfidentialClientApplication(getMsalConfig())

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback`

  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: SCOPES,
    redirectUri,
  }

  const tokenResponse = await msalApp.acquireTokenByCode(tokenRequest)

  if (!tokenResponse?.account) {
    throw new Error('Microsoft auth failed — no account in token response')
  }

  const account = tokenResponse.account
  // grab profile from the /me endpoint using the access token
  const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${tokenResponse.accessToken}`,
    },
  })

  if (!profileRes.ok) {
    throw new Error('Failed to fetch Microsoft profile from Graph API')
  }

  const profile = await profileRes.json() as { id: string; mail: string; displayName: string; userPrincipalName: string }

  return {
    id: profile.id,
    email: profile.mail || profile.userPrincipalName,
    displayName: profile.displayName,
  }
}

// handles D2L OAuth2 token refresh
// access tokens expire after 1 hour — this uses the refresh token to get a new one
// called automatically before any API request if the token looks expired

import { supabaseServer } from './supabase'
import { encrypt, decrypt } from './encryption'

const D2L_TOKEN_URL = 'https://auth.brightspace.com/core/connect/token'

// get a valid access token for a user — refreshes if needed
export async function getValidBrightspaceToken(userId: string): Promise<string> {
  const { data: user } = await supabaseServer
    .from('users')
    .select('brightspace_token_encrypted, brightspace_refresh_token_encrypted')
    .eq('id', userId)
    .single()

  if (!user?.brightspace_token_encrypted) {
    throw new Error('No Brightspace token — user needs to reconnect')
  }

  const accessToken = decrypt(user.brightspace_token_encrypted)

  // check if token is still valid with a quick whoami call
  const testRes = await fetch(
    `${process.env.BRIGHTSPACE_API_BASE_URL}/d2l/api/lp/1.51/users/whoami`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  )

  if (testRes.ok) {
    return accessToken // still good
  }

  // token expired — try refreshing
  if (!user.brightspace_refresh_token_encrypted) {
    throw new Error('Token expired and no refresh token — user needs to reconnect Brightspace')
  }

  const refreshToken = decrypt(user.brightspace_refresh_token_encrypted)

  const refreshRes = await fetch(D2L_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.BRIGHTSPACE_CLIENT_ID!,
      client_secret: process.env.BRIGHTSPACE_CLIENT_SECRET!,
    }),
  })

  if (!refreshRes.ok) {
    throw new Error('Token refresh failed — user needs to reconnect Brightspace')
  }

  const newTokens = await refreshRes.json() as {
    access_token: string
    refresh_token?: string
  }

  // save the new tokens
  await supabaseServer
    .from('users')
    .update({
      brightspace_token_encrypted: encrypt(newTokens.access_token),
      // D2L sometimes issues a new refresh token too
      ...(newTokens.refresh_token
        ? { brightspace_refresh_token_encrypted: encrypt(newTokens.refresh_token) }
        : {}),
    })
    .eq('id', userId)

  return newTokens.access_token
}

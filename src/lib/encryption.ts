// encrypt/decrypt sensitive stuff before saving to the DB
// we're talking Brightspace tokens, API keys — things you really don't want exposed
// using AES-256 with a secret key from env

import CryptoJS from 'crypto-js'

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY env var is missing — check your .env.local')
  return key
}

export function encrypt(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, getKey()).toString()
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, getKey())
  return bytes.toString(CryptoJS.enc.Utf8)
}

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY || process.env.PAYMENT_ENCRYPTION_KEY || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  // Garante que tenha exatamente 32 bytes (64 caracteres hex)
  const paddedKey = keyHex.padEnd(64, '0').slice(0, 64)
  return Buffer.from(paddedKey, 'hex')
}

export function encryptText(plaintext: string): string {
  if (!plaintext) return ''
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

export function decryptText(stored: string): string {
  if (!stored) return ''
  const parts = stored.split(':')
  if (parts.length !== 3) return stored // Retorna original se não for criptografado
  try {
    const [ivHex, tagHex, encrypted] = parts
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Erro ao descriptografar texto:', error)
    return ''
  }
}

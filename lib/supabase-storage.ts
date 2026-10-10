import { createClient } from '@supabase/supabase-js'

const BUCKET = 'branding'
const MAX_SIZE = 5 * 1024 * 1024

function getConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return { url, key }
}

function sanitizeFileName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
  return clean || 'arquivo'
}

export async function uploadFileToStorage(folder: string, file: File): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error('Arquivo muito grande (máx. 5MB)')
  const { url, key } = getConfig()
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
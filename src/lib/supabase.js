import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function checkSupabaseConnection() {
  const { error } = await supabase.auth.getSession()
  if (error) {
    throw new Error('Supabase Auth client could not read its local state.')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  let response

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseKey },
      signal: controller.signal,
    })
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Supabase Auth endpoint request timed out.'
        : 'Unable to reach the Supabase Auth endpoint.'
    throw new Error(message, { cause: error })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new Error(`Supabase Auth endpoint responded with HTTP ${response.status}.`)
  }
}

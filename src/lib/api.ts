import type { Session } from '@supabase/supabase-js'

async function readApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed')
  }
  return data as T
}

export async function apiPost<T>(path: string, session: Session | null, body: unknown): Promise<T> {
  if (!session?.access_token) throw new Error('You must be signed in.')

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  return readApiResponse<T>(response)
}

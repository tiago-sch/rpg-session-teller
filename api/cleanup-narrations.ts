import { supabaseAdmin } from './_supabase.js'
import { sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

// Daily Vercel cron: deletes narration files no session or recap points to any
// more (left behind when a chronicle is edited or a recap is deleted).
// Audio of soft-deleted sessions is kept, since those can be restored.
// It only ever removes unreferenced files, so running it is always safe.

const BUCKET = 'narrations'
const PAGE_SIZE = 1000
// Skip fresh files: the API uploads audio before saving its URL.
const MIN_AGE_MS = 60 * 60 * 1000

type Admin = ReturnType<typeof supabaseAdmin>

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return sendError(res, 401, 'Unauthorized')
  }

  const dryRun = new URL(req.url ?? '/', 'http://localhost').searchParams.get('dryRun') === '1'

  try {
    const admin = supabaseAdmin()
    const [files, referenced] = await Promise.all([listFiles(admin), referencedPaths(admin)])
    const cutoff = Date.now() - MIN_AGE_MS
    const orphans = files
      .filter(f => !referenced.has(f.path) && f.createdAt < cutoff)
      .map(f => f.path)

    if (dryRun) return res.status(200).json({ files: files.length, wouldRemove: orphans })

    for (let i = 0; i < orphans.length; i += PAGE_SIZE) {
      const { error } = await admin.storage.from(BUCKET).remove(orphans.slice(i, i + PAGE_SIZE))
      if (error) throw error
    }

    console.log(`Narration cleanup: ${files.length} files, ${orphans.length} removed`)
    return res.status(200).json({ files: files.length, removed: orphans.length })
  } catch (error) {
    console.error('Narration cleanup failed', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Cleanup failed')
  }
}

// Files live at <user id>/<file>.mp3.
async function listFiles(admin: Admin) {
  const folders = await listAll(admin, '')
  const files: { path: string; createdAt: number }[] = []
  for (const folder of folders.filter(entry => entry.id === null)) {
    const entries = await listAll(admin, folder.name)
    for (const entry of entries) {
      if (entry.id === null) continue
      files.push({
        path: `${folder.name}/${entry.name}`,
        createdAt: entry.created_at ? new Date(entry.created_at).getTime() : 0,
      })
    }
  }
  return files
}

async function listAll(admin: Admin, prefix: string) {
  const all: { name: string; id: string | null; created_at: string | null }[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: PAGE_SIZE, offset })
    if (error) throw error
    all.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return all
  }
}

async function referencedPaths(admin: Admin) {
  const paths = new Set<string>()
  for (const table of ['sessions', 'campaign_recaps'] as const) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await admin
        .from(table)
        .select('audio_url')
        .not('audio_url', 'is', null)
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      for (const row of (data ?? []) as { audio_url: string }[]) {
        const path = storagePath(row.audio_url)
        // An unrecognised URL could make a file look unused, so stop rather than guess.
        if (!path) throw new Error(`Unrecognised audio URL in ${table}: ${row.audio_url}`)
        paths.add(path)
      }
      if (!data || data.length < PAGE_SIZE) break
    }
  }
  return paths
}

function storagePath(publicUrl: string) {
  const marker = `/object/public/${BUCKET}/`
  const index = publicUrl.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length))
}

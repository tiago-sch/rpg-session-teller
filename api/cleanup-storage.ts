import { supabaseAdmin } from './_supabase.js'
import { sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

// Daily Vercel cron: deletes files no row points to any more, such as narrations
// of an edited chronicle or a deleted recap, and replaced cover images.
// Files of soft-deleted sessions are kept, since those can be restored.
// It only ever removes unreferenced files, so running it is always safe.

interface SweptBucket {
  bucket: string
  // Columns holding public URLs of files in the bucket.
  references: { table: string; column: string }[]
}

const BUCKETS: SweptBucket[] = [
  {
    bucket: 'narrations',
    references: [
      { table: 'sessions', column: 'audio_url' },
      { table: 'campaign_recaps', column: 'audio_url' },
    ],
  },
  {
    bucket: 'session-images',
    references: [{ table: 'sessions', column: 'cover_image_url' }],
  },
]

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
    const results: Record<string, { files: number; removed?: number; wouldRemove?: string[] }> = {}

    for (const swept of BUCKETS) {
      const orphans = await findOrphans(admin, swept)
      if (dryRun) {
        results[swept.bucket] = { files: orphans.total, wouldRemove: orphans.paths }
        continue
      }
      for (let i = 0; i < orphans.paths.length; i += PAGE_SIZE) {
        const { error } = await admin.storage.from(swept.bucket).remove(orphans.paths.slice(i, i + PAGE_SIZE))
        if (error) throw error
      }
      results[swept.bucket] = { files: orphans.total, removed: orphans.paths.length }
      console.log(`Storage cleanup ${swept.bucket}: ${orphans.total} files, ${orphans.paths.length} removed`)
    }

    return res.status(200).json(results)
  } catch (error) {
    console.error('Narration cleanup failed', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Cleanup failed')
  }
}

async function findOrphans(admin: Admin, swept: SweptBucket) {
  const [files, referenced] = await Promise.all([listFiles(admin, swept.bucket), referencedPaths(admin, swept)])
  const cutoff = Date.now() - MIN_AGE_MS
  const paths = files
    .filter(f => !referenced.has(f.path) && f.createdAt < cutoff)
    .map(f => f.path)
  return { total: files.length, paths }
}

// Files live at <user id>/<file>.
async function listFiles(admin: Admin, bucket: string) {
  const folders = await listAll(admin, bucket, '')
  const files: { path: string; createdAt: number }[] = []
  for (const folder of folders.filter(entry => entry.id === null)) {
    const entries = await listAll(admin, bucket, folder.name)
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

async function listAll(admin: Admin, bucket: string, prefix: string) {
  const all: { name: string; id: string | null; created_at: string | null }[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE_SIZE, offset })
    if (error) throw error
    all.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return all
  }
}

async function referencedPaths(admin: Admin, swept: SweptBucket) {
  const paths = new Set<string>()
  for (const { table, column } of swept.references) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await admin
        .from(table)
        .select(column)
        .not(column, 'is', null)
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      for (const row of (data ?? []) as unknown as Record<string, string>[]) {
        const path = storagePath(swept.bucket, row[column])
        // An unrecognised URL could make a file look unused, so stop rather than guess.
        if (!path) throw new Error(`Unrecognised ${column} in ${table}: ${row[column]}`)
        paths.add(path)
      }
      if (!data || data.length < PAGE_SIZE) break
    }
  }
  return paths
}

function storagePath(bucket: string, publicUrl: string) {
  const marker = `/object/public/${bucket}/`
  const index = publicUrl.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length))
}

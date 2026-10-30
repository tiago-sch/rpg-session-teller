import { getAppUrl } from './_env.js'
import { supabaseAnon } from './_supabase.js'
import type { ApiRequest, ApiResponse } from './_http.js'

// Serves index.html for share links (/s/:id, /g/:id) with Open Graph tags
// filled in from the session or group, so link previews show real content.

const SITE_NAME = 'RPG Session Teller'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface OgData {
  title: string
  description: string
  url: string
  image: string | null
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const query = new URL(req.url ?? '/', 'http://localhost').searchParams
  const type = query.get('type')
  const id = query.get('id') ?? ''
  const appUrl = getAppUrl().replace(/\/$/, '')

  let html: string
  try {
    html = await fetchIndexHtml(req, appUrl)
  } catch (error) {
    console.error('Failed to load index.html for OG', error)
    return res.status(500).end('Failed to load page')
  }

  let og: OgData | null = null
  if (UUID_RE.test(id)) {
    try {
      if (type === 'session') og = await sessionOg(id, appUrl)
      else if (type === 'group') og = await groupOg(id, appUrl)
    } catch (error) {
      console.error('Failed to load OG data', error)
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
  res.statusCode = 200
  res.end(og ? injectOg(html, og) : html)
}

async function fetchIndexHtml(req: ApiRequest, appUrl: string) {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const origin = typeof host === 'string' ? `https://${host}` : appUrl
  const response = await fetch(`${origin}/index.html`)
  if (!response.ok) throw new Error(`index.html returned ${response.status}`)
  return response.text()
}

async function sessionOg(publicId: string, appUrl: string): Promise<OgData | null> {
  const { data } = await supabaseAnon()
    .from('sessions')
    .select('title, tldr, cover_image_url, campaigns(name)')
    .eq('public_id', publicId)
    .maybeSingle()
  if (!data) return null

  const session = data as unknown as {
    title: string
    tldr: string | null
    cover_image_url: string | null
    campaigns: { name: string } | null
  }
  const campaign = session.campaigns?.name
  return {
    title: campaign ? `${session.title} — ${campaign}` : session.title,
    description: session.tldr || `A chronicle from ${campaign ?? 'a tabletop RPG campaign'}.`,
    url: `${appUrl}/s/${publicId}`,
    image: session.cover_image_url,
  }
}

async function groupOg(publicId: string, appUrl: string): Promise<OgData | null> {
  const supabase = supabaseAnon()
  const { data: group } = await supabase
    .from('session_groups')
    .select('id, title, description')
    .eq('public_id', publicId)
    .maybeSingle()
  if (!group) return null

  const { data: sessions } = await supabase
    .from('group_sessions')
    .select('sessions(cover_image_url)')
    .eq('group_id', group.id)
  const covers = ((sessions ?? []) as unknown as { sessions: { cover_image_url: string | null } | null }[])
    .map(row => row.sessions?.cover_image_url)
    .filter((url): url is string => Boolean(url))

  const count = sessions?.length ?? 0
  return {
    title: group.title,
    description: group.description || `A collection of ${count} chronicle${count === 1 ? '' : 's'}.`,
    url: `${appUrl}/g/${publicId}`,
    image: covers[0] ?? null,
  }
}

function injectOg(html: string, og: OgData) {
  const start = html.indexOf('<!-- og:start -->')
  const end = html.indexOf('<!-- og:end -->')
  if (start === -1 || end === -1) return html

  const title = escapeHtml(truncate(og.title, 90))
  const description = escapeHtml(truncate(og.description, 200))
  const url = escapeHtml(og.url)
  const tags = [
    `<title>${title} · ${SITE_NAME}</title>`,
    `<meta name="description" content="${description}" />`,
    '<meta property="og:type" content="article" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ]

  // Without a cover, keep the default image tags from index.html.
  const defaults = html.slice(start, end)
  if (og.image) {
    const image = escapeHtml(og.image)
    tags.push(
      `<meta property="og:image" content="${image}" />`,
      '<meta property="og:image:width" content="1536" />',
      '<meta property="og:image:height" content="1024" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:image" content="${image}" />`,
    )
  } else {
    tags.push(...(defaults.match(/<meta (property="og:image[^"]*"|name="twitter:(card|image)")[^>]*>/g) ?? []))
  }

  return `${html.slice(0, start)}${tags.join('\n    ')}\n    ${html.slice(end)}`
}

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

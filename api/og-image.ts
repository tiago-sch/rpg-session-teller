import { ImageResponse } from '@vercel/og'
import { createElement as h } from 'react'
import { supabaseAnon } from './_supabase.js'

// Generated 1200x630 preview card used when a page has no cover image:
// the site itself, sessions without a cover, and groups.

export const config = { runtime: 'edge' }

const SITE_NAME = 'RPG Session Teller'
const TAGLINE = 'Your table’s adventures, told as chronicles'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Card {
  eyebrow: string
  title: string
  subtitle: string
}

export default async function handler(req: Request) {
  const query = new URL(req.url).searchParams
  const card = await loadCard(query.get('type'), query.get('id') ?? '')
  const host = new URL(req.url).host

  const text = `${SITE_NAME}${card.eyebrow}${card.title}${card.subtitle}${host}`
  const [cinzel, crimson] = await Promise.all([
    loadGoogleFont('Cinzel', 700, text),
    loadGoogleFont('Crimson Pro', 400, text),
  ])
  const fonts = [
    cinzel && { name: 'Cinzel', data: cinzel, weight: 700 as const, style: 'normal' as const },
    crimson && { name: 'Crimson Pro', data: crimson, weight: 400 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 700 | 400; style: 'normal' }[]

  const titleSize = card.title.length > 60 ? 60 : card.title.length > 32 ? 72 : 88

  const element = h('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      backgroundColor: '#0c0a14',
      backgroundImage: 'radial-gradient(circle at 80% 0%, #2a1f3d 0%, #0c0a14 60%)',
      color: '#f0e6cc',
      fontFamily: 'Crimson Pro',
      border: '2px solid #3d3858',
    },
  },
    h('div', { style: { display: 'flex', flexDirection: 'column' } },
      h('div', {
        style: { display: 'flex', fontFamily: 'Cinzel', fontSize: 26, letterSpacing: 6, color: '#c8913a', textTransform: 'uppercase' },
      }, card.eyebrow),
      h('div', { style: { display: 'flex', width: 96, height: 3, backgroundColor: '#6b4d1e', marginTop: 24, marginBottom: 36 } }),
      h('div', {
        style: { display: 'flex', fontFamily: 'Cinzel', fontSize: titleSize, lineHeight: 1.1, color: '#f0e6cc' },
      }, card.title),
      card.subtitle
        ? h('div', { style: { display: 'flex', fontSize: 36, lineHeight: 1.3, color: '#a89880', marginTop: 28 } }, card.subtitle)
        : null,
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, color: '#7a7390' } },
      h('div', { style: { display: 'flex', fontFamily: 'Cinzel', color: '#e0aa55', letterSpacing: 2 } }, SITE_NAME),
      h('div', { style: { display: 'flex' } }, host),
    ),
  )

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts,
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
  })
}

async function loadCard(type: string | null, id: string): Promise<Card> {
  const fallback: Card = { eyebrow: 'Tabletop RPG chronicles', title: SITE_NAME, subtitle: TAGLINE }
  if (!UUID_RE.test(id)) return fallback

  try {
    const supabase = supabaseAnon()
    if (type === 'session') {
      const { data } = await supabase
        .from('sessions')
        .select('title, tldr, campaigns(name)')
        .eq('public_id', id)
        .maybeSingle()
      if (!data) return fallback
      const session = data as unknown as { title: string; tldr: string | null; campaigns: { name: string } | null }
      return {
        eyebrow: session.campaigns?.name ?? 'A chronicle',
        title: truncate(session.title, 80),
        subtitle: truncate(session.tldr ?? '', 140),
      }
    }
    if (type === 'group') {
      const { data } = await supabase
        .from('session_groups')
        .select('title, description')
        .eq('public_id', id)
        .maybeSingle()
      if (!data) return fallback
      return {
        eyebrow: 'A collection of chronicles',
        title: truncate(data.title, 80),
        subtitle: truncate(data.description ?? '', 140),
      }
    }
  } catch (error) {
    console.error('Failed to load OG image data', error)
  }
  return fallback
}

// Google Fonts serves TTF (which satori can read) when the request has no
// modern browser user agent; `text` subsets the font to the glyphs we draw.
async function loadGoogleFont(family: string, weight: number, text: string) {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`
    const css = await (await fetch(cssUrl)).text()
    const src = /src: url\((.+?)\) format\('(opentype|truetype)'\)/.exec(css)?.[1]
    if (!src) return null
    const response = await fetch(src)
    return response.ok ? response.arrayBuffer() : null
  } catch {
    return null
  }
}

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

import { useState } from 'react'
import { queryClient } from '../lib/queryClient'
import { useAuth } from '../context/AuthContext'
import { useProfile, type Profile } from '../hooks/useProfile'
import { apiPost } from '../lib/api'
import { DEFAULT_VOICE, NARRATION_VOICES, narrationCost } from '../lib/narration'
import InkCost from './InkCost'

// Plays a saved narration, and lets the owner generate (or re-voice) it.
export default function NarrationPlayer({ kind, id, audioUrl, voice, textLength, editable, onGenerated }: {
  kind: 'session' | 'recap'
  id: number
  audioUrl: string | null
  voice: string | null
  textLength: number
  editable: boolean
  onGenerated?: (audioUrl: string, voice: string) => void
}) {
  const { user, session } = useAuth()
  const { profile } = useProfile()
  const [choosing, setChoosing] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(voice ?? DEFAULT_VOICE)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const cost = narrationCost(textLength)
  const notEnoughInk = profile !== null && profile.inks < cost

  if (!audioUrl && !editable) return null

  const handleGenerate = async () => {
    setError('')
    setGenerating(true)
    try {
      const result = await apiPost<{ audioUrl: string; voice: string; inks: number }>('/api/generate-audio', session, {
        kind,
        id,
        voice: selectedVoice,
      })
      queryClient.setQueryData(['profile', user?.id], (old: Profile | null) =>
        old ? { ...old, inks: result.inks } : old
      )
      setChoosing(false)
      onGenerated?.(result.audioUrl, result.voice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Narration failed.')
    } finally {
      setGenerating(false)
    }
  }

  const showControls = editable && (!audioUrl || choosing)

  return (
    <div className="flex flex-col gap-3">
      {audioUrl && (
        <div className="flex flex-col gap-1.5">
          <audio key={audioUrl} controls preload="none" src={audioUrl} className="w-full" style={{ colorScheme: 'dark', height: 40 }} />
          {editable && !choosing && (
            <div className="flex justify-between items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--color-mist)' }}>
                {voice && `Voice: ${NARRATION_VOICES.find(v => v.id === voice)?.label.split(' — ')[0] ?? voice}`}
              </span>
              <button
                type="button"
                onClick={() => setChoosing(true)}
                className="text-xs cursor-pointer transition-opacity hover:opacity-80"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
              >
                Narrate again
              </button>
            </div>
          )}
        </div>
      )}

      {showControls && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              disabled={generating}
              className="rounded-lg px-3 py-2 text-sm cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)', color: 'var(--color-parchment)' }}
              aria-label="Narrator voice"
            >
              {NARRATION_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || notEnoughInk}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {generating ? 'Narrating…' : 'Narrate'}
            </button>
            {choosing && !generating && (
              <button
                type="button"
                onClick={() => setChoosing(false)}
                className="text-xs cursor-pointer transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-parchment-muted)' }}
              >
                Cancel
              </button>
            )}
          </div>
          {generating ? (
            <p className="text-xs" style={{ color: 'var(--color-mist)' }}>Recording the narration… this can take a minute or two for long chronicles.</p>
          ) : (
            <InkCost amount={cost} insufficient={notEnoughInk} />
          )}
        </div>
      )}

      {error && <p className="text-sm" style={{ color: '#e07070' }}>{error}</p>}
    </div>
  )
}

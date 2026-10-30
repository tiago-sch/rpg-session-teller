import { useRef, useState } from 'react'

const SPEEDS = [1, 1.25, 1.5, 0.75]
const SKIP_SECONDS = 15

export default function AudioPlayer({ src, duration: savedDuration }: { src: string; duration?: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [current, setCurrent] = useState(0)
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null)
  const [speedIndex, setSpeedIndex] = useState(0)

  const duration = loadedDuration ?? savedDuration ?? 0
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      setWaiting(true)
      audio.play().catch(() => setWaiting(false))
    } else {
      audio.pause()
    }
  }

  const seekTo = (time: number) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(time, duration || audio.duration || 0))
    audio.currentTime = clamped
    setCurrent(clamped)
  }

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length
    setSpeedIndex(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={e => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setLoadedDuration(d)
        }}
        onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPlaying={() => setWaiting(false)}
        onWaiting={() => setWaiting(true)}
        onPause={() => { setPlaying(false); setWaiting(false) }}
        onEnded={() => { setPlaying(false); setCurrent(0) }}
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause narration' : 'Play narration'}
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-shadow"
        style={{
          background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
          color: '#0c0a14',
          border: '1px solid var(--color-gold-dim)',
          boxShadow: playing ? '0 0 18px rgba(200,145,58,0.45)' : '0 0 10px rgba(200,145,58,0.2)',
        }}
      >
        {waiting ? (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
            <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
          </svg>
        )}
      </button>

      <SkipButton seconds={-SKIP_SECONDS} onClick={() => seekTo(current - SKIP_SECONDS)} />

      <div
        className="flex-1 min-w-0 flex items-center gap-3 text-xs tabular-nums"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)', letterSpacing: '0.04em' }}
      >
        <span className="shrink-0">{formatTime(current)}</span>
        <input
          type="range"
          className="audio-seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(current, duration || 0)}
          disabled={!duration}
          onChange={e => seekTo(Number(e.target.value))}
          aria-label="Seek"
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
        <span className="shrink-0">{duration ? formatTime(duration) : '--:--'}</span>
      </div>

      <SkipButton seconds={SKIP_SECONDS} onClick={() => seekTo(current + SKIP_SECONDS)} />

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label="Playback speed"
        className="shrink-0 w-11 py-1 rounded-md text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80 tabular-nums"
        style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-gold-light)' }}
      >
        {SPEEDS[speedIndex]}×
      </button>
    </div>
  )
}

function SkipButton({ seconds, onClick }: { seconds: number; onClick: () => void }) {
  const back = seconds < 0
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={back ? `Back ${-seconds} seconds` : `Forward ${seconds} seconds`}
      className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full cursor-pointer transition-opacity hover:opacity-80"
      style={{ color: 'var(--color-parchment-muted)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transform: back ? undefined : 'scaleX(-1)' }}>
        <path d="M4 12a8 8 0 1 0 2.34-5.66" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 4v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="15.2" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" style={{ transform: back ? undefined : 'scaleX(-1)', transformOrigin: '12px 12px' }}>
          {Math.abs(seconds)}
        </text>
      </svg>
    </button>
  )
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

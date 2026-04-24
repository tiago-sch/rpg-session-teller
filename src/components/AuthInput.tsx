import type { InputHTMLAttributes } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export default function AuthInput({ label, ...props }: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
      >
        {label}
      </label>
      <input
        {...props}
        className="px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
        style={{
          background: 'var(--color-ink-soft)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-parchment)',
          fontFamily: 'var(--font-body)',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      />
    </div>
  )
}

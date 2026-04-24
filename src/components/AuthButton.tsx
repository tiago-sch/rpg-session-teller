import type { ButtonHTMLAttributes } from 'react'

export default function AuthButton({ children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled}
      className="w-full py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        fontFamily: 'var(--font-display)',
        background: disabled ? 'var(--color-gold-dim)' : 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
        color: '#0c0a14',
        border: '1px solid var(--color-gold-dim)',
        boxShadow: disabled ? 'none' : '0 0 20px rgba(200,145,58,0.2)',
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget.style.boxShadow = '0 0 28px rgba(200,145,58,0.4)')
      }}
      onMouseLeave={e => {
        if (!disabled) (e.currentTarget.style.boxShadow = '0 0 20px rgba(200,145,58,0.2)')
      }}
    >
      {children}
    </button>
  )
}

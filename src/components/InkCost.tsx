export default function InkCost({ amount, insufficient }: { amount: number; insufficient: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: insufficient ? '#e07070' : 'var(--color-gold)', flexShrink: 0 }}>
        <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
      <span className="text-xs" style={{ fontFamily: 'var(--font-display)', color: insufficient ? '#e07070' : 'var(--color-parchment-muted)', letterSpacing: '0.04em' }}>
        {insufficient ? 'Not enough ink' : `Costs ${amount} ink`}
      </span>
    </div>
  )
}

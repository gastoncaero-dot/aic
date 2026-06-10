import { useEffect, useState } from 'react'
import { formatCountdown } from '../lib/format'

export default function Countdown({ target, label }: { target: string; label: string }) {
  const [text, setText] = useState(() => formatCountdown(target))

  useEffect(() => {
    const interval = setInterval(() => setText(formatCountdown(target)), 1000)
    return () => clearInterval(interval)
  }, [target])

  return (
    <div className="rounded-lg bg-primary-dark px-4 py-3 text-center text-white">
      <p className="text-xs uppercase tracking-wide text-emerald-200">{label}</p>
      <p className="font-mono text-2xl font-bold">{text}</p>
    </div>
  )
}

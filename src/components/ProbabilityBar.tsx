import { calculateProbabilities } from '../lib/probability'
import type { Team } from '../types'

export default function ProbabilityBar({ homeTeam, awayTeam }: { homeTeam: Team; awayTeam: Team }) {
  const { home, draw, away } = calculateProbabilities(homeTeam.rating, awayTeam.rating)

  return (
    <div className="mt-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-primary" style={{ width: `${home}%` }} />
        <div className="bg-accent" style={{ width: `${draw}%` }} />
        <div className="bg-slate-400" style={{ width: `${away}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>
          {homeTeam.flag} {home}%
        </span>
        <span>Empate {draw}%</span>
        <span>
          {away}% {awayTeam.flag}
        </span>
      </div>
    </div>
  )
}

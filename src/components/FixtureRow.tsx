import type { Match, Team } from '../types'
import { formatTime } from '../lib/format'
import { isMatchFinished, isMatchLive } from '../lib/scoring'

interface Props {
  match: Match
  homeTeam: Team | null
  awayTeam: Team | null
}

export default function FixtureRow({ match, homeTeam, awayTeam }: Props) {
  const finished = isMatchFinished(match)
  const live = isMatchLive(match)
  const hasScore = match.home_score !== null && match.away_score !== null

  return (
    <div className={`flex items-center gap-2 border-b border-slate-100 px-2 py-2.5 last:border-0 sm:gap-3 sm:px-4 ${live ? 'bg-red-50' : ''}`}>
      <div className="w-12 shrink-0 text-center text-[11px] font-semibold sm:w-14 sm:text-xs">
        {finished ? (
          <span className="text-slate-400">Final</span>
        ) : live ? (
          <span className="flex flex-col items-center gap-0.5 font-bold text-red-600 sm:flex-row sm:gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" aria-hidden />
            {match.minute != null ? `${match.minute}'` : 'EN VIVO'}
          </span>
        ) : (
          <span className="text-slate-500">{formatTime(match.kickoff_at)}</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right">
        <span className="truncate text-xs font-medium text-slate-800 sm:text-sm">
          {homeTeam?.name ?? match.home_placeholder ?? 'Por definir'}
        </span>
        {homeTeam && (
          <span className="text-base leading-none sm:text-lg" aria-hidden>
            {homeTeam.flag}
          </span>
        )}
      </div>

      <div
        className={`shrink-0 rounded-md px-2 py-1 text-center text-xs font-bold sm:text-sm ${
          hasScore ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'
        }`}
        style={{ minWidth: '2.75rem' }}
      >
        {hasScore ? `${match.home_score} - ${match.away_score}` : 'vs'}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {awayTeam && (
          <span className="text-base leading-none sm:text-lg" aria-hidden>
            {awayTeam.flag}
          </span>
        )}
        <span className="truncate text-xs font-medium text-slate-800 sm:text-sm">
          {awayTeam?.name ?? match.away_placeholder ?? 'Por definir'}
        </span>
      </div>
    </div>
  )
}

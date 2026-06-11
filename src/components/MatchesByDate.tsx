import { useMemo, useState } from 'react'
import MatchRow from './MatchRow'
import { formatDateChip, formatDay, getArgentinaToday, toDateTimeLocal } from '../lib/format'
import { PHASE_LABELS, type Match, type Prediction, type Team } from '../types'

interface Props {
  matches: Match[]
  teamsById: Map<number, Team>
  predictions?: Map<number, Prediction>
  onSave?: (matchId: number, home: number, away: number) => Promise<void>
}

export default function MatchesByDate({ matches, teamsById, predictions, onSave }: Props) {
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of matches) {
      const key = toDateTimeLocal(m.kickoff_at).slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(m)
    }
    for (const list of map.values()) list.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [matches])

  const today = getArgentinaToday()

  const defaultKey = useMemo(() => {
    const upcoming = groupedByDate.find(([key]) => key >= today)
    return (upcoming ?? groupedByDate[groupedByDate.length - 1])?.[0] ?? null
  }, [groupedByDate, today])

  const [selected, setSelected] = useState<string | null>(null)
  const activeKey = selected ?? defaultKey
  const activeMatches = groupedByDate.find(([key]) => key === activeKey)?.[1] ?? []

  if (groupedByDate.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {groupedByDate.map(([key, dayMatches]) => {
          const { weekday, day, month } = formatDateChip(dayMatches[0].kickoff_at)
          const isToday = key === today
          const isActive = key === activeKey
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 transition-all ${
                isActive
                  ? 'border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-emerald-50'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                {weekday}
              </span>
              <span className="text-lg font-bold leading-tight">{day}</span>
              <span className={`text-[10px] uppercase ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{month}</span>
              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                  isToday ? (isActive ? 'bg-accent' : 'bg-accent-dark') : 'bg-transparent'
                }`}
                aria-hidden
              />
            </button>
          )
        })}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold text-slate-800">
          {activeMatches[0] ? formatDay(activeMatches[0].kickoff_at) : ''}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {activeMatches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              homeTeam={teamsById.get(m.home_team_id ?? -1) ?? null}
              awayTeam={teamsById.get(m.away_team_id ?? -1) ?? null}
              prediction={predictions?.get(m.id)}
              onSave={onSave}
              groupLabel={m.phase === 'group' ? `Grupo ${m.group_letter}` : PHASE_LABELS[m.phase]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

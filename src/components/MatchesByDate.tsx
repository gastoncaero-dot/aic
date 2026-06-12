import MatchRow from './MatchRow'
import DateChipSelector from './DateChipSelector'
import { useMatchesByDate } from '../hooks/useMatchesByDate'
import { PHASE_LABELS, type Match, type Prediction, type Team } from '../types'

interface Props {
  matches: Match[]
  teamsById: Map<number, Team>
  predictions?: Map<number, Prediction>
  onSave?: (matchId: number, home: number, away: number) => Promise<void>
}

export default function MatchesByDate({ matches, teamsById, predictions, onSave }: Props) {
  const { groupedByDate, today, activeKey, activeMatches, title, setSelected } = useMatchesByDate(matches)

  if (groupedByDate.length === 0) return null

  return (
    <div className="space-y-4">
      <DateChipSelector groupedByDate={groupedByDate} today={today} activeKey={activeKey} onSelect={setSelected} />

      <div>
        <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
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

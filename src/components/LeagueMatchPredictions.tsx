import DateChipSelector from './DateChipSelector'
import FixtureRow from './FixtureRow'
import { useMatchesByDate } from '../hooks/useMatchesByDate'
import { calculateMatchPoints, isMatchFinished, POINTS_EXACT } from '../lib/scoring'
import type { Match, Prediction, Team, UserTotals } from '../types'

interface Props {
  matches: Match[]
  teamsById: Map<number, Team>
  rows: UserTotals[]
  predictionsByUser: Map<string, Prediction[]>
}

export default function LeagueMatchPredictions({ matches, teamsById, rows, predictionsByUser }: Props) {
  const { groupedByDate, today, activeKey, activeMatches, title, setSelected } = useMatchesByDate(matches)

  if (matches.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Todavía no arrancó ningún partido. Los pronósticos de los demás se revelan una vez que arranca cada
        partido.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <DateChipSelector groupedByDate={groupedByDate} today={today} activeKey={activeKey} onSelect={setSelected} />

      <div>
        <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
        <div className="space-y-3">
          {activeMatches.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <FixtureRow
                match={m}
                homeTeam={teamsById.get(m.home_team_id ?? -1) ?? null}
                awayTeam={teamsById.get(m.away_team_id ?? -1) ?? null}
              />
              <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 p-2 sm:grid-cols-3">
                {rows.map((row) => {
                  const pred = predictionsByUser.get(row.user_id)?.find((p) => p.match_id === m.id)
                  const points =
                    pred && isMatchFinished(m)
                      ? calculateMatchPoints(pred.home_score, pred.away_score, m.home_score, m.away_score)
                      : null
                  return (
                    <div
                      key={row.user_id}
                      className="flex items-center justify-between gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs"
                    >
                      <span className="truncate text-slate-600">{row.username}</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        {pred ? `${pred.home_score} - ${pred.away_score}` : '—'}
                        {points !== null && points > 0 && (
                          <span
                            className={`rounded-full px-1 text-[10px] ${
                              points === POINTS_EXACT ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            +{points}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

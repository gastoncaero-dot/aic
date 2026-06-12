import { useState } from 'react'
import type { Match, Prediction, Team } from '../types'
import { calculateMatchPoints, isLockExpired, isMatchFinished, isMatchLive, POINTS_EXACT, POINTS_RESULT } from '../lib/scoring'
import { formatKickoff } from '../lib/format'
import TeamLabel from './TeamLabel'
import ProbabilityBar from './ProbabilityBar'

interface Props {
  match: Match
  homeTeam: Team | null
  awayTeam: Team | null
  prediction?: Prediction
  onSave?: (matchId: number, home: number, away: number) => Promise<void>
  groupLabel?: string
}

export default function MatchRow({ match, homeTeam, awayTeam, prediction, onSave, groupLabel }: Props) {
  const [home, setHome] = useState(prediction?.home_score?.toString() ?? '')
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const locked = isLockExpired(match.lock_at)
  const finished = isMatchFinished(match)
  const live = isMatchLive(match)
  const editable = Boolean(onSave) && !locked

  const points =
    finished && prediction
      ? calculateMatchPoints(prediction.home_score, prediction.away_score, match.home_score, match.away_score)
      : null

  function parseScore(value: string): number | null {
    if (value === '') return null
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0 || n > 99) return null
    return n
  }

  async function handleBlur() {
    if (!onSave) return
    const h = parseScore(home)
    const a = parseScore(away)
    if (h === null || a === null) return
    if (prediction && prediction.home_score === h && prediction.away_score === a) return

    setStatus('saving')
    try {
      await onSave(match.id, h, a)
      setStatus('saved')
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        live ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          {formatKickoff(match.kickoff_at)}
          {groupLabel && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{groupLabel}</span>}
        </span>
        {finished && (
          <span className="font-semibold text-slate-500">
            Final: {match.home_score} - {match.away_score}
          </span>
        )}
        {!finished && live && (
          <span className="flex items-center gap-1.5 font-bold text-red-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" aria-hidden />
            EN VIVO
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <TeamLabel team={homeTeam} placeholder={match.home_placeholder} />

        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={home}
            disabled={!editable}
            onChange={(e) => setHome(e.target.value)}
            onBlur={handleBlur}
            className="h-10 w-12 rounded-md border border-slate-300 text-center text-lg font-semibold disabled:bg-slate-100 disabled:text-slate-400"
            aria-label={`Goles de ${homeTeam?.name ?? 'local'}`}
          />
          <span className="text-slate-400">-</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={away}
            disabled={!editable}
            onChange={(e) => setAway(e.target.value)}
            onBlur={handleBlur}
            className="h-10 w-12 rounded-md border border-slate-300 text-center text-lg font-semibold disabled:bg-slate-100 disabled:text-slate-400"
            aria-label={`Goles de ${awayTeam?.name ?? 'visitante'}`}
          />
        </div>

        <TeamLabel team={awayTeam} placeholder={match.away_placeholder} align="right" />
      </div>

      <div className="mt-2 flex h-5 items-center justify-end gap-2 text-xs">
        {onSave && locked && !finished && <span className="text-slate-400">🔒 Pronóstico cerrado</span>}
        {onSave && !locked && status === 'saving' && <span className="text-slate-400">Guardando...</span>}
        {onSave && !locked && status === 'saved' && <span className="text-emerald-600">✓ Guardado</span>}
        {onSave && !locked && status === 'error' && <span className="text-red-500">Error al guardar</span>}
        {finished && points !== null && (
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              points === POINTS_EXACT
                ? 'bg-emerald-100 text-emerald-700'
                : points === POINTS_RESULT
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            +{points} pts
          </span>
        )}
        {finished && !prediction && <span className="text-slate-400">Sin pronóstico</span>}
      </div>

      {!finished && homeTeam && awayTeam && <ProbabilityBar homeTeam={homeTeam} awayTeam={awayTeam} />}
    </div>
  )
}

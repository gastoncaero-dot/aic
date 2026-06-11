import { useState } from 'react'
import { PHASE_LABELS, type Match, type MatchStatus, type Team } from '../types'
import { fromArgentinaDateTimeLocal, toDateTimeLocal } from '../lib/format'

interface Props {
  match: Match
  teams: Team[]
  onSave: (matchId: number, updates: Partial<Match>) => Promise<void>
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none'

export default function AdminMatchEditor({ match, teams, onSave }: Props) {
  const [homeTeamId, setHomeTeamId] = useState(match.home_team_id?.toString() ?? '')
  const [awayTeamId, setAwayTeamId] = useState(match.away_team_id?.toString() ?? '')
  const [homePlaceholder, setHomePlaceholder] = useState(match.home_placeholder ?? '')
  const [awayPlaceholder, setAwayPlaceholder] = useState(match.away_placeholder ?? '')
  const [kickoff, setKickoff] = useState(toDateTimeLocal(match.kickoff_at))
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '')
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    setMessage(null)
    if (status === 'finished' && (homeScore === '' || awayScore === '')) {
      setMessage('Cargá ambos goles para marcar el partido como finalizado.')
      return
    }

    setSaving(true)
    try {
      await onSave(match.id, {
        home_team_id: homeTeamId ? Number(homeTeamId) : null,
        away_team_id: awayTeamId ? Number(awayTeamId) : null,
        home_placeholder: homeTeamId ? null : homePlaceholder.trim() || null,
        away_placeholder: awayTeamId ? null : awayPlaceholder.trim() || null,
        kickoff_at: fromArgentinaDateTimeLocal(kickoff),
        home_score: homeScore === '' ? null : Number(homeScore),
        away_score: awayScore === '' ? null : Number(awayScore),
        status,
      })
      setMessage('✓ Guardado')
      setTimeout(() => setMessage(null), 1500)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs text-slate-400">
        #{match.id} · {PHASE_LABELS[match.phase]}
        {match.group_letter ? ` · Grupo ${match.group_letter}` : ''}
        {match.matchday ? ` · Fecha ${match.matchday}` : ''}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)} className={inputClass}>
            <option value="">Por definir...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag} {t.name}
              </option>
            ))}
          </select>
          {!homeTeamId && (
            <input
              type="text"
              value={homePlaceholder}
              onChange={(e) => setHomePlaceholder(e.target.value)}
              placeholder="Texto provisorio (ej: Ganador Partido 73)"
              className={inputClass}
            />
          )}
        </div>
        <div className="space-y-1">
          <select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)} className={inputClass}>
            <option value="">Por definir...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag} {t.name}
              </option>
            ))}
          </select>
          {!awayTeamId && (
            <input
              type="text"
              value={awayPlaceholder}
              onChange={(e) => setAwayPlaceholder(e.target.value)}
              placeholder="Texto provisorio (ej: Ganador Partido 74)"
              className={inputClass}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col">
          <input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            className={`${inputClass} w-auto`}
          />
          <span className="mt-0.5 text-[11px] text-slate-400">Hora de Argentina</span>
        </div>
        <input
          type="number"
          min={0}
          max={99}
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          placeholder="Local"
          className={`${inputClass} w-20 text-center`}
        />
        <span className="text-slate-400">-</span>
        <input
          type="number"
          min={0}
          max={99}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          placeholder="Visit."
          className={`${inputClass} w-20 text-center`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as MatchStatus)} className={`${inputClass} w-auto`}>
          <option value="scheduled">Programado</option>
          <option value="finished">Finalizado</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {message && <span className="text-sm text-slate-500">{message}</span>}
      </div>
    </div>
  )
}

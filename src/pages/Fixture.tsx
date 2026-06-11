import { useMemo, useState } from 'react'
import { useFixtureData } from '../hooks/useFixtureData'
import MatchRow from '../components/MatchRow'
import { PHASE_LABELS, type Match, type MatchPhase } from '../types'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const KNOCKOUT_PHASES: MatchPhase[] = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

function tabClass(active: boolean) {
  return active ? 'tab-active' : 'tab-inactive'
}

export default function Fixture() {
  const { matches, teamsById, loading, error } = useFixtureData()
  const [view, setView] = useState<'group' | 'knockout'>('group')

  const groupedByGroup = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const letter of GROUP_LETTERS) map.set(letter, [])
    for (const m of matches) {
      if (m.phase === 'group' && m.group_letter) map.get(m.group_letter)?.push(m)
    }
    return map
  }, [matches])

  const groupedByPhase = useMemo(() => {
    const map = new Map<MatchPhase, Match[]>()
    for (const phase of KNOCKOUT_PHASES) map.set(phase, [])
    for (const m of matches) {
      if (m.phase !== 'group') map.get(m.phase)?.push(m)
    }
    return map
  }, [matches])

  if (loading) return <div className="py-20 text-center text-slate-500">Cargando fixture...</div>
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fixture Mundial 2026</h1>
        <p className="mt-1 text-sm text-slate-500">
          104 partidos · 12 grupos de 4 selecciones · del 11 de junio al 19 de julio
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView('group')} className={tabClass(view === 'group')}>
          Fase de grupos
        </button>
        <button onClick={() => setView('knockout')} className={tabClass(view === 'knockout')}>
          Eliminación directa
        </button>
      </div>

      {view === 'group' ? (
        <div className="space-y-8">
          {GROUP_LETTERS.map((letter) => (
            <div key={letter}>
              <h2 className="mb-2 text-lg font-bold text-slate-800">Grupo {letter}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupedByGroup.get(letter)?.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    homeTeam={teamsById.get(m.home_team_id ?? -1) ?? null}
                    awayTeam={teamsById.get(m.away_team_id ?? -1) ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {KNOCKOUT_PHASES.map((phase) => (
            <div key={phase}>
              <h2 className="mb-2 text-lg font-bold text-slate-800">{PHASE_LABELS[phase]}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupedByPhase.get(phase)?.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    homeTeam={teamsById.get(m.home_team_id ?? -1) ?? null}
                    awayTeam={teamsById.get(m.away_team_id ?? -1) ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

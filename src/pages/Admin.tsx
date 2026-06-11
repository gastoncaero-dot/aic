import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { useFixtureData } from '../hooks/useFixtureData'
import { db } from '../lib/firebase'
import AdminMatchEditor from '../components/AdminMatchEditor'
import { fromArgentinaDateTimeLocal, toDateTimeLocal } from '../lib/format'
import { PREDICTION_LOCK_MINUTES } from '../lib/scoring'
import { seedMatches, seedTeams } from '../data/seedData'
import { PHASE_LABELS, type AppSettings, type Match, type MatchPhase } from '../types'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const KNOCKOUT_PHASES: MatchPhase[] = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

function tabClass(active: boolean) {
  return `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-primary text-white' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
  }`
}

export default function Admin() {
  const { matches, teams, loading, error, reload } = useFixtureData()
  const [view, setView] = useState<'group' | 'knockout' | 'settings'>('knockout')
  const [lockAt, setLockAt] = useState('')
  const [championId, setChampionId] = useState('')
  const [runnerUpId, setRunnerUpId] = useState('')
  const [topScorer, setTopScorer] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)

  const effectiveView = !loading && teams.length === 0 ? 'settings' : view

  useEffect(() => {
    let cancelled = false
    getDoc(doc(db, 'appSettings', 'main')).then((snap) => {
      if (cancelled) return
      if (snap.exists()) {
        const s = snap.data() as AppSettings
        setLockAt(toDateTimeLocal(s.special_predictions_lock_at))
        setChampionId(s.champion_team_id?.toString() ?? '')
        setRunnerUpId(s.runner_up_team_id?.toString() ?? '')
        setTopScorer(s.top_scorer ?? '')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSaveMatch(matchId: number, updates: Partial<Match>) {
    const data: Partial<Match> = { ...updates }
    if (updates.kickoff_at) {
      data.lock_at = new Date(new Date(updates.kickoff_at).getTime() - PREDICTION_LOCK_MINUTES * 60 * 1000).toISOString()
    }
    await updateDoc(doc(db, 'matches', matchId.toString()), data)
    await reload()
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsMsg(null)
    try {
      await setDoc(doc(db, 'appSettings', 'main'), {
        special_predictions_lock_at: fromArgentinaDateTimeLocal(lockAt),
        champion_team_id: championId ? Number(championId) : null,
        runner_up_team_id: runnerUpId ? Number(runnerUpId) : null,
        top_scorer: topScorer.trim() || null,
      })
      setSettingsMsg('✓ Configuración guardada')
    } catch (err) {
      setSettingsMsg(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleSeed() {
    if (
      !window.confirm(
        'Esto carga los 48 equipos y los 104 partidos del fixture inicial. Si ya hay datos cargados, se van a sobrescribir. ¿Continuar?'
      )
    ) {
      return
    }
    setSeeding(true)
    setSeedMsg(null)
    try {
      const batch = writeBatch(db)
      for (const team of seedTeams) batch.set(doc(db, 'teams', team.id.toString()), team)
      for (const match of seedMatches) batch.set(doc(db, 'matches', match.id.toString()), match)
      batch.set(
        doc(db, 'appSettings', 'main'),
        {
          special_predictions_lock_at: '2026-06-11T13:00:00.000Z',
          champion_team_id: null,
          runner_up_team_id: null,
          top_scorer: null,
        },
        { merge: true }
      )
      await batch.commit()
      setSeedMsg('✓ Datos iniciales cargados')
      await reload()
    } catch (err) {
      setSeedMsg(err instanceof Error ? err.message : 'Error al cargar los datos iniciales')
    } finally {
      setSeeding(false)
    }
  }

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

  if (loading) return <div className="py-20 text-center text-slate-500">Cargando...</div>
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cargá resultados y completá el cuadro de eliminación directa a medida que avanza el Mundial.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView('knockout')} className={tabClass(view === 'knockout')}>
          Eliminación directa
        </button>
        <button onClick={() => setView('group')} className={tabClass(view === 'group')}>
          Fase de grupos
        </button>
        <button onClick={() => setView('settings')} className={tabClass(view === 'settings')}>
          Configuración
        </button>
      </div>

      {effectiveView === 'settings' && (
        <div className="space-y-4">
          {teams.length === 0 && (
            <div className="max-w-lg space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-900">Datos iniciales</h2>
              <p className="text-sm text-amber-800">
                Todavía no hay equipos ni partidos cargados. Hacé click para cargar los 48 equipos y los 104
                partidos del fixture inicial.
              </p>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {seeding ? 'Cargando...' : 'Cargar datos iniciales'}
              </button>
              {seedMsg && <p className="text-sm text-amber-800">{seedMsg}</p>}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-800">Pronósticos especiales</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cierre de pronósticos especiales</label>
              <input
                type="datetime-local"
                value={lockAt}
                onChange={(e) => setLockAt(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">Hora de Argentina</p>
            </div>

            <h2 className="pt-2 font-semibold text-slate-800">Resultados finales del torneo</h2>
            <p className="text-xs text-slate-500">
              Completá esto cuando termine el Mundial para liquidar los puntos especiales.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">🏆 Campeón</label>
              <select
                value={championId}
                onChange={(e) => setChampionId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Sin definir</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.flag} {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">🥈 Subcampeón</label>
              <select
                value={runnerUpId}
                onChange={(e) => setRunnerUpId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Sin definir</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.flag} {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">👟 Goleador / Balón de Oro</label>
              <input
                type="text"
                value={topScorer}
                onChange={(e) => setTopScorer(e.target.value)}
                placeholder="Nombre y apellido del jugador"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                Debe coincidir (sin importar mayúsculas) con lo que escribieron los jugadores.
              </p>
            </div>

            {settingsMsg && <p className="text-sm text-slate-600">{settingsMsg}</p>}

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {savingSettings ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </form>
        </div>
      )}

      {effectiveView === 'group' && (
        <div className="space-y-8">
          {GROUP_LETTERS.map((letter) => (
            <div key={letter}>
              <h2 className="mb-2 text-lg font-bold text-slate-800">Grupo {letter}</h2>
              <div className="space-y-2">
                {groupedByGroup.get(letter)?.map((m) => (
                  <AdminMatchEditor key={m.id} match={m} teams={teams} onSave={handleSaveMatch} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {effectiveView === 'knockout' && (
        <div className="space-y-8">
          {KNOCKOUT_PHASES.map((phase) => (
            <div key={phase}>
              <h2 className="mb-2 text-lg font-bold text-slate-800">{PHASE_LABELS[phase]}</h2>
              <div className="space-y-2">
                {groupedByPhase.get(phase)?.map((m) => (
                  <AdminMatchEditor key={m.id} match={m} teams={teams} onSave={handleSaveMatch} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

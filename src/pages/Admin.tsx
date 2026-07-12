import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { useFixtureData } from '../hooks/useFixtureData'
import { db } from '../lib/firebase'
import AdminMatchEditor from '../components/AdminMatchEditor'
import { fromArgentinaDateTimeLocal, toDateTimeLocal } from '../lib/format'
import { PREDICTION_LOCK_MINUTES } from '../lib/scoring'
import { seedMatches, seedTeams } from '../data/seedData'
import { PHASE_LABELS, type AppSettings, type League, type Match, type MatchPhase } from '../types'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const KNOCKOUT_PHASES: MatchPhase[] = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

function tabClass(active: boolean) {
  return active ? 'tab-active' : 'tab-inactive'
}

export default function Admin() {
  const { matches, teams, loading, error, reload } = useFixtureData()
  const [view, setView] = useState<'group' | 'knockout' | 'settings' | 'leagues'>('knockout')
  const [lockAt, setLockAt] = useState('')
  const [bestPlayerLockAt, setBestPlayerLockAt] = useState('')
  const [championId, setChampionId] = useState('')
  const [runnerUpId, setRunnerUpId] = useState('')
  const [topScorer, setTopScorer] = useState('')
  const [bestPlayer, setBestPlayer] = useState('')
  const [lockMinutes, setLockMinutes] = useState(PREDICTION_LOCK_MINUTES.toString())
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)
  const [updatingTimes, setUpdatingTimes] = useState(false)
  const [updateTimesMsg, setUpdateTimesMsg] = useState<string | null>(null)
  const [savingLockMinutes, setSavingLockMinutes] = useState(false)
  const [lockMinutesMsg, setLockMinutesMsg] = useState<string | null>(null)
  const [recalculatingLocks, setRecalculatingLocks] = useState(false)
  const [recalculateLocksMsg, setRecalculateLocksMsg] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map())
  const [leaguesLoading, setLeaguesLoading] = useState(false)
  const [leaguesLoaded, setLeaguesLoaded] = useState(false)
  const [adjustments, setAdjustments] = useState<Map<string, Record<string, string>>>(new Map())
  const [savingLeagueId, setSavingLeagueId] = useState<string | null>(null)
  const [leagueMsg, setLeagueMsg] = useState<Record<string, string>>({})

  const effectiveView = !loading && teams.length === 0 ? 'settings' : view

  useEffect(() => {
    let cancelled = false
    getDoc(doc(db, 'appSettings', 'main')).then((snap) => {
      if (cancelled) return
      if (snap.exists()) {
        const s = snap.data() as AppSettings
        setLockAt(toDateTimeLocal(s.special_predictions_lock_at))
        setBestPlayerLockAt(s.best_player_lock_at ? toDateTimeLocal(s.best_player_lock_at) : '')
        setChampionId(s.champion_team_id?.toString() ?? '')
        setRunnerUpId(s.runner_up_team_id?.toString() ?? '')
        setTopScorer(s.top_scorer ?? '')
        setBestPlayer(s.best_player ?? '')
        setLockMinutes((s.prediction_lock_minutes ?? PREDICTION_LOCK_MINUTES).toString())
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (view !== 'leagues' || leaguesLoaded) return
    let cancelled = false

    async function loadLeagues() {
      setLeaguesLoading(true)
      const leaguesSnap = await getDocs(collection(db, 'leagues'))
      const allLeagues = leaguesSnap.docs.map((d) => ({ ...(d.data() as League), id: d.id }))
      if (cancelled) return

      const memberIds = [...new Set(allLeagues.flatMap((l) => l.member_ids ?? []))]
      const idChunks = chunk(memberIds, 30)
      const profileSnaps = await Promise.all(
        idChunks.map((ids) => getDocs(query(collection(db, 'users'), where(documentId(), 'in', ids))))
      )
      if (cancelled) return

      const names = new Map<string, string>()
      for (const snap of profileSnaps) {
        for (const d of snap.docs) names.set(d.id, (d.data().username as string | undefined) ?? d.id)
      }

      const initialAdjustments = new Map<string, Record<string, string>>()
      for (const l of allLeagues) {
        const entries: Record<string, string> = {}
        for (const uid of l.member_ids ?? []) entries[uid] = (l.point_adjustments?.[uid] ?? 0).toString()
        initialAdjustments.set(l.id, entries)
      }

      setLeagues(allLeagues)
      setUsernames(names)
      setAdjustments(initialAdjustments)
      setLeaguesLoading(false)
      setLeaguesLoaded(true)
    }

    loadLeagues()
    return () => {
      cancelled = true
    }
  }, [view, leaguesLoaded])

  function handleAdjustmentChange(leagueId: string, uid: string, value: string) {
    setAdjustments((prev) => {
      const next = new Map(prev)
      next.set(leagueId, { ...next.get(leagueId), [uid]: value })
      return next
    })
  }

  async function handleSaveAdjustments(leagueId: string) {
    const entries = adjustments.get(leagueId) ?? {}
    const pointAdjustments: Record<string, number> = {}
    for (const [uid, value] of Object.entries(entries)) {
      const n = Number(value)
      if (!Number.isFinite(n)) {
        setLeagueMsg((prev) => ({ ...prev, [leagueId]: 'Hay un valor inválido.' }))
        return
      }
      if (n !== 0) pointAdjustments[uid] = n
    }

    setSavingLeagueId(leagueId)
    setLeagueMsg((prev) => ({ ...prev, [leagueId]: '' }))
    try {
      await updateDoc(doc(db, 'leagues', leagueId), { point_adjustments: pointAdjustments })
      setLeagues((prev) => prev.map((l) => (l.id === leagueId ? { ...l, point_adjustments: pointAdjustments } : l)))
      setLeagueMsg((prev) => ({ ...prev, [leagueId]: '✓ Ajustes guardados' }))
    } catch (err) {
      setLeagueMsg((prev) => ({ ...prev, [leagueId]: err instanceof Error ? err.message : 'Error al guardar' }))
    } finally {
      setSavingLeagueId(null)
    }
  }

  async function handleRemoveMember(leagueId: string, uid: string) {
    const league = leagues.find((l) => l.id === leagueId)
    if (!league) return
    if (!window.confirm(`¿Sacar a ${usernames.get(uid) ?? uid} de la liga "${league.name}"?`)) return

    const memberIds = (league.member_ids ?? []).filter((id) => id !== uid)
    const pointAdjustments = { ...league.point_adjustments }
    delete pointAdjustments[uid]

    setSavingLeagueId(leagueId)
    setLeagueMsg((prev) => ({ ...prev, [leagueId]: '' }))
    try {
      await updateDoc(doc(db, 'leagues', leagueId), { member_ids: memberIds, point_adjustments: pointAdjustments })
      setLeagues((prev) =>
        prev.map((l) => (l.id === leagueId ? { ...l, member_ids: memberIds, point_adjustments: pointAdjustments } : l))
      )
      setAdjustments((prev) => {
        const next = new Map(prev)
        const entries = { ...next.get(leagueId) }
        delete entries[uid]
        next.set(leagueId, entries)
        return next
      })
      setLeagueMsg((prev) => ({ ...prev, [leagueId]: '✓ Jugador eliminado de la liga' }))
    } catch (err) {
      setLeagueMsg((prev) => ({ ...prev, [leagueId]: err instanceof Error ? err.message : 'Error al eliminar' }))
    } finally {
      setSavingLeagueId(null)
    }
  }

  async function handleSaveMatch(matchId: number, updates: Partial<Match>) {
    const data: Partial<Match> = { ...updates }
    if (updates.kickoff_at) {
      const minutes = Number(lockMinutes) || PREDICTION_LOCK_MINUTES
      data.lock_at = new Date(new Date(updates.kickoff_at).getTime() - minutes * 60 * 1000).toISOString()
    }
    await updateDoc(doc(db, 'matches', matchId.toString()), data)
    await reload()
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsMsg(null)
    try {
      await setDoc(
        doc(db, 'appSettings', 'main'),
        {
          special_predictions_lock_at: fromArgentinaDateTimeLocal(lockAt),
          best_player_lock_at: bestPlayerLockAt ? fromArgentinaDateTimeLocal(bestPlayerLockAt) : null,
          champion_team_id: championId ? Number(championId) : null,
          runner_up_team_id: runnerUpId ? Number(runnerUpId) : null,
          top_scorer: topScorer.trim() || null,
          best_player: bestPlayer.trim() || null,
        },
        { merge: true }
      )
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
          special_predictions_lock_at: seedMatches[0].kickoff_at,
          champion_team_id: null,
          runner_up_team_id: null,
          top_scorer: null,
          best_player: null,
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

  async function handleUpdateKickoffTimes() {
    if (
      !window.confirm(
        'Esto actualiza la fecha y hora de los 104 partidos según el fixture (hora de Argentina), sin tocar resultados ni equipos ya cargados. ¿Continuar?'
      )
    ) {
      return
    }
    setUpdatingTimes(true)
    setUpdateTimesMsg(null)
    try {
      const batch = writeBatch(db)
      for (const match of seedMatches) {
        batch.update(doc(db, 'matches', match.id.toString()), {
          kickoff_at: match.kickoff_at,
          lock_at: match.lock_at,
        })
      }
      await batch.commit()
      setUpdateTimesMsg('✓ Horarios actualizados')
      await reload()
    } catch (err) {
      setUpdateTimesMsg(err instanceof Error ? err.message : 'Error al actualizar los horarios')
    } finally {
      setUpdatingTimes(false)
    }
  }

  async function handleSaveLockMinutes() {
    const minutes = Number(lockMinutes)
    if (!Number.isFinite(minutes) || minutes < 0) {
      setLockMinutesMsg('Ingresá un número de minutos válido.')
      return
    }
    setSavingLockMinutes(true)
    setLockMinutesMsg(null)
    try {
      await setDoc(doc(db, 'appSettings', 'main'), { prediction_lock_minutes: minutes }, { merge: true })
      setLockMinutesMsg('✓ Guardado. Usá "Recalcular cierres" para aplicarlo a los partidos ya cargados.')
    } catch (err) {
      setLockMinutesMsg(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingLockMinutes(false)
    }
  }

  async function handleRecalculateLocks() {
    const minutes = Number(lockMinutes)
    if (!Number.isFinite(minutes) || minutes < 0) {
      setRecalculateLocksMsg('Ingresá un número de minutos válido.')
      return
    }
    if (
      !window.confirm(
        `Esto recalcula el cierre de pronósticos de los ${matches.length} partidos a ${minutes} minutos antes de cada kickoff. ¿Continuar?`
      )
    ) {
      return
    }
    setRecalculatingLocks(true)
    setRecalculateLocksMsg(null)
    try {
      const batch = writeBatch(db)
      for (const match of matches) {
        const lockAt = new Date(new Date(match.kickoff_at).getTime() - minutes * 60 * 1000).toISOString()
        batch.update(doc(db, 'matches', match.id.toString()), { lock_at: lockAt })
      }
      await batch.commit()
      setRecalculateLocksMsg('✓ Cierres de pronósticos recalculados')
      await reload()
    } catch (err) {
      setRecalculateLocksMsg(err instanceof Error ? err.message : 'Error al recalcular')
    } finally {
      setRecalculatingLocks(false)
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
        <button onClick={() => setView('leagues')} className={tabClass(view === 'leagues')}>
          Ligas
        </button>
      </div>

      {effectiveView === 'settings' && (
        <div className="space-y-4">
          {teams.length === 0 && (
            <div className="max-w-lg space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h2 className="font-semibold text-amber-900">Datos iniciales</h2>
              <p className="text-sm text-amber-800">
                Todavía no hay equipos ni partidos cargados. Hacé click para cargar los 48 equipos y los 104
                partidos del fixture inicial.
              </p>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-50"
              >
                {seeding ? 'Cargando...' : 'Cargar datos iniciales'}
              </button>
              {seedMsg && <p className="text-sm text-amber-800">{seedMsg}</p>}
            </div>
          )}

          <div className="card max-w-lg space-y-3 p-5">
            <h2 className="font-semibold text-slate-800">Horarios del fixture</h2>
            <p className="text-sm text-slate-500">
              Actualiza la fecha y hora de los 104 partidos según el fixture (hora de Argentina), sin
              modificar resultados, equipos ni el cuadro de eliminación directa ya cargados.
            </p>
            <button
              onClick={handleUpdateKickoffTimes}
              disabled={updatingTimes}
              className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-emerald-50 hover:shadow-md disabled:opacity-50"
            >
              {updatingTimes ? 'Actualizando...' : 'Actualizar horarios'}
            </button>
            {updateTimesMsg && <p className="text-sm text-slate-600">{updateTimesMsg}</p>}
          </div>

          <div className="card max-w-lg space-y-3 p-5">
            <h2 className="font-semibold text-slate-800">Cierre de pronósticos</h2>
            <p className="text-sm text-slate-500">
              Minutos antes del horario de cada partido en que se cierra la carga/edición de pronósticos.
            </p>
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Minutos antes del kickoff</label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={lockMinutes}
                  onChange={(e) => setLockMinutes(e.target.value)}
                  className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <button
                onClick={handleSaveLockMinutes}
                disabled={savingLockMinutes}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-50"
              >
                {savingLockMinutes ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={handleRecalculateLocks}
                disabled={recalculatingLocks}
                className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-emerald-50 hover:shadow-md disabled:opacity-50"
              >
                {recalculatingLocks ? 'Recalculando...' : 'Recalcular cierres'}
              </button>
            </div>
            {lockMinutesMsg && <p className="text-sm text-slate-600">{lockMinutesMsg}</p>}
            {recalculateLocksMsg && <p className="text-sm text-slate-600">{recalculateLocksMsg}</p>}
          </div>

          <form onSubmit={handleSaveSettings} className="card max-w-lg space-y-4 p-5">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cierre de "Mejor jugador del torneo"</label>
              <input
                type="datetime-local"
                value={bestPlayerLockAt}
                onChange={(e) => setBestPlayerLockAt(e.target.value)}
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">🌟 Mejor jugador del torneo</label>
              <input
                type="text"
                value={bestPlayer}
                onChange={(e) => setBestPlayer(e.target.value)}
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
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-50"
            >
              {savingSettings ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </form>
        </div>
      )}

      {effectiveView === 'leagues' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Sumá o restá puntos manualmente a los jugadores de cada liga (ej: penalizaciones, bonus), o
            eliminalos de la liga con el botón "Eliminar".
          </p>
          {leaguesLoading && <p className="text-sm text-slate-500">Cargando ligas...</p>}
          {!leaguesLoading && leagues.length === 0 && <p className="text-sm text-slate-500">No hay ligas creadas.</p>}
          {leagues.map((league) => (
            <div key={league.id} className="card max-w-lg space-y-3 p-5">
              <h2 className="font-semibold text-slate-800">
                {league.name} <span className="font-mono text-xs text-slate-400">({league.code})</span>
              </h2>
              <div className="space-y-2">
                {(league.member_ids ?? []).map((uid) => (
                  <div key={uid} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-700">{usernames.get(uid) ?? uid}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={adjustments.get(league.id)?.[uid] ?? '0'}
                        onChange={(e) => handleAdjustmentChange(league.id, uid, e.target.value)}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                      />
                      <button
                        onClick={() => handleRemoveMember(league.id, uid)}
                        disabled={savingLeagueId === league.id}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                        title="Sacar de la liga"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleSaveAdjustments(league.id)}
                disabled={savingLeagueId === league.id}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-50"
              >
                {savingLeagueId === league.id ? 'Guardando...' : 'Guardar ajustes'}
              </button>
              {leagueMsg[league.id] && <p className="text-sm text-slate-600">{leagueMsg[league.id]}</p>}
            </div>
          ))}
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

import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { useFixtureData } from '../hooks/useFixtureData'
import { useAuth } from '../context/auth-context'
import { db } from '../lib/firebase'
import MatchRow from '../components/MatchRow'
import { PHASE_LABELS, type Match, type MatchPhase, type Prediction } from '../types'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const KNOCKOUT_PHASES: MatchPhase[] = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

function tabClass(active: boolean) {
  return active ? 'tab-active' : 'tab-inactive'
}

export default function Predictions() {
  const { user } = useAuth()
  const { matches, teamsById, loading, error } = useFixtureData()
  const [predictions, setPredictions] = useState<Map<number, Prediction>>(new Map())
  const [predLoading, setPredLoading] = useState(true)
  const [view, setView] = useState<'group' | 'knockout'>('group')

  useEffect(() => {
    if (!user) return
    const uid = user.uid
    let cancelled = false
    getDocs(query(collection(db, 'predictions'), where('user_id', '==', uid))).then((snap) => {
      if (cancelled) return
      const map = new Map<number, Prediction>()
      for (const d of snap.docs) {
        const p = d.data() as Prediction
        map.set(p.match_id, p)
      }
      setPredictions(map)
      setPredLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleSave(matchId: number, home: number, away: number) {
    if (!user) return
    const data: Prediction = {
      user_id: user.uid,
      match_id: matchId,
      home_score: home,
      away_score: away,
      updated_at: new Date().toISOString(),
    }
    await setDoc(doc(db, 'predictions', `${user.uid}_${matchId}`), data)
    setPredictions((prev) => {
      const next = new Map(prev)
      next.set(matchId, data)
      return next
    })
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

  const total = matches.length
  const loaded = predictions.size

  if (loading || predLoading) return <div className="py-20 text-center text-slate-500">Cargando...</div>
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis pronósticos</h1>
        <p className="mt-1 text-sm text-slate-500">
          {loaded} / {total} partidos pronosticados. Se cierran 60 minutos antes de cada partido.
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${total ? (loaded / total) * 100 : 0}%` }}
          />
        </div>
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
                    prediction={predictions.get(m.id)}
                    onSave={handleSave}
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
                    prediction={predictions.get(m.id)}
                    onSave={handleSave}
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

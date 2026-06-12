import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, documentId, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useAuth } from '../context/auth-context'
import { useFixtureData } from '../hooks/useFixtureData'
import { db } from '../lib/firebase'
import { formatTime } from '../lib/format'
import {
  calculateMatchPoints,
  isMatchFinished,
  POINTS_CHAMPION,
  POINTS_RESULT,
  POINTS_RUNNER_UP,
  POINTS_TOP_SCORER,
} from '../lib/scoring'
import type { AppSettings, League, Prediction, SpecialPrediction, UserTotals } from '../types'

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { matches, loading: matchesLoading, reload: reloadMatches } = useFixtureData()
  const [league, setLeague] = useState<League | null>(null)
  const [rows, setRows] = useState<UserTotals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!id || matchesLoading) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const leagueSnap = await getDoc(doc(db, 'leagues', id as string))

      if (!leagueSnap.exists()) {
        if (!cancelled) {
          setError('No se encontró la liga')
          setLoading(false)
        }
        return
      }

      const leagueData = { ...(leagueSnap.data() as League), id: leagueSnap.id }
      const memberIds = leagueData.member_ids ?? []
      const idChunks = chunk(memberIds, 30)

      const [profileSnaps, predictionSnaps, specialSnaps, settingsSnap] = await Promise.all([
        Promise.all(
          idChunks.map((ids) => getDocs(query(collection(db, 'users'), where(documentId(), 'in', ids))))
        ),
        Promise.all(
          idChunks.map((ids) => getDocs(query(collection(db, 'predictions'), where('user_id', 'in', ids))))
        ),
        Promise.all(
          idChunks.map((ids) => getDocs(query(collection(db, 'specialPredictions'), where(documentId(), 'in', ids))))
        ),
        getDoc(doc(db, 'appSettings', 'main')),
      ])

      if (cancelled) return

      const usernames = new Map<string, string>()
      for (const snap of profileSnaps) {
        for (const d of snap.docs) usernames.set(d.id, (d.data().username as string | undefined) ?? d.id)
      }

      const predictionsByUser = new Map<string, Prediction[]>()
      for (const snap of predictionSnaps) {
        for (const d of snap.docs) {
          const p = d.data() as Prediction
          const list = predictionsByUser.get(p.user_id) ?? []
          list.push(p)
          predictionsByUser.set(p.user_id, list)
        }
      }

      const specialByUser = new Map<string, SpecialPrediction>()
      for (const snap of specialSnaps) {
        for (const d of snap.docs) specialByUser.set(d.id, d.data() as SpecialPrediction)
      }

      const settings = settingsSnap.exists() ? (settingsSnap.data() as AppSettings) : null
      const matchesById = new Map(matches.map((m) => [m.id, m]))

      const totals: UserTotals[] = memberIds.map((uid) => {
        const preds = predictionsByUser.get(uid) ?? []
        let matchPoints = 0
        let exactCount = 0
        let hitCount = 0
        for (const p of preds) {
          const m = matchesById.get(p.match_id)
          if (!m || !isMatchFinished(m)) continue
          const points = calculateMatchPoints(p.home_score, p.away_score, m.home_score, m.away_score)
          if (points === null) continue
          matchPoints += points
          if (points >= POINTS_RESULT) hitCount++
          if (points > POINTS_RESULT) exactCount++
        }

        const special = specialByUser.get(uid)
        let specialPoints = 0
        let championHit = false
        if (settings && special) {
          if (settings.champion_team_id != null && special.champion_team_id === settings.champion_team_id) {
            specialPoints += POINTS_CHAMPION
            championHit = true
          }
          if (settings.runner_up_team_id != null && special.runner_up_team_id === settings.runner_up_team_id) {
            specialPoints += POINTS_RUNNER_UP
          }
          if (
            settings.top_scorer &&
            special.top_scorer &&
            settings.top_scorer.trim().toLowerCase() === special.top_scorer.trim().toLowerCase()
          ) {
            specialPoints += POINTS_TOP_SCORER
          }
        }

        const adjustmentPoints = leagueData.point_adjustments?.[uid] ?? 0

        return {
          user_id: uid,
          username: usernames.get(uid) ?? uid,
          match_points: matchPoints,
          exact_count: exactCount,
          hit_count: hitCount,
          special_points: specialPoints,
          champion_hit: championHit,
          adjustment_points: adjustmentPoints,
          total_points: matchPoints + specialPoints + adjustmentPoints,
        }
      })

      totals.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points
        if (b.exact_count !== a.exact_count) return b.exact_count - a.exact_count
        if (b.hit_count !== a.hit_count) return b.hit_count - a.hit_count
        return Number(b.champion_hit) - Number(a.champion_hit)
      })

      setLeague(leagueData)
      setRows(totals)
      setError(null)
      setLoading(false)
      setLastUpdated(new Date())
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, matches, matchesLoading])

  function handleCopy() {
    if (!league) return
    navigator.clipboard.writeText(league.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleRefresh() {
    reloadMatches()
  }

  if (loading && !league) return <div className="py-20 text-center text-slate-500">Cargando...</div>
  if (error || !league)
    return (
      <div className="py-20 text-center text-slate-500">
        <p>{error ?? 'Liga no encontrada'}</p>
        <Link to="/dashboard" className="mt-2 inline-block text-primary">
          Volver a mis ligas
        </Link>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/dashboard" className="text-sm text-primary">
            ← Mis ligas
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{league.name}</h1>
          <button
            onClick={handleCopy}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-700 hover:bg-slate-200"
          >
            Código de invitación: <strong>{league.code}</strong>
            <span className="text-xs text-primary">{copied ? '¡Copiado!' : 'copiar'}</span>
          </button>
        </div>
        <div className="text-right">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-full border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition-all hover:bg-emerald-50 hover:shadow-md disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : '🔄 Actualizar ranking'}
          </button>
          {lastUpdated && (
            <p className="mt-1 text-xs text-slate-400">Actualizado a las {formatTime(lastUpdated.toISOString())}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3">#</th>
              <th className="px-2 py-2 sm:px-4 sm:py-3">Jugador</th>
              <th className="px-2 py-2 text-center sm:px-4 sm:py-3">
                <span className="sm:hidden">Ex.</span>
                <span className="hidden sm:inline">Exactos</span>
              </th>
              <th className="px-2 py-2 text-center sm:px-4 sm:py-3">
                <span className="sm:hidden">Ac.</span>
                <span className="hidden sm:inline">Aciertos</span>
              </th>
              <th className="px-2 py-2 text-center sm:px-4 sm:py-3">
                <span className="sm:hidden">Esp.</span>
                <span className="hidden sm:inline">Especiales</span>
              </th>
              <th className="px-2 py-2 text-right sm:px-4 sm:py-3">
                <span className="sm:hidden">Pts</span>
                <span className="hidden sm:inline">Puntos</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.user_id}
                className={`border-t border-slate-100 ${row.user_id === user?.uid ? 'bg-emerald-50' : ''}`}
              >
                <td className="px-2 py-2 font-semibold text-slate-500 sm:px-4 sm:py-3">{i + 1}</td>
                <td className="px-2 py-2 font-medium text-slate-800 sm:px-4 sm:py-3">
                  {row.username}
                  {row.user_id === user?.uid && <span className="ml-1 text-xs text-primary">(vos)</span>}
                  {row.champion_hit && <span className="ml-1" title="Acertó al campeón">🏆</span>}
                  {row.adjustment_points !== 0 && (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        row.adjustment_points > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                      title="Ajuste manual del administrador"
                    >
                      {row.adjustment_points > 0 ? '+' : ''}
                      {row.adjustment_points}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-center text-slate-600 sm:px-4 sm:py-3">{row.exact_count}</td>
                <td className="px-2 py-2 text-center text-slate-600 sm:px-4 sm:py-3">{row.hit_count}</td>
                <td className="px-2 py-2 text-center text-slate-600 sm:px-4 sm:py-3">{row.special_points}</td>
                <td className="px-2 py-2 text-right text-base font-bold text-primary-dark sm:px-4 sm:py-3 sm:text-lg">
                  {row.total_points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Desempate: 1) más resultados exactos, 2) más aciertos totales, 3) acertar al campeón.
      </p>
    </div>
  )
}

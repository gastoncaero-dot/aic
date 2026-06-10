import { useEffect, useState, type FormEvent } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/auth-context'
import { useFixtureData } from '../hooks/useFixtureData'
import { db } from '../lib/firebase'
import { isLockExpired, POINTS_CHAMPION, POINTS_RUNNER_UP, POINTS_TOP_SCORER } from '../lib/scoring'
import { formatDay, formatTime } from '../lib/format'
import type { AppSettings, SpecialPrediction } from '../types'

export default function SpecialPredictions() {
  const { user } = useAuth()
  const { teams, loading: teamsLoading } = useFixtureData()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [championId, setChampionId] = useState<string>('')
  const [runnerUpId, setRunnerUpId] = useState<string>('')
  const [topScorer, setTopScorer] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    const uid = user.uid
    let cancelled = false
    Promise.all([getDoc(doc(db, 'appSettings', 'main')), getDoc(doc(db, 'specialPredictions', uid))]).then(
      ([settingsSnap, predSnap]) => {
        if (cancelled) return
        setSettings(settingsSnap.exists() ? (settingsSnap.data() as AppSettings) : null)
        if (predSnap.exists()) {
          const pred = predSnap.data() as SpecialPrediction
          setChampionId(pred.champion_team_id?.toString() ?? '')
          setRunnerUpId(pred.runner_up_team_id?.toString() ?? '')
          setTopScorer(pred.top_scorer ?? '')
        }
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [user])

  const locked = settings ? isLockExpired(settings.special_predictions_lock_at) : false

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage(null)

    try {
      await setDoc(doc(db, 'specialPredictions', user.uid), {
        user_id: user.uid,
        champion_team_id: championId ? Number(championId) : null,
        runner_up_team_id: runnerUpId ? Number(runnerUpId) : null,
        top_scorer: topScorer.trim() || null,
        updated_at: new Date().toISOString(),
      })
      setMessage({ type: 'success', text: '¡Pronósticos especiales guardados!' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || teamsLoading) return <div className="py-20 text-center text-slate-500">Cargando...</div>

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pronósticos especiales</h1>
        <p className="mt-1 text-sm text-slate-500">Tus apuestas grandes para todo el torneo.</p>
      </div>

      {settings && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${locked ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
          {locked
            ? '🔒 Los pronósticos especiales ya están cerrados.'
            : `Se cierran el ${formatDay(settings.special_predictions_lock_at)} a las ${formatTime(settings.special_predictions_lock_at)} hs.`}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
            <span>🏆 Campeón del Mundial</span>
            <span className="text-xs font-normal text-slate-400">{POINTS_CHAMPION} pts</span>
          </label>
          <select
            value={championId}
            disabled={locked}
            onChange={(e) => setChampionId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
          >
            <option value="">Elegí una selección...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag} {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
            <span>🥈 Subcampeón (finalista perdedor)</span>
            <span className="text-xs font-normal text-slate-400">{POINTS_RUNNER_UP} pts</span>
          </label>
          <select
            value={runnerUpId}
            disabled={locked}
            onChange={(e) => setRunnerUpId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
          >
            <option value="">Elegí una selección...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag} {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
            <span>👟 Goleador / Balón de Oro</span>
            <span className="text-xs font-normal text-slate-400">{POINTS_TOP_SCORER} pts</span>
          </label>
          <input
            type="text"
            value={topScorer}
            disabled={locked}
            onChange={(e) => setTopScorer(e.target.value)}
            placeholder="Nombre y apellido del jugador"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || locked}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar pronósticos especiales'}
        </button>
      </form>
    </div>
  )
}

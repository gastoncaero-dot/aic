import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/auth-context'
import { useAppSettings } from '../hooks/useAppSettings'
import { db } from '../lib/firebase'
import Countdown from '../components/Countdown'
import { POINTS_EXACT, POINTS_RESULT, PREDICTION_LOCK_MINUTES } from '../lib/scoring'
import type { Match } from '../types'

const FALLBACK_KICKOFF = '2026-06-11T13:00:00.000Z'

export default function Landing() {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const lockMinutes = settings?.prediction_lock_minutes ?? PREDICTION_LOCK_MINUTES
  const [kickoff, setKickoff] = useState(FALLBACK_KICKOFF)

  useEffect(() => {
    let cancelled = false
    getDoc(doc(db, 'matches', '1')).then((snap) => {
      if (cancelled) return
      const data = snap.data() as Match | undefined
      if (data?.kickoff_at) setKickoff(data.kickoff_at)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />

        <div className="relative">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-200">
            México · Estados Unidos · Canadá
          </p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Armá tu Prode del Mundial 2026 ⚽</h1>
          <p className="mt-3 max-w-xl text-emerald-50">
            Pronosticá los 104 partidos, elegí tu campeón y competí en una liga privada con tus
            amigos, familia o laburo.
          </p>

          <div className="mt-6 grid max-w-xs gap-3">
            <Countdown target={kickoff} label="Arranca el Mundial en" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <>
                <Link
                  to="/predictions"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-dark shadow-sm transition-all hover:bg-emerald-50 hover:shadow-md"
                >
                  Cargar mis pronósticos
                </Link>
                <Link
                  to="/dashboard"
                  className="rounded-full border border-white/60 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Mis ligas
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-dark shadow-sm transition-all hover:bg-emerald-50 hover:shadow-md"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-white/60 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Ya tengo cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4 text-center transition-shadow hover:shadow-md">
          <p className="text-3xl font-bold text-primary-dark">48</p>
          <p className="text-sm text-slate-500">selecciones en 12 grupos</p>
        </div>
        <div className="card p-4 text-center transition-shadow hover:shadow-md">
          <p className="text-3xl font-bold text-primary-dark">104</p>
          <p className="text-sm text-slate-500">partidos para pronosticar</p>
        </div>
        <div className="card p-4 text-center transition-shadow hover:shadow-md">
          <p className="text-3xl font-bold text-primary-dark">∞</p>
          <p className="text-sm text-slate-500">ligas con amigos</p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900">¿Cómo se juega?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow-sm">
              1
            </span>
            <p className="text-sm text-slate-600">
              Cargá el resultado que creés para cada partido. Podés cambiarlo hasta {lockMinutes} minutos
              antes de que arranque.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow-sm">
              2
            </span>
            <p className="text-sm text-slate-600">
              Elegí tu campeón, subcampeón y goleador del torneo antes del partido inaugural.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow-sm">
              3
            </span>
            <p className="text-sm text-slate-600">
              Creá una liga privada y compartí el código con tus amigos, o sumate con el código de
              alguien más.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow-sm">
              4
            </span>
            <p className="text-sm text-slate-600">
              Sumás <strong>{POINTS_EXACT} puntos</strong> por resultado exacto y{' '}
              <strong>{POINTS_RESULT} puntos</strong> por acertar el ganador o el empate.
            </p>
          </div>
        </div>
        <Link to="/reglas" className="mt-4 inline-block text-sm font-semibold text-primary">
          Ver el reglamento completo →
        </Link>
      </section>
    </div>
  )
}

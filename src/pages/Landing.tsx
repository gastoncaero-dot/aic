import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabase'
import Countdown from '../components/Countdown'
import { POINTS_EXACT, POINTS_RESULT } from '../lib/scoring'

const FALLBACK_KICKOFF = '2026-06-11T13:00:00.000Z'

export default function Landing() {
  const { user } = useAuth()
  const [kickoff, setKickoff] = useState(FALLBACK_KICKOFF)

  useEffect(() => {
    supabase
      .from('matches')
      .select('kickoff_at')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.kickoff_at) setKickoff(data.kickoff_at)
      })
  }, [])

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-8 text-white">
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
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-primary-dark hover:bg-emerald-50"
              >
                Cargar mis pronósticos
              </Link>
              <Link
                to="/dashboard"
                className="rounded-md border border-white/60 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Mis ligas
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/signup"
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-primary-dark hover:bg-emerald-50"
              >
                Crear cuenta gratis
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-white/60 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-primary-dark">48</p>
          <p className="text-sm text-slate-500">selecciones en 12 grupos</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-primary-dark">104</p>
          <p className="text-sm text-slate-500">partidos para pronosticar</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-primary-dark">∞</p>
          <p className="text-sm text-slate-500">ligas con amigos</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900">¿Cómo se juega?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              1
            </span>
            <p className="text-sm text-slate-600">
              Cargá el resultado que creés para cada partido. Podés cambiarlo hasta 60 minutos antes
              de que arranque.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              2
            </span>
            <p className="text-sm text-slate-600">
              Elegí tu campeón, subcampeón y goleador del torneo antes del partido inaugural.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              3
            </span>
            <p className="text-sm text-slate-600">
              Creá una liga privada y compartí el código con tus amigos, o sumate con el código de
              alguien más.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
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

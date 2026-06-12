import { useState } from 'react'
import { useAppSettings } from '../hooks/useAppSettings'
import {
  POINTS_CHAMPION,
  POINTS_EXACT,
  POINTS_RESULT,
  POINTS_RUNNER_UP,
  POINTS_TOP_SCORER,
  PREDICTION_LOCK_MINUTES,
} from '../lib/scoring'

const PAYMENT_ALIAS = 'prodeprimos'

export default function Rules() {
  const [copied, setCopied] = useState(false)
  const { settings } = useAppSettings()
  const lockMinutes = settings?.prediction_lock_minutes ?? PREDICTION_LOCK_MINUTES

  function handleCopy() {
    navigator.clipboard.writeText(PAYMENT_ALIAS)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reglas del Prode</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistema de puntos simple y transparente, igual para todas las ligas.
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">⚽ Puntaje por partido</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
            <span>Resultado exacto (acertás el marcador justo, ej: predijiste 2-1 y terminó 2-1)</span>
            <span className="ml-3 shrink-0 font-bold text-emerald-700">{POINTS_EXACT} pts</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
            <span>Acertás el resultado (ganador o empate) pero no el marcador exacto</span>
            <span className="ml-3 shrink-0 font-bold text-amber-700">{POINTS_RESULT} pts</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span>No acertás ni el resultado ni el marcador</span>
            <span className="ml-3 shrink-0 font-bold text-slate-500">0 pts</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          En partidos de eliminación directa solo cuenta el resultado de los 90 minutos: si terminó
          empatado y se definió por penales, tu pronóstico se evalúa igual con el resultado del
          tiempo regular.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🌟 Pronósticos especiales</h2>
        <p className="mb-3 text-sm text-slate-600">
          Antes de que arranque el Mundial, además elegís tres pronósticos "macro" que suman puntos extra
          al final del torneo:
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
            <span>🏆 Campeón del Mundial</span>
            <span className="ml-3 shrink-0 font-bold text-emerald-700">{POINTS_CHAMPION} pts</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
            <span>🥈 Subcampeón (finalista perdedor)</span>
            <span className="ml-3 shrink-0 font-bold text-amber-700">{POINTS_RUNNER_UP} pts</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
            <span>👟 Goleador / Balón de Oro del torneo</span>
            <span className="ml-3 shrink-0 font-bold text-sky-700">{POINTS_TOP_SCORER} pts</span>
          </li>
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">⏱️ Plazos para pronosticar</h2>
        <p className="text-sm text-slate-700">
          Podés cargar o cambiar tu pronóstico de cada partido hasta{' '}
          <strong>{lockMinutes} minutos antes</strong> de que arranque. Pasado ese momento
          el pronóstico queda bloqueado y se hace visible para el resto de tu liga.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Los pronósticos especiales (campeón, subcampeón y goleador) se cierran cuando arranca el
          partido inaugural del Mundial.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🤝 Desempates</h2>
        <p className="mb-2 text-sm text-slate-600">
          Si dos o más participantes terminan con el mismo puntaje en una liga, se desempata en este
          orden:
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Mayor cantidad de resultados exactos</li>
          <li>Mayor cantidad de aciertos totales (exactos + resultados correctos)</li>
          <li>Haber acertado al campeón del Mundial</li>
        </ol>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">💰 Aporte para el pozo</h2>
        <p className="mb-3 text-sm text-slate-600">
          Para sumarte al pozo en juego, transferí tu aporte al siguiente alias:
        </p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-700 hover:bg-slate-200"
        >
          Alias: <strong>{PAYMENT_ALIAS}</strong>
          <span className="text-xs text-primary">{copied ? '¡Copiado!' : 'copiar'}</span>
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Coordiná el monto y la modalidad de pago con el organizador de tu liga.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">👥 Cómo jugar con amigos</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Creá una cuenta.</li>
          <li>
            Cargá tus pronósticos para todos los partidos en <strong>"Mis pronósticos"</strong> y tus
            apuestas especiales en <strong>"Pronósticos especiales"</strong>.
          </li>
          <li>
            Creá una liga privada desde <strong>"Mis ligas"</strong> y compartí el código con tus
            amigos, o sumate a la liga de alguien con su código.
          </li>
          <li>Seguí la tabla de posiciones de tu liga a medida que se juegan los partidos.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Tu pronóstico es el mismo para todas las ligas en las que participás: lo cargás una sola vez
          y compite en cada liga a la que te sumes.
        </p>
      </section>
    </div>
  )
}

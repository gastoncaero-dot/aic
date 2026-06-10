import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabase'
import type { League, UserTotals } from '../types'

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [league, setLeague] = useState<League | null>(null)
  const [rows, setRows] = useState<UserTotals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (leagueError || !leagueData) {
        if (!cancelled) {
          setError(leagueError?.message ?? 'No se encontró la liga')
          setLoading(false)
        }
        return
      }

      const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', id)
      const userIds = (members ?? []).map((m) => m.user_id)

      const { data: totals } = await supabase
        .from('user_totals')
        .select('*')
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
        .order('total_points', { ascending: false })
        .order('exact_count', { ascending: false })
        .order('hit_count', { ascending: false })
        .order('champion_hit', { ascending: false })

      if (!cancelled) {
        setLeague(leagueData as League)
        setRows((totals as UserTotals[]) ?? [])
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  function handleCopy() {
    if (!league) return
    navigator.clipboard.writeText(league.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) return <div className="py-20 text-center text-slate-500">Cargando...</div>
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-4 py-3 text-center">Exactos</th>
              <th className="px-4 py-3 text-center">Aciertos</th>
              <th className="px-4 py-3 text-center">Especiales</th>
              <th className="px-4 py-3 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.user_id}
                className={`border-t border-slate-100 ${row.user_id === user?.id ? 'bg-emerald-50' : ''}`}
              >
                <td className="px-4 py-3 font-semibold text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {row.username}
                  {row.user_id === user?.id && <span className="ml-1 text-xs text-primary">(vos)</span>}
                  {row.champion_hit && <span className="ml-1" title="Acertó al campeón">🏆</span>}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{row.exact_count}</td>
                <td className="px-4 py-3 text-center text-slate-600">{row.hit_count}</td>
                <td className="px-4 py-3 text-center text-slate-600">{row.special_points}</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-primary-dark">{row.total_points}</td>
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

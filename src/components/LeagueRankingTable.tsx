import type { UserTotals } from '../types'

interface Props {
  rows: UserTotals[]
  currentUserId?: string
}

export default function LeagueRankingTable({ rows, currentUserId }: Props) {
  return (
    <>
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
                className={`border-t border-slate-100 ${row.user_id === currentUserId ? 'bg-emerald-50' : ''}`}
              >
                <td className="px-2 py-2 font-semibold text-slate-500 sm:px-4 sm:py-3">{i + 1}</td>
                <td className="px-2 py-2 font-medium text-slate-800 sm:px-4 sm:py-3">
                  {row.username}
                  {row.user_id === currentUserId && <span className="ml-1 text-xs text-primary">(vos)</span>}
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
    </>
  )
}

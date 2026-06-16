import { useMemo, useState } from 'react'
import { formatDay, getArgentinaToday, toDateTimeLocal } from '../lib/format'
import type { Match } from '../types'

// Partidos antes de las 6am se muestran en el día anterior (ej: 1am del 17 aparece bajo el 16).
const EARLY_MORNING_CUTOFF = 6

function prevDay(dateKey: string): string {
  const [y, mo, d] = dateKey.split('-').map(Number)
  const prev = new Date(Date.UTC(y, mo - 1, d))
  prev.setUTCDate(prev.getUTCDate() - 1)
  return prev.toISOString().slice(0, 10)
}

export function useMatchesByDate(matches: Match[]) {
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of matches) {
      const dt = toDateTimeLocal(m.kickoff_at)
      const hour = parseInt(dt.slice(11, 13), 10)
      const key = hour < EARLY_MORNING_CUTOFF ? prevDay(dt.slice(0, 10)) : dt.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(m)
    }
    for (const list of map.values()) list.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [matches])

  const today = getArgentinaToday()

  const defaultKey = useMemo(() => {
    const upcoming = groupedByDate.find(([key]) => key >= today)
    return (upcoming ?? groupedByDate[groupedByDate.length - 1])?.[0] ?? null
  }, [groupedByDate, today])

  const [selected, setSelected] = useState<string | null>(null)
  const activeKey = selected ?? defaultKey
  const activeMatches = groupedByDate.find(([key]) => key === activeKey)?.[1] ?? []
  // El título se deriva de la key del grupo, no del kickoff, para que el partido
  // de la 1am del día siguiente siga mostrando el título del día anterior.
  const title = activeKey ? formatDay(activeKey + 'T12:00:00-03:00') : ''

  return { groupedByDate, today, activeKey, activeMatches, title, setSelected }
}

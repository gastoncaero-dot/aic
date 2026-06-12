import { useMemo, useState } from 'react'
import { formatDay, getArgentinaToday, toDateTimeLocal } from '../lib/format'
import type { Match } from '../types'

export function useMatchesByDate(matches: Match[]) {
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of matches) {
      const key = toDateTimeLocal(m.kickoff_at).slice(0, 10)
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
  const title = activeMatches[0] ? formatDay(activeMatches[0].kickoff_at) : ''

  return { groupedByDate, today, activeKey, activeMatches, title, setSelected }
}

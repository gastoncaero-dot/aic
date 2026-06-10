import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Match, Team } from '../types'

export function useFixtureData() {
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadIndex, setReloadIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [teamsSnap, matchesSnap] = await Promise.all([
          getDocs(query(collection(db, 'teams'), orderBy('id'))),
          getDocs(query(collection(db, 'matches'), orderBy('id'))),
        ])
        if (cancelled) return
        setTeams(teamsSnap.docs.map((d) => d.data() as Team))
        setMatches(matchesSnap.docs.map((d) => d.data() as Match))
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadIndex])

  const reload = useCallback(() => setReloadIndex((i) => i + 1), [])

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  return { teams, matches, teamsById, loading, error, reload }
}

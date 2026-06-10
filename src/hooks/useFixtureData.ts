import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
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
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('teams').select('*').order('id'),
        supabase.from('matches').select('*').order('id'),
      ])
      if (cancelled) return
      setError(teamsRes.error?.message ?? matchesRes.error?.message ?? null)
      setTeams((teamsRes.data as Team[]) ?? [])
      setMatches((matchesRes.data as Match[]) ?? [])
      setLoading(false)
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

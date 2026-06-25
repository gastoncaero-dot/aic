import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Match, Team } from '../types'

// Usa listeners en tiempo real en vez de volver a leer las colecciones
// enteras a intervalos: Firestore solo cobra lectura por los documentos que
// cambian, así que esto refleja los resultados en vivo (que el workflow de
// GitHub Actions actualiza en segundo plano) sin repetir la lectura completa
// cada minuto y sin agotar la cuota gratis.
export function useFixtureData() {
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [teamsLoaded, setTeamsLoaded] = useState(false)
  const [matchesLoaded, setMatchesLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onError = (err: Error) => setError(err.message)

    const unsubTeams = onSnapshot(
      query(collection(db, 'teams'), orderBy('id')),
      (snap) => {
        setTeams(snap.docs.map((d) => d.data() as Team))
        setTeamsLoaded(true)
        setError(null)
      },
      onError
    )
    const unsubMatches = onSnapshot(
      query(collection(db, 'matches'), orderBy('id')),
      (snap) => {
        setMatches(snap.docs.map((d) => d.data() as Match))
        setMatchesLoaded(true)
        setError(null)
      },
      onError
    )

    return () => {
      unsubTeams()
      unsubMatches()
    }
  }, [])

  // Los listeners mantienen los datos al día solos; se conserva por
  // compatibilidad con quienes esperan poder forzar un refresco.
  const reload = useCallback(async () => {}, [])

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  return { teams, matches, teamsById, loading: !teamsLoaded || !matchesLoaded, error, reload }
}

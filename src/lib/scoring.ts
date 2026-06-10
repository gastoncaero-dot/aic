// Sistema de puntos del Prode Mundial 2026.
// Mantené esto sincronizado con las vistas SQL de supabase/schema.sql.
export const POINTS_EXACT = 5
export const POINTS_RESULT = 2
export const POINTS_CHAMPION = 20
export const POINTS_RUNNER_UP = 10
export const POINTS_TOP_SCORER = 10
export const PREDICTION_LOCK_MINUTES = 60

/** Devuelve true si ya no se puede cargar/editar el pronóstico de un partido. */
export function isPredictionLocked(kickoffAt: string): boolean {
  const lockTime = new Date(kickoffAt).getTime() - PREDICTION_LOCK_MINUTES * 60 * 1000
  return Date.now() >= lockTime
}

/** Devuelve true si ya pasó la fecha/hora límite indicada. */
export function isLockExpired(lockAt: string): boolean {
  return Date.now() >= new Date(lockAt).getTime()
}

/** Calcula los puntos de un pronóstico una vez finalizado el partido. */
export function calculateMatchPoints(
  predHome: number,
  predAway: number,
  actualHome: number | null,
  actualAway: number | null
): number | null {
  if (actualHome === null || actualAway === null) return null
  if (predHome === actualHome && predAway === actualAway) return POINTS_EXACT
  const predSign = Math.sign(predHome - predAway)
  const actualSign = Math.sign(actualHome - actualAway)
  if (predSign === actualSign) return POINTS_RESULT
  return 0
}

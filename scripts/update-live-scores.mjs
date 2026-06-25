// Actualiza automáticamente el resultado de los partidos del Mundial 2026
// que están "en vivo" consultando la API de football-data.org y escribiendo
// en Firestore. Pensado para correr cada pocos minutos desde un workflow de
// GitHub Actions (gratis, sin necesidad del plan Blaze de Firebase).
//
// Variables de entorno requeridas:
//   FIREBASE_SERVICE_ACCOUNT  JSON completo de una cuenta de servicio de
//                             Firebase (Project Settings > Service accounts
//                             > Generate new private key).
//   FOOTBALL_DATA_API_KEY     API key de https://www.football-data.org/
//                             (plan gratis: incluye el Mundial, 10 requests/min).
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { isSameTeam } from './team-name-aliases.mjs'

const WORLD_CUP_COMPETITION_CODE = 'WC'

// Duración estimada de un partido (90' + entretiempo + adicionales) durante
// la cual lo consideramos "en vivo" y vale la pena consultar la API.
const MATCH_LIVE_MINUTES = 125

// Estados de la API (football-data.org) que indican que el partido terminó.
const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED'])

// Estados que indican que el partido está jugándose en este momento (para
// mostrar el minuto en vivo en el frontend).
const IN_PLAY_STATUSES = new Set(['IN_PLAY', 'PAUSED'])

function getEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

const serviceAccount = JSON.parse(getEnv('FIREBASE_SERVICE_ACCOUNT'))
const footballDataApiKey = getEnv('FOOTBALL_DATA_API_KEY')

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

/** Partidos cuyo horario de arranque cae dentro de la ventana "en vivo" y todavía no están finalizados. */
async function findLiveMatches() {
  const now = Date.now()
  const snap = await db.collection('matches').where('status', '==', 'scheduled').get()
  return snap.docs
    .map((d) => ({ id: d.id, data: d.data() }))
    .filter(({ data }) => {
      const start = new Date(data.kickoff_at).getTime()
      return now >= start && now < start + MATCH_LIVE_MINUTES * 60 * 1000
    })
}

/** Trae todos los partidos del Mundial entre las fechas dadas (inclusive), en formato YYYY-MM-DD. */
async function fetchFixturesBetween(dateFromIso, dateToIso) {
  const url = `https://api.football-data.org/v4/competitions/${WORLD_CUP_COMPETITION_CODE}/matches?dateFrom=${dateFromIso}&dateTo=${dateToIso}`
  const res = await fetch(url, { headers: { 'X-Auth-Token': footballDataApiKey } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`football-data.org respondió ${res.status} para ${dateFromIso}..${dateToIso}: ${body}`)
  }
  const json = await res.json()
  console.log(`football-data.org devolvió ${json.count ?? json.matches?.length ?? 0} partidos para ${dateFromIso}..${dateToIso}`)
  return json.matches ?? []
}

async function main() {
  const liveMatches = await findLiveMatches()
  if (liveMatches.length === 0) {
    console.log('No hay partidos en vivo, no se consulta la API.')
    return
  }

  const teamIds = new Set()
  for (const { data } of liveMatches) {
    if (data.home_team_id != null) teamIds.add(data.home_team_id)
    if (data.away_team_id != null) teamIds.add(data.away_team_id)
  }
  const teamSnaps = await Promise.all([...teamIds].map((id) => db.collection('teams').doc(id.toString()).get()))
  const teamNameById = new Map()
  for (const snap of teamSnaps) {
    if (snap.exists) teamNameById.set(snap.data().id, snap.data().name)
  }

  // Una sola consulta a la API que cubra el rango de fechas (UTC) involucrado.
  const dates = liveMatches.map(({ data }) => data.kickoff_at.slice(0, 10)).sort()
  const dateFrom = dates[0]
  const dateTo = dates[dates.length - 1]
  const fixtures = await fetchFixturesBetween(dateFrom, dateTo)

  let updated = 0
  for (const { id, data } of liveMatches) {
    const homeName = data.home_team_id != null ? teamNameById.get(data.home_team_id) : undefined
    const awayName = data.away_team_id != null ? teamNameById.get(data.away_team_id) : undefined
    if (!homeName || !awayName) continue

    const date = data.kickoff_at.slice(0, 10)
    const fixture = fixtures.find(
      (f) =>
        f.utcDate.slice(0, 10) === date &&
        isSameTeam(homeName, f.homeTeam.name) &&
        isSameTeam(awayName, f.awayTeam.name)
    )
    if (!fixture) {
      console.warn(`Partido #${id} (${homeName} vs ${awayName}, ${date}) no matchea ningún equipo de la API`)
      continue
    }

    const { home: homeScore, away: awayScore } = fixture.score.fullTime
    if (homeScore === null || awayScore === null) continue

    const isFinished = FINISHED_STATUSES.has(fixture.status)
    const minute = IN_PLAY_STATUSES.has(fixture.status) ? fixture.minute ?? null : null
    const scoreChanged = data.home_score !== homeScore || data.away_score !== awayScore
    const statusChanged = isFinished && data.status !== 'finished'
    const minuteChanged = data.minute !== minute
    if (!scoreChanged && !statusChanged && !minuteChanged) continue

    const updates = { home_score: homeScore, away_score: awayScore, minute }
    if (isFinished) updates.status = 'finished'
    await db.collection('matches').doc(id).update(updates)
    updated++
    console.log(
      `Partido #${id} (${homeName} vs ${awayName}) actualizado: ${homeScore}-${awayScore}${
        isFinished ? ' (finalizado)' : minute != null ? ` (min ${minute}')` : ''
      }`
    )
  }

  console.log(`Listo. Partidos en vivo: ${liveMatches.length}, actualizados: ${updated}.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

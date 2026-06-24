// Actualiza automáticamente el resultado de los partidos del Mundial 2026
// que están "en vivo" consultando la API de API-Football y escribiendo en
// Firestore. Pensado para correr cada pocos minutos desde un workflow de
// GitHub Actions (gratis, sin necesidad del plan Blaze de Firebase).
//
// Variables de entorno requeridas:
//   FIREBASE_SERVICE_ACCOUNT  JSON completo de una cuenta de servicio de
//                             Firebase (Project Settings > Service accounts
//                             > Generate new private key).
//   API_FOOTBALL_KEY          API key de https://www.api-football.com/
//                             (plan gratis: 100 requests/día).
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { isSameTeam } from './team-name-aliases.mjs'

const WORLD_CUP_LEAGUE_ID = 1
const WORLD_CUP_SEASON = 2026

// Duración estimada de un partido (90' + entretiempo + adicionales) durante
// la cual lo consideramos "en vivo" y vale la pena consultar la API.
const MATCH_LIVE_MINUTES = 125

// Estados de la API que indican que el partido terminó.
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO'])

function getEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

const serviceAccount = JSON.parse(getEnv('FIREBASE_SERVICE_ACCOUNT'))
const apiFootballKey = getEnv('API_FOOTBALL_KEY')

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

async function fetchFixturesForDate(dateIso) {
  const url = `https://v3.football.api-sports.io/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}&date=${dateIso}`
  const res = await fetch(url, { headers: { 'x-apisports-key': apiFootballKey } })
  if (!res.ok) {
    throw new Error(`API-Football respondió ${res.status} para la fecha ${dateIso}`)
  }
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.warn(`API-Football devolvió errores para ${dateIso}:`, JSON.stringify(json.errors))
  }
  console.log(`API-Football results=${json.results} paging=${JSON.stringify(json.paging)} para ${dateIso}`)
  return json.response ?? []
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

  // Una sola consulta a la API por cada fecha (UTC) involucrada.
  const dates = new Set(liveMatches.map(({ data }) => data.kickoff_at.slice(0, 10)))
  const fixturesByDate = new Map()
  for (const date of dates) {
    const fixtures = await fetchFixturesForDate(date)
    fixturesByDate.set(date, fixtures)
    console.log(`API-Football devolvió ${fixtures.length} partidos para ${date}`)
  }

  let updated = 0
  for (const { id, data } of liveMatches) {
    const homeName = data.home_team_id != null ? teamNameById.get(data.home_team_id) : undefined
    const awayName = data.away_team_id != null ? teamNameById.get(data.away_team_id) : undefined
    if (!homeName || !awayName) continue

    const date = data.kickoff_at.slice(0, 10)
    const fixtures = fixturesByDate.get(date) ?? []
    const fixture = fixtures.find(
      (f) => isSameTeam(homeName, f.teams.home.name) && isSameTeam(awayName, f.teams.away.name)
    )
    if (!fixture) {
      console.warn(`Partido #${id} (${homeName} vs ${awayName}, ${date}) no matchea ningún equipo de la API`)
      continue
    }

    const { home: homeScore, away: awayScore } = fixture.goals
    if (homeScore === null || awayScore === null) continue

    const isFinished = FINISHED_STATUSES.has(fixture.fixture.status.short)
    const scoreChanged = data.home_score !== homeScore || data.away_score !== awayScore
    const statusChanged = isFinished && data.status !== 'finished'
    if (!scoreChanged && !statusChanged) continue

    const updates = { home_score: homeScore, away_score: awayScore }
    if (isFinished) updates.status = 'finished'
    await db.collection('matches').doc(id).update(updates)
    updated++
    console.log(`Partido #${id} (${homeName} vs ${awayName}) actualizado: ${homeScore}-${awayScore}${isFinished ? ' (finalizado)' : ''}`)
  }

  console.log(`Listo. Partidos en vivo: ${liveMatches.length}, actualizados: ${updated}.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

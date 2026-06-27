// Asigna los equipos definidos de la fase de eliminación directa a los
// partidos correspondientes en Firestore (cuando ya se sabe quién juega
// cada llave, pero el partido fue creado con placeholders como "Por definir").
//
// Variables de entorno requeridas:
//   FIREBASE_SERVICE_ACCOUNT  JSON completo de una cuenta de servicio de Firebase.
//   BRACKET_ASSIGNMENTS       JSON: [{ "id": 73, "home_team_id": 17, "away_team_id": 14 }, ...]
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

const serviceAccount = JSON.parse(getEnv('FIREBASE_SERVICE_ACCOUNT'))
const assignments = JSON.parse(getEnv('BRACKET_ASSIGNMENTS'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

for (const a of assignments) {
  await db.doc(`matches/${a.id}`).update({
    home_team_id: a.home_team_id,
    away_team_id: a.away_team_id,
    home_placeholder: null,
    away_placeholder: null,
  })
  console.log(`Partido ${a.id} actualizado: ${a.home_team_id} vs ${a.away_team_id}`)
}

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const fields = JSON.parse(process.env.APP_SETTINGS_FIELDS)
await db.doc('appSettings/main').update(fields)
console.log('appSettings/main updated:', fields)

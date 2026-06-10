import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBhCtbVQbq97VscOwjeMQcidfJVjfZhGNo',
  authDomain: 'prodeprimos-7fb43.firebaseapp.com',
  projectId: 'prodeprimos-7fb43',
  storageBucket: 'prodeprimos-7fb43.firebasestorage.app',
  messagingSenderId: '719959417233',
  appId: '1:719959417233:web:f2e10d9c9488863460ba30',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

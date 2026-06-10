import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { Profile } from '../types'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(uid: string) {
    const snap = await getDoc(doc(db, 'users', uid))
    setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        loadProfile(firebaseUser.uid).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  async function refreshProfile() {
    if (user) await loadProfile(user.uid)
  }

  return <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>{children}</AuthContext.Provider>
}

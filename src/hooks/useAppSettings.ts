import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { AppSettings } from '../types'

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getDoc(doc(db, 'appSettings', 'main')).then((snap) => {
      if (cancelled) return
      setSettings(snap.exists() ? (snap.data() as AppSettings) : null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loading }
}

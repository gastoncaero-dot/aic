import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { arrayUnion, collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { useAuth } from '../context/auth-context'
import { db } from '../lib/firebase'
import type { League } from '../types'

interface LeagueWithCount extends League {
  member_count: number
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leagues, setLeagues] = useState<LeagueWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadIndex, setReloadIndex] = useState(0)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const uid = user.uid
    let cancelled = false

    async function load() {
      setLoading(true)
      const snap = await getDocs(query(collection(db, 'leagues'), where('member_ids', 'array-contains', uid)))
      if (cancelled) return
      const leagueList = snap.docs.map((d) => {
        const data = d.data() as League
        return { ...data, id: d.id, member_count: data.member_ids?.length ?? 0 }
      })
      setLeagues(leagueList.sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, reloadIndex])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const name = newLeagueName.trim()
    if (!name || !user) return
    setCreating(true)
    try {
      let code = generateCode()
      let existing = await getDocs(query(collection(db, 'leagues'), where('code', '==', code)))
      while (!existing.empty) {
        code = generateCode()
        existing = await getDocs(query(collection(db, 'leagues'), where('code', '==', code)))
      }

      const ref = doc(collection(db, 'leagues'))
      await setDoc(ref, {
        name,
        code,
        owner_id: user.uid,
        member_ids: [user.uid],
        created_at: new Date().toISOString(),
      })

      setNewLeagueName('')
      setReloadIndex((i) => i + 1)
      navigate(`/leagues/${ref.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la liga')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const code = joinCode.trim().toUpperCase()
    if (!code || !user) return
    setJoining(true)
    try {
      const snap = await getDocs(query(collection(db, 'leagues'), where('code', '==', code)))
      if (snap.empty) {
        setError('El código de liga ingresado no existe')
        return
      }
      const leagueDoc = snap.docs[0]
      await updateDoc(leagueDoc.ref, { member_ids: arrayUnion(user.uid) })
      setJoinCode('')
      setReloadIndex((i) => i + 1)
      navigate(`/leagues/${leagueDoc.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sumarte a la liga')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis ligas</h1>
        <p className="mt-1 text-sm text-slate-500">Creá una liga privada o sumate con un código de invitación.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : leagues.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Todavía no participás de ninguna liga.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              to={`/leagues/${league.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-slate-900">{league.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {league.member_count} {league.member_count === 1 ? 'integrante' : 'integrantes'}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                Código: {league.code}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-800">Crear liga nueva</h2>
          <input
            type="text"
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            placeholder="Ej: Asado del trabajo"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear liga'}
          </button>
        </form>

        <form onSubmit={handleJoin} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-800">Sumarme a una liga</h2>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Código de invitación"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={joining}
            className="w-full rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-emerald-50 disabled:opacity-50"
          >
            {joining ? 'Sumándote...' : 'Sumarme'}
          </button>
        </form>
      </div>
    </div>
  )
}

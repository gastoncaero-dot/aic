import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'El email no es válido.',
  'auth/user-not-found': 'No existe una cuenta con ese email.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err) {
      const code = err instanceof Error && 'code' in err ? (err as { code: string }).code : ''
      setError(ERROR_MESSAGES[code] ?? 'No se pudo enviar el email. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
      <p className="mb-6 text-sm text-slate-500">Te mandamos un email para que la cambies.</p>

      <div className="card p-6">
        {sent ? (
          <p className="text-sm text-emerald-600">
            Listo, revisá tu email ({email}) y seguí el link para crear una contraseña nueva.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar email de recuperación'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-primary">
          Volver a ingresar
        </Link>
      </p>
    </div>
  )
}

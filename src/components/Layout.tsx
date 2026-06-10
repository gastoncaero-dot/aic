import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabase'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
  }`

export default function Layout() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    setOpen(false)
  }

  const links = (
    <>
      <NavLink to="/" end className={navLinkClass} onClick={() => setOpen(false)}>
        Inicio
      </NavLink>
      <NavLink to="/fixture" className={navLinkClass} onClick={() => setOpen(false)}>
        Fixture
      </NavLink>
      <NavLink to="/reglas" className={navLinkClass} onClick={() => setOpen(false)}>
        Reglas
      </NavLink>
      {user && (
        <>
          <NavLink to="/predictions" className={navLinkClass} onClick={() => setOpen(false)}>
            Mis pronósticos
          </NavLink>
          <NavLink to="/predictions/especiales" className={navLinkClass} onClick={() => setOpen(false)}>
            Pronósticos especiales
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass} onClick={() => setOpen(false)}>
            Mis ligas
          </NavLink>
        </>
      )}
      {profile?.is_admin && (
        <NavLink to="/admin" className={navLinkClass} onClick={() => setOpen(false)}>
          Admin
        </NavLink>
      )}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary-dark">
            <span aria-hidden>🏆</span>
            Prode Mundial 2026
          </Link>

          <nav className="hidden items-center gap-1 md:flex">{links}</nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <span className="text-sm text-slate-600">
                  Hola, <span className="font-semibold">{profile?.username ?? '...'}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Ingresar
                </Link>
                <Link
                  to="/signup"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          <button
            className="rounded-md border border-slate-300 p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <span aria-hidden>☰</span>
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {links}
              <div className="mt-2 border-t border-slate-200 pt-2">
                {user ? (
                  <>
                    <p className="px-3 pb-2 text-sm text-slate-600">
                      Hola, <span className="font-semibold">{profile?.username ?? '...'}</span>
                    </p>
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium"
                    >
                      Ingresar
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-white"
                    >
                      Crear cuenta
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Prode Mundial 2026 · Armado para jugar entre amigos ⚽
      </footer>
    </div>
  )
}

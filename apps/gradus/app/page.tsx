import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import Link from "next/link"

export default async function HomePage() {
  const session = await getSession()

  if (session) {
    if (session.role === "COORDINATOR") redirect("/coordinator")
    else redirect("/student")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="mx-auto w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">Gradus</h1>
          <p className="text-slate-500">Sistema de Homologación Académica</p>
          <p className="mt-1 text-sm text-slate-400">
            Politécnico Internacional
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <p className="mb-6 text-sm text-slate-600">
            Inicia sesión con tu cuenta institucional para acceder al sistema.
          </p>
          <Link
            href="/api/auth/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Iniciar sesión con Microsoft
          </Link>
        </div>
      </div>
    </div>
  )
}

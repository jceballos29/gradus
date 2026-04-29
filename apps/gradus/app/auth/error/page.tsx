import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Error de autenticación
        </h1>
        <p className="text-slate-500 mb-6">
          No fue posible iniciar sesión. Por favor intenta de nuevo.
        </p>
        <Link
          href="/api/auth/login"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Intentar de nuevo
        </Link>
      </div>
    </div>
  );
}
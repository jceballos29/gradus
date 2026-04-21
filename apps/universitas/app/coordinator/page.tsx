import prisma from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Search } from "lucide-react"
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select"

const statusConfig = {
  ACTIVE: { label: "Activo", color: "bg-green-100 text-green-800" },
  WITHDRAWN: { label: "Retirado", color: "bg-slate-100 text-slate-600" },
  GRADUATED: { label: "Graduado", color: "bg-blue-100 text-blue-800" },
  SUSPENDED: { label: "Suspendido", color: "bg-red-100 text-red-800" },
}

export default async function CoordinatorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; program?: string }>
}) {
  const { q, program } = await searchParams

  const students = await prisma.student.findMany({
    include: {
      user: true,
      pensum: { include: { program: true } },
      academicRecords: { where: { status: "PASSED" } },
    },
    where: {
      AND: [
        program ? { pensum: { program: { code: program } } } : {},
        q
          ? {
              OR: [
                { user: { firstName: { contains: q, mode: "insensitive" } } },
                { user: { lastName: { contains: q, mode: "insensitive" } } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { studentCode: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { user: { lastName: "asc" } },
  })

  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Estudiantes</h1>
        <p className="mt-1 text-slate-500">
          {students.length} estudiantes encontrados
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <form className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, email o código..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {program && <input type="hidden" name="program" value={program} />}
        </form>

        <form>
          {q && <input type="hidden" name="q" value={q} />}
          <AutoSubmitSelect
            name="program"
            defaultValue={program ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos los programas</option>
            {programs.map((p) => (
              <option key={p.id} value={p.code}>
                {p.code} — {p.name.substring(0, 40)}
              </option>
            ))}
          </AutoSubmitSelect>
        </form>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Estudiante
                </th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Código
                </th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Programa
                </th>
                <th className="px-6 py-3 text-center font-medium text-slate-500">
                  Créditos
                </th>
                <th className="px-6 py-3 text-center font-medium text-slate-500">
                  Estado
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No se encontraron estudiantes.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const config = statusConfig[student.status]
                  const fullName =
                    `${student.user.firstName} ${student.user.lastName}`.trim() ||
                    student.user.email.split("@")[0]

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {fullName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {student.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {student.studentCode}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700">
                          {student.pensum.program.code}
                        </p>
                        <p className="text-xs text-slate-400">
                          Plan {student.pensum.code}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-slate-900">
                          {student.creditsEarned}
                        </span>
                        <span className="text-xs text-slate-400">
                          {" "}
                          / {student.pensum.totalCredits}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/coordinator/students/${student.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Ver perfil →
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const statusConfig = {
  PASSED: { label: "Aprobada", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Reprobada", color: "bg-red-100 text-red-800" },
  IN_PROGRESS: { label: "Cursando", color: "bg-blue-100 text-blue-800" },
  WITHDRAWN: { label: "Retirada", color: "bg-slate-100 text-slate-600" },
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      pensum: {
        include: {
          program: { include: { faculty: { include: { institution: true } } } },
        },
      },
      academicRecords: {
        include: {
          subject: true,
          partialGrades: { orderBy: { order: "asc" } },
        },
        orderBy: [{ term: "desc" }, { subject: { period: "asc" } }],
      },
    },
  })

  if (!student) notFound()

  const byTerm = student.academicRecords.reduce<
    Record<string, typeof student.academicRecords>
  >((acc, r) => {
    if (!acc[r.term]) acc[r.term] = []
    acc[r.term].push(r)
    return acc
  }, {})
  const terms = Object.keys(byTerm).sort((a, b) => b.localeCompare(a))
  const fullName =
    `${student.user.firstName} ${student.user.lastName}`.trim() ||
    student.user.email.split("@")[0]
  const progressPct = Math.round(
    (student.creditsEarned / student.pensum.totalCredits) * 100
  )

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/coordinator"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a estudiantes
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
          <p className="mt-1 text-slate-500">{student.user.email}</p>
        </div>
        <Link
          href={`/coordinator/grades?student=${student.id}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
        >
          Registrar notas
        </Link>
      </div>

      {/* Info cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: "Código", value: student.studentCode },
          { label: "Programa", value: student.pensum.program.code },
          { label: "Plan", value: student.pensum.code },
          { label: "Sede", value: student.campus },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-0.5 font-semibold text-slate-900">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-600">Avance en la carrera</span>
            <span className="text-sm font-semibold text-slate-900">
              {student.creditsEarned} / {student.pensum.totalCredits} créditos ·{" "}
              {progressPct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic history */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Historial académico
      </h2>

      {terms.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <p className="text-sm text-slate-400">Sin registros académicos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {terms.map((term) => {
            const records = byTerm[term]
            return (
              <Card key={term}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    {term}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-2 text-left font-medium text-slate-500">
                          Asignatura
                        </th>
                        <th className="py-2 text-center font-medium text-slate-500">
                          Créditos
                        </th>
                        <th className="py-2 text-center font-medium text-slate-500">
                          Nota final
                        </th>
                        <th className="py-2 text-right font-medium text-slate-500">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => {
                        const config = statusConfig[r.status]
                        return (
                          <tr key={r.id} className="border-b border-slate-50">
                            <td className="py-2.5 text-slate-900">
                              {r.subject.name}
                            </td>
                            <td className="py-2.5 text-center text-slate-600">
                              {r.subject.credits}
                            </td>
                            <td className="py-2.5 text-center font-mono text-slate-900">
                              {r.finalGrade != null
                                ? Number(r.finalGrade).toFixed(1)
                                : "—"}
                            </td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                              >
                                {config.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

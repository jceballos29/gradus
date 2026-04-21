import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import prisma from "@/lib/prisma"

const statusConfig = {
  PASSED: {
    label: "Aprobada",
    variant: "default" as const,
    color: "bg-green-100 text-green-800",
  },
  FAILED: {
    label: "Reprobada",
    variant: "destructive" as const,
    color: "bg-red-100 text-red-800",
  },
  IN_PROGRESS: {
    label: "Cursando",
    variant: "secondary" as const,
    color: "bg-blue-100 text-blue-800",
  },
  WITHDRAWN: {
    label: "Retirada",
    variant: "outline" as const,
    color: "bg-slate-100 text-slate-600",
  },
}

export default async function StudentHistoryPage() {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const student = await prisma.student.findFirst({
    where: { user: { identity: session.identity } },
    include: {
      pensum: { include: { program: true } },
      academicRecords: {
        include: { subject: true },
        orderBy: [{ term: "desc" }, { subject: { period: "asc" } }],
      },
    },
  })

  if (!student) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">No se encontró información académica.</p>
      </div>
    )
  }

  // Group by term
  const byTerm = student.academicRecords.reduce<
    Record<string, typeof student.academicRecords>
  >((acc, record) => {
    if (!acc[record.term]) acc[record.term] = []
    acc[record.term].push(record)
    return acc
  }, {})

  const terms = Object.keys(byTerm).sort((a, b) => b.localeCompare(a))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Historial académico
        </h1>
        <p className="mt-1 text-slate-500">
          {student.pensum.program.name} · Plan {student.pensum.code}
        </p>
      </div>

      {terms.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-slate-400">
              No hay registros académicos aún.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {terms.map((term) => {
            const records = byTerm[term]
            const termCredits = records
              .filter((r) => r.status === "PASSED")
              .reduce((sum, r) => sum + r.subject.credits, 0)

            return (
              <Card key={term}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      {term}
                    </CardTitle>
                    <span className="text-xs text-slate-500">
                      {termCredits} créditos aprobados
                    </span>
                  </div>
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
                          Nota
                        </th>
                        <th className="py-2 text-right font-medium text-slate-500">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => {
                        const config = statusConfig[record.status]
                        return (
                          <tr
                            key={record.id}
                            className="border-b border-slate-50"
                          >
                            <td className="py-3 text-slate-900">
                              {record.subject.name}
                            </td>
                            <td className="py-3 text-center text-slate-600">
                              {record.subject.credits}
                            </td>
                            <td className="py-3 text-center font-mono text-slate-900">
                              {record.finalGrade != null
                                ? Number(record.finalGrade).toFixed(1)
                                : "—"}
                            </td>
                            <td className="py-3 text-right">
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

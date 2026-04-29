import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import prisma from "@/lib/prisma"

export default async function ActiveTermPage() {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const activePeriod = await prisma.academicPeriod.findFirst({
    where: { active: true },
  })

  const student = await prisma.student.findFirst({
    where: { user: { identity: session.identity } },
    include: {
      academicRecords: {
        where: { term: activePeriod?.code ?? "" },
        include: {
          subject: true,
          partialGrades: { orderBy: { order: "asc" } },
        },
      },
    },
  })

  const records = student?.academicRecords ?? []

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Trimestre activo</h1>
        <p className="mt-1 text-slate-500">
          {activePeriod ? activePeriod.code : "Sin trimestre activo"}
        </p>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-slate-400">
              No hay asignaturas registradas en el trimestre activo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => {
            const partials = record.partialGrades
            const finalGrade = record.finalGrade
              ? Number(record.finalGrade)
              : null

            return (
              <Card key={record.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      {record.subject.name}
                    </CardTitle>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-bold text-slate-900">
                        {finalGrade != null ? finalGrade.toFixed(1) : "—"}
                      </span>
                      <p className="text-xs text-slate-500">
                        {record.subject.credits} créditos
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {partials.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Sin parciales registrados.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {partials.map((partial) => {
                        const grade = partial.grade
                          ? Number(partial.grade)
                          : null
                        const pct = Number(partial.percentage)
                        const contribution =
                          grade != null ? (grade * pct) / 100 : null

                        return (
                          <div key={partial.id}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm text-slate-600">
                                {partial.name}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400">
                                  {pct}%
                                </span>
                                <span className="w-8 text-right font-mono text-sm font-semibold text-slate-900">
                                  {grade != null ? grade.toFixed(1) : "—"}
                                </span>
                                <span className="w-12 text-right text-xs text-slate-400">
                                  {contribution != null
                                    ? `+${contribution.toFixed(2)}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                            <Progress
                              value={grade != null ? (grade / 5) * 100 : 0}
                              className="h-1.5"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

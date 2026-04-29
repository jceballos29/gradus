import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import prisma from "@/lib/prisma"

export default async function ProgressPage() {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const student = await prisma.student.findFirst({
    where: { user: { identity: session.identity } },
    include: {
      pensum: { include: { program: true } },
      academicRecords: { include: { subject: true } },
    },
  })

  if (!student) redirect("/student")

  const records = student.academicRecords
  const passed = records.filter((r) => r.status === "PASSED")
  const failed = records.filter((r) => r.status === "FAILED")
  const inProgress = records.filter((r) => r.status === "IN_PROGRESS")

  const creditsEarned = student.creditsEarned
  const totalCredits = student.pensum.totalCredits
  const progressPct =
    totalCredits > 0 ? Math.round((creditsEarned / totalCredits) * 100) : 0

  const stats = [
    {
      label: "Créditos aprobados",
      value: creditsEarned,
      total: totalCredits,
      color: "text-green-600",
    },
    {
      label: "Materias aprobadas",
      value: passed.length,
      color: "text-green-600",
    },
    {
      label: "Materias cursando",
      value: inProgress.length,
      color: "text-blue-600",
    },
    {
      label: "Materias reprobadas",
      value: failed.length,
      color: "text-red-600",
    },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Mi progreso</h1>
        <p className="mt-1 text-slate-500">
          {student.pensum.program.name} · Plan {student.pensum.code}
        </p>
      </div>

      {/* Progress bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-500">Avance en la carrera</p>
              <p className="mt-1 text-4xl font-bold text-slate-900">
                {progressPct}%
              </p>
            </div>
            <p className="mb-1 text-sm text-slate-500">
              {creditsEarned} / {totalCredits} créditos
            </p>
          </div>
          <Progress value={progressPct} className="h-3" />
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>
                {stat.value}
                {stat.total != null && (
                  <span className="text-lg font-normal text-slate-400">
                    {" "}
                    / {stat.total}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

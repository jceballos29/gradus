import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select"

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentId } = await searchParams

  const students = await prisma.student.findMany({
    include: { user: true, pensum: { include: { program: true } } },
    orderBy: { user: { lastName: "asc" } },
  })

  const activePeriod = await prisma.academicPeriod.findFirst({
    where: { active: true },
  })

  const selectedStudent = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: true,
          pensum: { include: { subjects: { orderBy: { period: "asc" } } } },
          academicRecords: {
            where: { term: activePeriod?.code ?? "" },
            include: {
              subject: true,
              partialGrades: { orderBy: { order: "asc" } },
            },
          },
        },
      })
    : null

  async function saveGrades(formData: FormData) {
    "use server"

    const studentId = formData.get("studentId") as string
    const subjectId = formData.get("subjectId") as string
    const term = formData.get("term") as string
    const g1 = parseFloat(formData.get("g1") as string)
    const g2 = parseFloat(formData.get("g2") as string)
    const g3 = parseFloat(formData.get("g3") as string)

    const finalGrade =
      Math.round((g1 * 0.15 + g2 * 0.35 + g3 * 0.5) * 100) / 100
    const status = finalGrade >= 3.0 ? "PASSED" : "FAILED"

    const existing = await prisma.academicRecord.findUnique({
      where: { studentId_subjectId_term: { studentId, subjectId, term } },
    })

    if (existing) {
      await prisma.academicRecord.update({
        where: { id: existing.id },
        data: {
          finalGrade,
          status,
          partialGrades: {
            updateMany: [
              { where: { order: 1 }, data: { grade: g1 } },
              { where: { order: 2 }, data: { grade: g2 } },
              { where: { order: 3 }, data: { grade: g3 } },
            ],
          },
        },
      })
    } else {
      await prisma.academicRecord.create({
        data: {
          studentId,
          subjectId,
          term,
          finalGrade,
          status,
          partialGrades: {
            create: [
              {
                order: 1,
                name: "NOTA PRIMER CORTE",
                percentage: 15,
                grade: g1,
              },
              {
                order: 2,
                name: "NOTA SEGUNDO CORTE",
                percentage: 35,
                grade: g2,
              },
              {
                order: 3,
                name: "NOTA TERCER CORTE",
                percentage: 50,
                grade: g3,
              },
            ],
          },
        },
      })
    }

    // Update credits earned if passed
    if (status === "PASSED") {
      const passedRecords = await prisma.academicRecord.findMany({
        where: { studentId, status: "PASSED" },
        include: { subject: true },
      })
      const creditsEarned = passedRecords.reduce(
        (sum, r) => sum + r.subject.credits,
        0
      )
      await prisma.student.update({
        where: { id: studentId },
        data: { creditsEarned },
      })
    }

    revalidatePath("/coordinator/grades")
    redirect(`/coordinator/grades?student=${studentId}`)
  }

  const fullName = selectedStudent
    ? `${selectedStudent.user.firstName} ${selectedStudent.user.lastName}`.trim() ||
      selectedStudent.user.email.split("@")[0]
    : null

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Registro de notas</h1>
        <p className="mt-1 text-slate-500">
          Período activo: {activePeriod?.code ?? "Sin período activo"}
        </p>
      </div>

      {/* Student selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Seleccionar estudiante
            </label>
            <AutoSubmitSelect
              name="student"
              defaultValue={studentId ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un estudiante...</option>
              {students.map((s) => {
                const name =
                  `${s.user.firstName} ${s.user.lastName}`.trim() ||
                  s.user.email.split("@")[0]
                return (
                  <option key={s.id} value={s.id}>
                    {name} — {s.pensum.program.code} ({s.studentCode})
                  </option>
                )
              })}
            </AutoSubmitSelect>
          </form>
        </CardContent>
      </Card>

      {selectedStudent && activePeriod && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {fullName} · {activePeriod.code}
          </h2>

          <div className="space-y-4">
            {selectedStudent.pensum.subjects
              .filter((s) => s.period <= 5)
              .map((subject) => {
                const record = selectedStudent.academicRecords.find(
                  (r) => r.subjectId === subject.id
                )
                const partials = record?.partialGrades ?? []
                const getGrade = (order: number) =>
                  partials.find((p) => p.order === order)?.grade?.toString() ??
                  ""

                return (
                  <Card key={subject.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-slate-800">
                          {subject.name}
                        </CardTitle>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">
                            {subject.credits} créditos · P{subject.period}
                          </span>
                          {record && (
                            <span
                              className={`font-mono text-xs font-bold ${record.status === "PASSED" ? "text-green-600" : record.status === "FAILED" ? "text-red-600" : "text-blue-600"}`}
                            >
                              {Number(record.finalGrade ?? 0).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form action={saveGrades}>
                        <input
                          type="hidden"
                          name="studentId"
                          value={selectedStudent.id}
                        />
                        <input
                          type="hidden"
                          name="subjectId"
                          value={subject.id}
                        />
                        <input
                          type="hidden"
                          name="term"
                          value={activePeriod.code}
                        />
                        <div className="flex items-center gap-4">
                          {[
                            {
                              name: "g1",
                              label: "Corte 1 (15%)",
                              defaultValue: getGrade(1),
                            },
                            {
                              name: "g2",
                              label: "Corte 2 (35%)",
                              defaultValue: getGrade(2),
                            },
                            {
                              name: "g3",
                              label: "Corte 3 (50%)",
                              defaultValue: getGrade(3),
                            },
                          ].map((field) => (
                            <div key={field.name} className="flex-1">
                              <label className="mb-1 block text-xs text-slate-500">
                                {field.label}
                              </label>
                              <input
                                type="number"
                                name={field.name}
                                min="0"
                                max="5"
                                step="0.1"
                                defaultValue={field.defaultValue}
                                placeholder="0.0"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          ))}
                          <button
                            type="submit"
                            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm whitespace-nowrap text-white transition-colors hover:bg-blue-700"
                          >
                            Guardar
                          </button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

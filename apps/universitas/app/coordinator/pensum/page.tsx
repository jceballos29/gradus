import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select"

const areaConfig = {
  BASIC: { label: "Formación Básica", color: "bg-blue-100 text-blue-800" },
  SPECIFIC: {
    label: "Formación Específica",
    color: "bg-emerald-100 text-emerald-800",
  },
  COMPLEMENTARY: {
    label: "Formación Complementaria",
    color: "bg-amber-100 text-amber-800",
  },
}

export default async function PensumPage({
  searchParams,
}: {
  searchParams: Promise<{ pensum?: string }>
}) {
  const { pensum: pensumId } = await searchParams

  const pensums = await prisma.pensum.findMany({
    include: { program: true },
    orderBy: { code: "asc" },
  })

  const selectedPensum = pensumId
    ? await prisma.pensum.findUnique({
        where: { id: pensumId },
        include: {
          program: true,
          subjects: { orderBy: [{ period: "asc" }, { name: "asc" }] },
        },
      })
    : null

  const byPeriod =
    selectedPensum?.subjects.reduce<
      Record<number, typeof selectedPensum.subjects>
    >((acc, s) => {
      if (!acc[s.period]) acc[s.period] = []
      acc[s.period].push(s)
      return acc
    }, {}) ?? {}

  const periods = Object.keys(byPeriod)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Pensum</h1>
        <p className="mt-1 text-slate-500">
          Vista del plan de estudios por período
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Seleccionar plan de estudios
            </label>
            <AutoSubmitSelect
              name="pensum"
              defaultValue={pensumId ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un plan...</option>
              {pensums.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.program.code} — Plan {p.code} ({p.totalCredits} créditos,{" "}
                  {p.periods} períodos)
                </option>
              ))}
            </AutoSubmitSelect>
          </form>
        </CardContent>
      </Card>

      {selectedPensum && (
        <div>
          <div className="mb-6 flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedPensum.program.name}
            </h2>
            <span className="text-sm text-slate-500">
              Plan {selectedPensum.code} · {selectedPensum.totalCredits}{" "}
              créditos totales
            </span>
          </div>

          <div className="space-y-4">
            {periods.map((period) => {
              const subjects = byPeriod[period]
              const periodCredits = subjects.reduce(
                (sum, s) => sum + s.credits,
                0
              )

              return (
                <Card key={period}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-slate-800">
                        Período {period}
                      </CardTitle>
                      <span className="text-xs text-slate-500">
                        {periodCredits} créditos
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
                          <th className="py-2 text-left font-medium text-slate-500">
                            Código
                          </th>
                          <th className="py-2 text-center font-medium text-slate-500">
                            Créditos
                          </th>
                          <th className="py-2 text-right font-medium text-slate-500">
                            Área
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((s) => {
                          const area = areaConfig[s.area]
                          return (
                            <tr key={s.id} className="border-b border-slate-50">
                              <td className="py-2.5 text-slate-900">
                                {s.name}
                              </td>
                              <td className="py-2.5 font-mono text-xs text-slate-500">
                                {s.code}
                              </td>
                              <td className="py-2.5 text-center text-slate-600">
                                {s.credits}
                              </td>
                              <td className="py-2.5 text-right">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${area.color}`}
                                >
                                  {area.label}
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
        </div>
      )}
    </div>
  )
}

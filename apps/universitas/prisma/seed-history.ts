import { PrismaClient, Prisma } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter,
})



async function main() {
  console.log("🌱 Agregando historial académico de prueba...");

  // Find Juan Ceballos's student record
  const student = await prisma.student.findFirst({
    where: { user: { email: "juan.ceballos@politecnicointernacionaldev.onmicrosoft.com" } },
    include: { pensum: { include: { subjects: true } } },
  });

  if (!student) {
    throw new Error("Estudiante Juan Ceballos no encontrado");
  }

  const studentId = student.id;
  console.log(`✅ Estudiante encontrado: ${student.studentCode}`);

  const subjects = student.pensum.subjects;

  const getSubject = (code: string) => {
    const s = subjects.find((s) => s.code === code);
    if (!s) throw new Error(`Asignatura ${code} no encontrada`);
    return s;
  };

  // Helper to create a record with 3 partials and final grade
  async function createRecord(
    subjectCode: string,
    term: string,
    grades: [number, number, number], // [corte1, corte2, corte3]
    status: "PASSED" | "FAILED" | "IN_PROGRESS"
  ) {
    const subject = getSubject(subjectCode);
    const [g1, g2, g3] = grades;
    const finalGrade = status === "IN_PROGRESS"
      ? null
      : Math.round((g1 * 0.15 + g2 * 0.35 + g3 * 0.50) * 100) / 100;

    const existing = await prisma.academicRecord.findUnique({
      where: { studentId_subjectId_term: { studentId, subjectId: subject.id, term } },
    });
    if (existing) return existing;

    const record = await prisma.academicRecord.create({
      data: {
        studentId,
        subjectId: subject.id,
        term,
        status,
        finalGrade,
        absences: Math.floor(Math.random() * 3),
        meetsAttendance: true,
        partialGrades: {
          create: [
            {
              order: 1,
              name: "NOTA PRIMER CORTE",
              percentage: 15,
              grade: g1,
              absences: 0,
            },
            {
              order: 2,
              name: "NOTA SEGUNDO CORTE",
              percentage: 35,
              grade: g2,
              absences: 0,
            },
            {
              order: 3,
              name: "NOTA TERCER CORTE",
              percentage: 50,
              grade: status === "IN_PROGRESS" ? null : g3,
              absences: 0,
            },
          ],
        },
      },
    });
    return record;
  }

  // ── Trimestre 2022-1T — Período 1 ────────────────────────
  await createRecord("1306", "2022-1T", [4.0, 3.8, 4.2], "PASSED"); // Competencias Comunicativas
  await createRecord("0940", "2022-1T", [3.5, 3.2, 3.8], "PASSED"); // Matemática Básica
  await createRecord("0547", "2022-1T", [4.5, 4.2, 4.8], "PASSED"); // Programación Web
  await createRecord("0546", "2022-1T", [3.8, 3.5, 4.0], "PASSED"); // Diseño de Algoritmos
  await createRecord("0787", "2022-1T", [4.0, 4.5, 4.3], "PASSED"); // Inglés I
  console.log("✅ 2022-1T creado");

  // ── Trimestre 2022-2T — Período 2 ────────────────────────
  await createRecord("0552", "2022-2T", [3.0, 2.8, 3.5], "PASSED"); // Álgebra Lineal
  await createRecord("0554", "2022-2T", [4.2, 4.0, 4.5], "PASSED"); // Programación OO
  await createRecord("0707", "2022-2T", [3.5, 4.0, 4.2], "PASSED"); // Fundamentos de Redes
  await createRecord("0548", "2022-2T", [4.0, 3.8, 4.1], "PASSED"); // Seguridad Informática
  await createRecord("1305", "2022-2T", [5.0, 5.0, 5.0], "PASSED"); // Plan de Vida
  await createRecord("0789", "2022-2T", [3.8, 4.2, 4.0], "PASSED"); // Inglés II
  console.log("✅ 2022-2T creado");

  // ── Trimestre 2022-3T — Período 3 ────────────────────────
  await createRecord("0558", "2022-3T", [4.0, 3.8, 4.3], "PASSED"); // Programación I
  await createRecord("0557", "2022-3T", [3.2, 3.0, 3.5], "PASSED"); // Estructura de Datos
  await createRecord("0560", "2022-3T", [4.5, 4.3, 4.8], "PASSED"); // Bases de Datos I
  await createRecord("0559", "2022-3T", [3.8, 4.0, 4.2], "PASSED"); // Legislación Informática
  await createRecord("0793", "2022-3T", [2.5, 2.8, 2.5], "FAILED"); // Inglés III — reprobó
  console.log("✅ 2022-3T creado");

  // ── Trimestre 2023-1T — Período 3 repite + Período 4 ─────
  await createRecord("0793", "2023-1T", [3.5, 3.8, 4.0], "PASSED"); // Inglés III — recupera
  await createRecord("5bf2ad36".slice(0, 4) === "5bf2" ? "0005" : "0005", "2023-1T", [4.0, 4.2, 4.5], "PASSED"); // Participación Ciudadana
  await createRecord("0563", "2023-1T", [3.8, 4.0, 4.2], "PASSED"); // Programación II
  await createRecord("1646", "2023-1T", [4.2, 4.0, 4.5], "PASSED"); // Bases de Datos II
  await createRecord("0564", "2023-1T", [3.5, 3.8, 4.0], "PASSED"); // Sistemas Operativos
  await createRecord("1308", "2023-1T", [5.0, 5.0, 5.0], "PASSED"); // Orientación a la Empleabilidad
  console.log("✅ 2023-1T creado");

  // ── Trimestre 2026-1T — ACTIVO (IN_PROGRESS) ─────────────
  await createRecord("1338", "2026-1T", [3.8, 4.0, 0], "IN_PROGRESS"); // Aplicaciones I
  await createRecord("1647", "2026-1T", [4.2, 4.5, 0], "IN_PROGRESS"); // Ingeniería de Software I
  await createRecord("1313", "2026-1T", [5.0, 5.0, 0], "IN_PROGRESS"); // Orientación al Emprendimiento
  await createRecord("0796", "2026-1T", [3.5, 3.8, 0], "IN_PROGRESS"); // Inglés IV
  console.log("✅ 2026-1T (activo) creado");

  // Update credits earned
  const passedRecords = await prisma.academicRecord.findMany({
    where: { studentId, status: "PASSED" },
    include: { subject: true },
  });
  const creditsEarned = passedRecords.reduce((sum, r) => sum + r.subject.credits, 0);
  await prisma.student.update({
    where: { id: studentId },
    data: { creditsEarned },
  });

  console.log(`\n✅ Créditos actualizados: ${creditsEarned}`);
  console.log("🎉 Historial académico creado exitosamente");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

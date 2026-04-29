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
  console.log("🌱 Starting seed...");

  // ── Institution ──────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where: { nit: "900123456-7" },
    update: {},
    create: {
      name: "Politécnico Internacional Institución de Educación Superior",
      nit: "900123456-7",
      enabled: true,
    },
  });

  // ── Faculty ───────────────────────────────────────────────
  let faculty = await prisma.faculty.findFirst({
    where: { institutionId: institution.id, name: "Técnicas de Ingeniería" },
  });
  if (!faculty) {
    faculty = await prisma.faculty.create({
      data: {
        institutionId: institution.id,
        name: "Técnicas de Ingeniería",
        enabled: true,
      },
    });
  }
  console.log("✅ Institution and Faculty created");

  // ── Programs, Pensums and Subjects ───────────────────────
  const pensumMap: Record<string, string> = {}; // code -> id
  // subjectMap: pensumCode|subjectDataId -> created subject id
  const subjectMap: Record<string, string> = {};

  // Program 351C
  const prog_351C = await prisma.program.upsert({
    where: { code: "351C" },
    update: {},
    create: {
      facultyId: faculty.id,
      code: "351C",
      name: "Tecnología en Desarrollo de Software y Aplicativos Móviles",
      mode: "IN_PERSON",
      enabled: true,
    },
  });

  // Pensum 35-1
  const ps_351C_35_1 = await prisma.pensum.upsert({
    where: { programId_code: { programId: prog_351C.id, code: "35-1" } },
    update: {},
    create: {
      programId: prog_351C.id,
      code: "35-1",
      periods: 10,
      totalCredits: 100,
      maxCreditsPerPeriod: 10,
      enabled: true,
    },
  });
  pensumMap["35-1"] = ps_351C_35_1.id;

  // Subjects for pensum 35-1 (pass 1: create)
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1306" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1306",
        name: "Competencias Comunicativas",
        credits: 1,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|55254822"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0940" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0940",
        name: "Matemática Básica",
        credits: 2,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|4c132287"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0547" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0547",
        name: "Programación Web",
        credits: 3,
        period: 1,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|81981814"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0546" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0546",
        name: "Diseño de Algoritmos",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|86716857"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0787" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0787",
        name: "Inglés I",
        credits: 2,
        period: 1,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|536aba8b"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0552" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0552",
        name: "Álgebra Lineal",
        credits: 2,
        period: 2,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|ce5d3acd"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0554" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0554",
        name: "Programación Orientada a Objetos",
        credits: 3,
        period: 2,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|8917dfa5"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0707" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0707",
        name: "Fundamentos de Redes",
        credits: 1,
        period: 2,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["35-1|9a8a3a5d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0548" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0548",
        name: "Seguridad Informática",
        credits: 1,
        period: 2,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["35-1|3e909a4b"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1305" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1305",
        name: "Plan de Vida",
        credits: 1,
        period: 2,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|93488bc9"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0789" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0789",
        name: "Inglés II",
        credits: 2,
        period: 2,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|38c23786"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0558" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0558",
        name: "Programación I",
        credits: 3,
        period: 3,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|44a66c4c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0557" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0557",
        name: "Estructura de Datos",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|e1225244"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0560" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0560",
        name: "Bases de Datos I",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|27bf935e"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0559" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0559",
        name: "Legislación Informática",
        credits: 1,
        period: 3,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["35-1|0d672789"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0793" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0793",
        name: "Inglés III",
        credits: 2,
        period: 3,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|7abe470f"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0005" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0005",
        name: "Participación Ciudadana",
        credits: 1,
        period: 4,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|5bf2ad36"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0563" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0563",
        name: "Programación II",
        credits: 3,
        period: 4,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|e1dc847c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1646" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1646",
        name: "Bases de Datos II",
        credits: 3,
        period: 4,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|0dc2b3e3"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0564" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0564",
        name: "Sistemas Operativos",
        credits: 2,
        period: 4,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["35-1|f6952e9a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1308" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1308",
        name: "Orientación a la Empleabilidad",
        credits: 1,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|25820a8c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1338" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1338",
        name: "Aplicaciones I",
        credits: 4,
        period: 5,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|fc1e6005"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1647" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1647",
        name: "Ingeniería de Software I",
        credits: 3,
        period: 5,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["35-1|0b15b634"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1313" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1313",
        name: "Orientación al Emprendimiento",
        credits: 1,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|63e18a0a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0796" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0796",
        name: "Inglés IV",
        credits: 2,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|70b3b423"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0569" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0569",
        name: "Aplicaciones II",
        credits: 3,
        period: 6,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|3e58999f"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1341" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1341",
        name: "Bases de Datos III",
        credits: 1,
        period: 6,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|db7a3794"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1342" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1342",
        name: "Soporte y Mantenimiento",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["35-1|3dcdb320"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1315" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1315",
        name: "Empleabilidad I",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|c385db1e"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1316" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1316",
        name: "Emprendimiento I",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|a9af35b8"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1307" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1307",
        name: "Proyectos I",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|82a8385a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0798" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0798",
        name: "Inglés V",
        credits: 2,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|46f7c9e0"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1340" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1340",
        name: "Aplicaciones Móviles",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|06a7be7e"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0578" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "0578",
        name: "Sistemas Integrados",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|6c28f323"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1385" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1385",
        name: "Electiva Disciplinar",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["35-1|8ea06225"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1346" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1346",
        name: "Ingeniería de Software II",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["35-1|f9d6c700"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1318" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1318",
        name: "Empleabilidad II",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|34919532"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1319" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1319",
        name: "Emprendimiento II",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|e4eb3074"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1311" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1311",
        name: "Proyectos II",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|391d1490"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1417" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1417",
        name: "Lenguajes de Programación para Aplicaciones de Nube",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|24f3c7e0"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1418" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1418",
        name: "Diseño de Algoritmos II",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|dfa56df9"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1419" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1419",
        name: "Fundamentos de Arquitectura",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|f83a483a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1420" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1420",
        name: "Calidad del Software",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["35-1|4e9d3b07"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1296" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1296",
        name: "Gestión de Proyectos",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|4b92b676"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1421" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1421",
        name: "Lenguajes de Programación para Aplicaciones Móviles",
        credits: 2,
        period: 9,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|d9e87563"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1422" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1422",
        name: "Inteligencia Artificial",
        credits: 2,
        period: 9,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["35-1|f07d2f9d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1648" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1648",
        name: "Pruebas y Mantenimiento de Software",
        credits: 4,
        period: 9,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["35-1|acde298d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1424" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1424",
        name: "Electiva Disciplinar II",
        credits: 2,
        period: 9,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["35-1|9f9a2637"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1425" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1425",
        name: "Práctica Empresarial",
        credits: 8,
        period: 10,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|6472b535"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1381" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1381",
        name: "Práctica Modalidad Emprendedora",
        credits: 8,
        period: 10,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["35-1|6f5c531d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1565" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1565",
        name: "Sector Productivo",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["35-1|c2a9b3d1"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1566" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1566",
        name: "Intervención Comunitaria",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["35-1|6c811559"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1567" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1567",
        name: "Semillero de Investigación",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["35-1|a97184fc"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1568" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1568",
        name: "Diplomado de Profundización",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["35-1|f3b3974d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1569" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1569",
        name: "Salida Académica",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["35-1|9510c507"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1391" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1391",
        name: "Especialización Tecnológica",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["35-1|8c25cf6b"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1570" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1570",
        name: "Certificación Externa",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["35-1|bc1cde2b"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1571" } },
      update: {},
      create: {
        pensumId: ps_351C_35_1.id,
        code: "1571",
        name: "Seminario de Profundización",
        credits: 2,
        period: 10,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["35-1|17de2b73"] = sub.id;
  }

  // Subjects for pensum 35-1 (pass 2: prerequisites)
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0552" } },
    data: { prerequisites: { connect: [subjectMap["35-1|4c132287"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0554" } },
    data: { prerequisites: { connect: [subjectMap["35-1|81981814"], subjectMap["35-1|86716857"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0789" } },
    data: { prerequisites: { connect: [subjectMap["35-1|536aba8b"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0558" } },
    data: { prerequisites: { connect: [subjectMap["35-1|8917dfa5"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0793" } },
    data: { prerequisites: { connect: [subjectMap["35-1|38c23786"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0563" } },
    data: { prerequisites: { connect: [subjectMap["35-1|44a66c4c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1646" } },
    data: { prerequisites: { connect: [subjectMap["35-1|e1225244"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1338" } },
    data: { prerequisites: { connect: [subjectMap["35-1|e1dc847c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0796" } },
    data: { prerequisites: { connect: [subjectMap["35-1|7abe470f"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0569" } },
    data: { prerequisites: { connect: [subjectMap["35-1|fc1e6005"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1341" } },
    data: { prerequisites: { connect: [subjectMap["35-1|0dc2b3e3"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1315" } },
    data: { prerequisites: { connect: [subjectMap["35-1|25820a8c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1316" } },
    data: { prerequisites: { connect: [subjectMap["35-1|63e18a0a"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "0798" } },
    data: { prerequisites: { connect: [subjectMap["35-1|70b3b423"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1340" } },
    data: { prerequisites: { connect: [subjectMap["35-1|3e58999f"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1346" } },
    data: { prerequisites: { connect: [subjectMap["35-1|0b15b634"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1318" } },
    data: { prerequisites: { connect: [subjectMap["35-1|c385db1e"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1319" } },
    data: { prerequisites: { connect: [subjectMap["35-1|a9af35b8"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1311" } },
    data: { prerequisites: { connect: [subjectMap["35-1|82a8385a"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1418" } },
    data: { prerequisites: { connect: [subjectMap["35-1|86716857"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1296" } },
    data: { prerequisites: { connect: [subjectMap["35-1|391d1490"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1421" } },
    data: { prerequisites: { connect: [subjectMap["35-1|06a7be7e"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_351C_35_1.id, code: "1424" } },
    data: { prerequisites: { connect: [subjectMap["35-1|8ea06225"]].filter(Boolean).map(id => ({ id })) } },
  });

  // Program 372V
  const prog_372V = await prisma.program.upsert({
    where: { code: "372V" },
    update: {},
    create: {
      facultyId: faculty.id,
      code: "372V",
      name: "Tecnología en Desarrollo de Software y Aplicativos Móviles",
      mode: "REMOTE",
      enabled: true,
    },
  });

  // Pensum 37-1
  const ps_372V_37_1 = await prisma.pensum.upsert({
    where: { programId_code: { programId: prog_372V.id, code: "37-1" } },
    update: {},
    create: {
      programId: prog_372V.id,
      code: "37-1",
      periods: 8,
      totalCredits: 98,
      maxCreditsPerPeriod: 12,
      enabled: true,
    },
  });
  pensumMap["37-1"] = ps_372V_37_1.id;

  // Subjects for pensum 37-1 (pass 1: create)
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1426" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1426",
        name: "Competencias Comunicativas",
        credits: 1,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|4d216d1a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1427" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1427",
        name: "Matemática Básica",
        credits: 2,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|6006cc7a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1507" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1507",
        name: "Programación Web",
        credits: 3,
        period: 1,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|e03af3fb"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1508" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1508",
        name: "Diseño de Algoritmos",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|f295b9d5"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1509" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1509",
        name: "Estructura de Datos",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|b4432168"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1445" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1445",
        name: "Inglés I",
        credits: 2,
        period: 1,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|b9a5c8df"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1510" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1510",
        name: "Álgebra Lineal",
        credits: 2,
        period: 2,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|99a9a3b2"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1511" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1511",
        name: "Programación Orientada a Objetos",
        credits: 3,
        period: 2,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|00160b7e"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1512" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1512",
        name: "Bases de Datos I",
        credits: 2,
        period: 2,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|4f3b7f17"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1513" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1513",
        name: "Fundamentos de Redes",
        credits: 1,
        period: 2,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["37-1|982bd6d3"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1522" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1522",
        name: "Seguridad Informática",
        credits: 1,
        period: 2,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["37-1|49b49117"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1446" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1446",
        name: "Plan de Vida",
        credits: 1,
        period: 2,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|eeaa0b48"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1454" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1454",
        name: "Inglés II",
        credits: 2,
        period: 2,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|bd3e571c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1514" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1514",
        name: "Programación I",
        credits: 3,
        period: 3,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|c82efaf9"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1515" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1515",
        name: "Bases de Datos II",
        credits: 3,
        period: 3,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|b566fcff"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1516" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1516",
        name: "Sistemas Operativos",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["37-1|b64a2737"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1517" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1517",
        name: "Ingeniería de Software I",
        credits: 3,
        period: 3,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["37-1|c8a49c69"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1455" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1455",
        name: "Orientación a la Empleabilidad",
        credits: 1,
        period: 3,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|eec9846c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1519" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1519",
        name: "Programación II",
        credits: 3,
        period: 4,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|17d0c3eb"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1520" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1520",
        name: "Diseño de Algoritmos II",
        credits: 2,
        period: 4,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|77ce911e"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1521" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1521",
        name: "Soporte y Mantenimiento",
        credits: 2,
        period: 4,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["37-1|7ce0052a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1526" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1526",
        name: "Legislación Informática",
        credits: 1,
        period: 4,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["37-1|d00eaebf"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1523" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1523",
        name: "Ingeniería de Software II",
        credits: 2,
        period: 4,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["37-1|eaad0c0d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1462" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1462",
        name: "Orientación al Emprendimiento",
        credits: 1,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|e0ddb798"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1447" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1447",
        name: "Proyectos I",
        credits: 1,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|a27b87c7"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1428" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1428",
        name: "Participación Ciudadana",
        credits: 1,
        period: 5,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|dffdb1e9"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1524" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1524",
        name: "Aplicaciones I",
        credits: 4,
        period: 5,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|e59fdb23"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1525" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1525",
        name: "Bases de Datos III",
        credits: 1,
        period: 5,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|3baad059"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1527" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1527",
        name: "Calidad del Software",
        credits: 2,
        period: 5,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["37-1|e7c27d4d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1461" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1461",
        name: "Inglés III",
        credits: 2,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|cbce544c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1472" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1472",
        name: "Empleabilidad I",
        credits: 1,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|383a15bb"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1473" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1473",
        name: "Emprendimiento I",
        credits: 1,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|bbd19642"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1456" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1456",
        name: "Proyectos II",
        credits: 1,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|6c78e351"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1529" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1529",
        name: "Aplicaciones II",
        credits: 3,
        period: 6,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|3b0e9c6f"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1530" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1530",
        name: "Sistemas Integrados",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|732f9dd2"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1531" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1531",
        name: "Fundamentos de Arquitectura",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|11d1e434"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1528" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1528",
        name: "Inglés IV",
        credits: 2,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|bc35d487"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1480" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1480",
        name: "Empleabilidad II",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|1c83c07d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1481" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1481",
        name: "Emprendimiento II",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|1df78996"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1533" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1533",
        name: "Aplicaciones Móviles",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|a9780517"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1534" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1534",
        name: "Lenguajes de Programación para Aplicaciones de Nube",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|46b8d4ab"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1535" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1535",
        name: "Electiva Disciplinar",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Programación y aplicaciones móviles",
        enabled: true,
      },
    });
    subjectMap["37-1|f41ad775"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1536" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1536",
        name: "Pruebas y Mantenimiento de Software",
        credits: 4,
        period: 7,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["37-1|ed8df3bb"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1532" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1532",
        name: "Inglés V",
        credits: 2,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|a271d497"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1541" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1541",
        name: "Práctica Empresarial",
        credits: 8,
        period: 8,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|2e7b39ed"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1503" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1503",
        name: "Práctica Modalidad Emprendedora",
        credits: 8,
        period: 8,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["37-1|1ec591b7"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1539" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1539",
        name: "Inteligencia Artificial",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Soporte y mantenimiento",
        enabled: true,
      },
    });
    subjectMap["37-1|a8afb1b0"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1537" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1537",
        name: "Electiva Disciplinar II",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["37-1|8eb32ceb"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1540" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1540",
        name: "Lenguajes de Programación para Aplicaciones Móviles",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Calidad del software",
        enabled: true,
      },
    });
    subjectMap["37-1|9c7f66a2"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1565" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1565",
        name: "Sector Productivo",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["37-1|4b0b8cde"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1566" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1566",
        name: "Intervención Comunitaria",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["37-1|69f24df4"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1567" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1567",
        name: "Semillero de Investigación",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["37-1|14a6dc63"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1568" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1568",
        name: "Diplomado de Profundización",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["37-1|a7a2a0ff"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1569" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1569",
        name: "Salida Académica",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["37-1|b773d2a7"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1391" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1391",
        name: "Especialización Tecnológica",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["37-1|1c49f872"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1570" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1570",
        name: "Certificación Externa",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["37-1|b3ab2cd5"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1571" } },
      update: {},
      create: {
        pensumId: ps_372V_37_1.id,
        code: "1571",
        name: "Seminario de Profundización",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["37-1|e03cb32b"] = sub.id;
  }

  // Subjects for pensum 37-1 (pass 2: prerequisites)
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1510" } },
    data: { prerequisites: { connect: [subjectMap["37-1|6006cc7a"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1511" } },
    data: { prerequisites: { connect: [subjectMap["37-1|e03af3fb"], subjectMap["37-1|f295b9d5"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1454" } },
    data: { prerequisites: { connect: [subjectMap["37-1|b9a5c8df"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1514" } },
    data: { prerequisites: { connect: [subjectMap["37-1|00160b7e"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1515" } },
    data: { prerequisites: { connect: [subjectMap["37-1|4f3b7f17"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1519" } },
    data: { prerequisites: { connect: [subjectMap["37-1|c82efaf9"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1520" } },
    data: { prerequisites: { connect: [subjectMap["37-1|f295b9d5"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1523" } },
    data: { prerequisites: { connect: [subjectMap["37-1|c8a49c69"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1524" } },
    data: { prerequisites: { connect: [subjectMap["37-1|17d0c3eb"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1525" } },
    data: { prerequisites: { connect: [subjectMap["37-1|b566fcff"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1527" } },
    data: { prerequisites: { connect: [subjectMap["37-1|eaad0c0d"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1461" } },
    data: { prerequisites: { connect: [subjectMap["37-1|bd3e571c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1472" } },
    data: { prerequisites: { connect: [subjectMap["37-1|eec9846c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1473" } },
    data: { prerequisites: { connect: [subjectMap["37-1|e0ddb798"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1456" } },
    data: { prerequisites: { connect: [subjectMap["37-1|a27b87c7"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1529" } },
    data: { prerequisites: { connect: [subjectMap["37-1|e59fdb23"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1528" } },
    data: { prerequisites: { connect: [subjectMap["37-1|cbce544c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1480" } },
    data: { prerequisites: { connect: [subjectMap["37-1|383a15bb"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1481" } },
    data: { prerequisites: { connect: [subjectMap["37-1|bbd19642"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1533" } },
    data: { prerequisites: { connect: [subjectMap["37-1|3b0e9c6f"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1534" } },
    data: { prerequisites: { connect: [subjectMap["37-1|e59fdb23"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1536" } },
    data: { prerequisites: { connect: [subjectMap["37-1|e7c27d4d"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1532" } },
    data: { prerequisites: { connect: [subjectMap["37-1|bc35d487"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1537" } },
    data: { prerequisites: { connect: [subjectMap["37-1|f41ad775"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_372V_37_1.id, code: "1540" } },
    data: { prerequisites: { connect: [subjectMap["37-1|a9780517"]].filter(Boolean).map(id => ({ id })) } },
  });

  // Program GABD
  const prog_GABD = await prisma.program.upsert({
    where: { code: "GABD" },
    update: {},
    create: {
      facultyId: faculty.id,
      code: "GABD",
      name: "Tecnología en Gestión de Analítica y Big Data",
      mode: "REMOTE",
      enabled: true,
    },
  });

  // Pensum V 181
  const ps_GABD_V_181 = await prisma.pensum.upsert({
    where: { programId_code: { programId: prog_GABD.id, code: "V 181" } },
    update: {},
    create: {
      programId: prog_GABD.id,
      code: "V 181",
      periods: 8,
      totalCredits: 100,
      maxCreditsPerPeriod: 12,
      enabled: true,
    },
  });
  pensumMap["V 181"] = ps_GABD_V_181.id;

  // Subjects for pensum V 181 (pass 1: create)
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1426" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1426",
        name: "Competencias Comunicativas",
        credits: 1,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|099a4103"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1427" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1427",
        name: "Matemática Básica",
        credits: 2,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|5a0a38f8"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1428" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1428",
        name: "Participación Ciudadana",
        credits: 1,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|e44dcf42"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1837" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1837",
        name: "Gestión de Datos Estructurados",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|7f4c9cba"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1512" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1512",
        name: "Bases de Datos I",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|da9dc127"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1746" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1746",
        name: "Lógica de Programación",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|baf8f448"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1440" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1440",
        name: "Informática",
        credits: 2,
        period: 1,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|ce8eeb29"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1510" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1510",
        name: "Álgebra Lineal",
        credits: 2,
        period: 2,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|3d06283d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1441" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1441",
        name: "Estadística",
        credits: 2,
        period: 2,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|2d1920ee"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1747" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1747",
        name: "Gestión de Datos No Estructurados",
        credits: 2,
        period: 2,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|14e8a4a5"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1508" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1508",
        name: "Diseño de Algoritmos",
        credits: 2,
        period: 2,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|70a6c650"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "0577" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "0577",
        name: "Manejo Avanzado de Hojas de Cálculo",
        credits: 2,
        period: 2,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|2ab044a6"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1445" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1445",
        name: "Inglés I",
        credits: 2,
        period: 2,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|cd7ef928"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1748" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1748",
        name: "Estadística Aplicada",
        credits: 2,
        period: 3,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|8e0964b4"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1749" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1749",
        name: "Arquitectura y Gobernanza de Datos",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|b620021c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1750" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1750",
        name: "Fundamentos de Gestión de Datos",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|1ce5c9c9"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1520" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1520",
        name: "Diseño de Algoritmos II",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|df0910f3"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1446" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1446",
        name: "Plan de Vida",
        credits: 1,
        period: 3,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|96fbaf05"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1751" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1751",
        name: "Ética y Regulación de Datos",
        credits: 1,
        period: 3,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|bbfaee8a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1454" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1454",
        name: "Inglés II",
        credits: 2,
        period: 3,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|f15e80dc"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1703" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1703",
        name: "Comunicación Efectiva",
        credits: 2,
        period: 4,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|9c3c52e4"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1752" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1752",
        name: "Cálculo",
        credits: 2,
        period: 4,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|20a604c1"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1753" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1753",
        name: "Gestión de Datos en la Nube",
        credits: 2,
        period: 4,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|81f185d9"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1754" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1754",
        name: "Lenguajes de Programación para Analítica I",
        credits: 2,
        period: 4,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|f549219e"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1455" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1455",
        name: "Orientación a la Empleabilidad",
        credits: 1,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|e29c0174"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1447" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1447",
        name: "Proyectos I",
        credits: 1,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|c568ec94"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1461" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1461",
        name: "Inglés III",
        credits: 2,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|367f08c3"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1755" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1755",
        name: "Visualización de Datos",
        credits: 3,
        period: 5,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|88ab88cd"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1756" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1756",
        name: "Marketing Digital I",
        credits: 2,
        period: 5,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|ed6c9b3a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1757" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1757",
        name: "Lenguajes de Programación para Analítica II",
        credits: 3,
        period: 5,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|7d0d0c34"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1462" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1462",
        name: "Orientación al Emprendimiento",
        credits: 1,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|6e2689fc"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1456" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1456",
        name: "Proyectos II",
        credits: 1,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|8c7cf088"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1528" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1528",
        name: "Inglés IV",
        credits: 2,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|cd84c6c0"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1759" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1759",
        name: "Big Data I",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|ccb8eb9c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1760" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1760",
        name: "Marketing Digital II",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|831e50f3"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1761" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1761",
        name: "Analítica Aplicada en la Gestión de la Salud",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|16dd99ab"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1762" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1762",
        name: "Analítica Aplicada I",
        credits: 3,
        period: 6,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|b5488c91"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1472" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1472",
        name: "Empleabilidad I",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|c0183b0f"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1473" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1473",
        name: "Emprendimiento I",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|8ca0ed0c"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1532" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1532",
        name: "Inglés V",
        credits: 2,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|461014e7"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1763" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1763",
        name: "Big Data II",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|9710f6ff"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1764" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1764",
        name: "Analítica Aplicada en la Gestión Financiera",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|de31a787"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1765" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1765",
        name: "Analítica Aplicada II",
        credits: 3,
        period: 7,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|0efbc781"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1480" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1480",
        name: "Empleabilidad II",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|3e54737f"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1481" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1481",
        name: "Emprendimiento II",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|e9e9a4f4"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1482" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1482",
        name: "Gestión de Proyectos",
        credits: 2,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|484b9015"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1766" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1766",
        name: "Inglés VI",
        credits: 2,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|b7e28a9b"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1767" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1767",
        name: "Práctica Empresarial",
        credits: 8,
        period: 8,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|a2b5e2da"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1503" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1503",
        name: "Práctica Modalidad Emprendedora",
        credits: 8,
        period: 8,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|6f5f922d"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1768" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1768",
        name: "Analítica Aplicada en la Gestión Tecnológica",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|4a2879f7"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1733" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1733",
        name: "Aplicaciones de IA en Gestión Empresarial",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|7f7ce180"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1769" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1769",
        name: "Inglés VII",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["V 181|d9e8ba7a"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1800" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1800",
        name: "Sector Productivo",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["V 181|f6e1f021"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1802" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1802",
        name: "Semillero de Investigación",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["V 181|951d95b5"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1803" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1803",
        name: "Diplomado de Profundización",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["V 181|f1a3ddb4"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1804" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1804",
        name: "Especialización Tecnológica",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["V 181|c9c3e218"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1806" } },
      update: {},
      create: {
        pensumId: ps_GABD_V_181.id,
        code: "1806",
        name: "Seminario de Profundización o Emprendimiento",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["V 181|5aeb1c11"] = sub.id;
  }

  // Subjects for pensum V 181 (pass 2: prerequisites)
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1510" } },
    data: { prerequisites: { connect: [subjectMap["V 181|5a0a38f8"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1441" } },
    data: { prerequisites: { connect: [subjectMap["V 181|5a0a38f8"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1508" } },
    data: { prerequisites: { connect: [subjectMap["V 181|baf8f448"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "0577" } },
    data: { prerequisites: { connect: [subjectMap["V 181|ce8eeb29"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1748" } },
    data: { prerequisites: { connect: [subjectMap["V 181|2d1920ee"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1749" } },
    data: { prerequisites: { connect: [subjectMap["V 181|7f4c9cba"], subjectMap["V 181|14e8a4a5"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1750" } },
    data: { prerequisites: { connect: [subjectMap["V 181|da9dc127"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1520" } },
    data: { prerequisites: { connect: [subjectMap["V 181|70a6c650"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1454" } },
    data: { prerequisites: { connect: [subjectMap["V 181|cd7ef928"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1703" } },
    data: { prerequisites: { connect: [subjectMap["V 181|099a4103"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1752" } },
    data: { prerequisites: { connect: [subjectMap["V 181|3d06283d"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1753" } },
    data: { prerequisites: { connect: [subjectMap["V 181|b620021c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1754" } },
    data: { prerequisites: { connect: [subjectMap["V 181|df0910f3"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1461" } },
    data: { prerequisites: { connect: [subjectMap["V 181|f15e80dc"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1757" } },
    data: { prerequisites: { connect: [subjectMap["V 181|f549219e"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1456" } },
    data: { prerequisites: { connect: [subjectMap["V 181|c568ec94"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1528" } },
    data: { prerequisites: { connect: [subjectMap["V 181|367f08c3"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1760" } },
    data: { prerequisites: { connect: [subjectMap["V 181|ed6c9b3a"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1762" } },
    data: { prerequisites: { connect: [subjectMap["V 181|7d0d0c34"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1472" } },
    data: { prerequisites: { connect: [subjectMap["V 181|e29c0174"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1473" } },
    data: { prerequisites: { connect: [subjectMap["V 181|6e2689fc"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1532" } },
    data: { prerequisites: { connect: [subjectMap["V 181|cd84c6c0"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1763" } },
    data: { prerequisites: { connect: [subjectMap["V 181|ccb8eb9c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1764" } },
    data: { prerequisites: { connect: [subjectMap["V 181|b5488c91"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1765" } },
    data: { prerequisites: { connect: [subjectMap["V 181|b5488c91"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1480" } },
    data: { prerequisites: { connect: [subjectMap["V 181|c0183b0f"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1481" } },
    data: { prerequisites: { connect: [subjectMap["V 181|8ca0ed0c"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1482" } },
    data: { prerequisites: { connect: [subjectMap["V 181|8c7cf088"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1766" } },
    data: { prerequisites: { connect: [subjectMap["V 181|461014e7"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GABD_V_181.id, code: "1769" } },
    data: { prerequisites: { connect: [subjectMap["V 181|b7e28a9b"]].filter(Boolean).map(id => ({ id })) } },
  });

  // Program GSDIA
  const prog_GSDIA = await prisma.program.upsert({
    where: { code: "GSDIA" },
    update: {},
    create: {
      facultyId: faculty.id,
      code: "GSDIA",
      name: "Tecnología en Gestión de Soluciones con Datos con Inteligencia Artificial",
      mode: "REMOTE",
      enabled: true,
    },
  });

  // Pensum 320 (K - Q)
  const ps_GSDIA_320_K___Q = await prisma.pensum.upsert({
    where: { programId_code: { programId: prog_GSDIA.id, code: "320 (K - Q)" } },
    update: {},
    create: {
      programId: prog_GSDIA.id,
      code: "320 (K - Q)",
      periods: 9,
      totalCredits: 110,
      maxCreditsPerPeriod: 12,
      enabled: true,
    },
  });
  pensumMap["320 (K - Q)"] = ps_GSDIA_320_K___Q.id;

  // Subjects for pensum 320 (K - Q) (pass 1: create)
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1746" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1746",
        name: "Lógica de Programación",
        credits: 2,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|b4507005"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1427" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1427",
        name: "Matemática Básica",
        credits: 2,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|5a0cebe5"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1426" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1426",
        name: "Competencias Comunicativas",
        credits: 1,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|c2ed004e"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1428" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1428",
        name: "Participación Ciudadana",
        credits: 1,
        period: 1,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|e44dcf42g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1512" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1512",
        name: "Base de Datos I",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|da9dc127g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2166" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2166",
        name: "Introducción a la Inteligencia Artificial",
        credits: 2,
        period: 1,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|f7bd2de0"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1440" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1440",
        name: "Informática",
        credits: 2,
        period: 1,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|ce8eeb29g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1510" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1510",
        name: "Álgebra Lineal",
        credits: 2,
        period: 2,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|3d06283dg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1441" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1441",
        name: "Estadística",
        credits: 2,
        period: 2,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|2d1920eeg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1515" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1515",
        name: "Base de Datos II",
        credits: 3,
        period: 2,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|e9f029c7"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1508" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1508",
        name: "Diseño de Algoritmos I",
        credits: 2,
        period: 2,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|70a6c650g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2167" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2167",
        name: "Inteligencia Artificial Práctica Aplicada",
        credits: 2,
        period: 2,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|679c0f99"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1446" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1446",
        name: "Plan de Vida",
        credits: 1,
        period: 2,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|96fbaf05g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1748" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1748",
        name: "Estadística Aplicada",
        credits: 2,
        period: 3,
        area: "BASIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|8e0964b4g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1509" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1509",
        name: "Estructura de Datos",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|bbfaee8ag"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1520" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1520",
        name: "Diseño de Algoritmos II",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|df0910f3g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2168" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2168",
        name: "Tecnología y Sociedad",
        credits: 2,
        period: 3,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|ac02fcb3"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1455" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1455",
        name: "Orientación a la Empleabilidad",
        credits: 1,
        period: 3,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|e29c0174g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1445" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1445",
        name: "Inglés I",
        credits: 2,
        period: 3,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|cd7ef928g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2169" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2169",
        name: "Analítica y Visualización de Datos",
        credits: 3,
        period: 4,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|c568ec94g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2170" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2170",
        name: "Introducción a la Minería de Datos",
        credits: 3,
        period: 4,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|b620021cg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2171" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2171",
        name: "Taller de Analítica de Datos",
        credits: 3,
        period: 4,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|9c3c52e4g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1462" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1462",
        name: "Orientación al Emprendimiento",
        credits: 1,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|6e2689fcg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1454" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1454",
        name: "Inglés II",
        credits: 2,
        period: 4,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|f15e80dcg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2172" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2172",
        name: "Ciencia de Datos - Modelos y Algoritmos",
        credits: 3,
        period: 5,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|20a604c1g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2173" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2173",
        name: "Modelado de Minería de Datos",
        credits: 3,
        period: 5,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|81f185d9g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2174" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2174",
        name: "Machine Learning Supervisado, Regresión y Clasificación",
        credits: 2,
        period: 5,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|f549219eg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2175" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2175",
        name: "Introducción a las Redes Neuronales y Agentes Inteligentes",
        credits: 3,
        period: 5,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|88ab88cdg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1461" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1461",
        name: "Inglés III",
        credits: 2,
        period: 5,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|367f08c3g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1468" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1468",
        name: "Electiva Disciplinar I",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|ed6c9b3ag"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2176" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2176",
        name: "Seminario de Actualización - Ciencia de Datos",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|7d0d0c34g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2177" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2177",
        name: "Machine Learning No Supervisado",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|8c7cf088g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2179" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2179",
        name: "Desarrollo y Gestión de Sistemas de IA",
        credits: 3,
        period: 6,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|cd84c6c0g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2180" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2180",
        name: "Procesamiento de Lenguaje Natural",
        credits: 2,
        period: 6,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|ccb8eb9cg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1447" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1447",
        name: "Proyectos I",
        credits: 1,
        period: 6,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|831e50f3g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1487" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1487",
        name: "Electiva Disciplinar II",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|16dd99abg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2181" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2181",
        name: "Machine Learning Avanzado: Árboles, Ensambles y Otros",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|b5488c91g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2182" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2182",
        name: "Técnicas de Procesamiento de Imágenes",
        credits: 3,
        period: 7,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|c0183b0fg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2183" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2183",
        name: "Modelado de Sistemas IA - Algoritmos",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|8ca0ed0cg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2184" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2184",
        name: "Seminario de Actualización - Machine y Deep Learning",
        credits: 2,
        period: 7,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|461014e7g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1472" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1472",
        name: "Empleabilidad I",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|9710f6ffg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1473" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1473",
        name: "Emprendimiento I",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|de31a787g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1456" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1456",
        name: "Proyectos II",
        credits: 1,
        period: 7,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|0efbc781g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1500" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1500",
        name: "Electiva Disciplinar III",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Gestión de soluciones con datos",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|3e54737fg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2185" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2185",
        name: "Técnicas de Procesamiento de Habla",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|e9e9a4f4g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2186" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2186",
        name: "Visión por Computadora",
        credits: 3,
        period: 8,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|484b9015g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2187" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2187",
        name: "Seminario de Actualización - IA",
        credits: 2,
        period: 8,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|b7e28a9bg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1480" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1480",
        name: "Empleabilidad II",
        credits: 1,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|a2b5e2dag"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1481" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1481",
        name: "Emprendimiento II",
        credits: 1,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|6f5f922dg"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1482" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1482",
        name: "Gestión de Proyectos",
        credits: 2,
        period: 8,
        area: "COMPLEMENTARY",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|4a2879f7g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1727" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1727",
        name: "Práctica Empresarial",
        credits: 8,
        period: 9,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|7f7ce180g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1503" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1503",
        name: "Práctica Modalidad Emprendedora",
        credits: 8,
        period: 9,
        area: "SPECIFIC",
        subarea: null,
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|d9e8ba7ag"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2188" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "2188",
        name: "Modelado de Sistemas IA",
        credits: 3,
        period: 9,
        area: "SPECIFIC",
        subarea: "Gestión de sistemas de inteligencia artificial",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|f6e1f021g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1800" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1800",
        name: "Investigación Empresarial",
        credits: 2,
        period: 9,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|951d95b5g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1802" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1802",
        name: "Semillero de Investigación",
        credits: 2,
        period: 9,
        area: "COMPLEMENTARY",
        subarea: "Investigación",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|f1a3ddb4g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1803" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1803",
        name: "Diplomado de Profundización",
        credits: 2,
        period: 9,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|c9c3e218g"] = sub.id;
  }
  {
    const sub = await prisma.subject.upsert({
      where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1804" } },
      update: {},
      create: {
        pensumId: ps_GSDIA_320_K___Q.id,
        code: "1804",
        name: "Especialización Tecnológica",
        credits: 2,
        period: 9,
        area: "COMPLEMENTARY",
        subarea: "Profundización",
        enabled: true,
      },
    });
    subjectMap["320 (K - Q)|5aeb1c11g"] = sub.id;
  }

  // Subjects for pensum 320 (K - Q) (pass 2: prerequisites)
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1510" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|5a0cebe5"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1441" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|5a0cebe5"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1515" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|da9dc127g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1508" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|b4507005"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2167" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|f7bd2de0"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1748" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|2d1920eeg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1509" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|70a6c650g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1520" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|70a6c650g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2169" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|e9f029c7"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2170" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|bbfaee8ag"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1454" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|cd7ef928g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2172" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|b620021cg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2173" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|b620021cg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1461" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|f15e80dcg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2177" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|f549219eg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1487" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|ed6c9b3ag"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1472" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|e29c0174g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1473" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|6e2689fcg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1456" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|831e50f3g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1500" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|16dd99abg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2186" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|c0183b0fg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1480" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|9710f6ffg"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1481" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|de31a787g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "1482" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|0efbc781g"]].filter(Boolean).map(id => ({ id })) } },
  });
  await prisma.subject.update({
    where: { pensumId_code: { pensumId: ps_GSDIA_320_K___Q.id, code: "2188" } },
    data: { prerequisites: { connect: [subjectMap["320 (K - Q)|8ca0ed0cg"]].filter(Boolean).map(id => ({ id })) } },
  });

  console.log("✅ Programs, Pensums and Subjects created");

  // ── Academic Period ───────────────────────────────────────
  await prisma.academicPeriod.upsert({
    where: { code: "2026-1T" },
    update: {},
    create: {
      code: "2026-1T",
      startDate: new Date("2026-01-13"),
      endDate: new Date("2026-04-12"),
      active: true,
    },
  });

  // ── Users and Students ────────────────────────────────────
  const usersData = [
    {
      identity: "100001", firstName: "Laura", lastName: "Mendoza",
      email: "laura.mendoza@politecnicointernacionaldev.onmicrosoft.com",
      role: "COORDINATOR" as const, student: null,
    },
    {
      identity: "707201", firstName: "Juan", lastName: "Ceballos",
      email: "juan.ceballos@politecnicointernacionaldev.onmicrosoft.com",
      role: "STUDENT" as const,
      student: { studentCode: "2022-0001", campus: "SEDE CALLE 73", enrollmentDate: new Date("2022-01-10"), pensumCode: "35-1" },
    },
    {
      identity: "707202", firstName: "Valentina", lastName: "Ríos",
      email: "valentina.rios@politecnicointernacionaldev.onmicrosoft.com",
      role: "STUDENT" as const,
      student: { studentCode: "2022-0002", campus: "SEDE CALLE 73", enrollmentDate: new Date("2022-01-10"), pensumCode: "35-1" },
    },
    {
      identity: "707203", firstName: "Andrés", lastName: "Morales",
      email: "andres.morales@politecnicointernacionaldev.onmicrosoft.com",
      role: "STUDENT" as const,
      student: { studentCode: "2023-0001", campus: "SEDE VIRTUAL", enrollmentDate: new Date("2023-01-09"), pensumCode: "37-1" },
    },
    {
      identity: "707204", firstName: "Camila", lastName: "Herrera",
      email: "camila.herrera@politecnicointernacionaldev.onmicrosoft.com",
      role: "STUDENT" as const,
      student: { studentCode: "2023-0002", campus: "SEDE VIRTUAL", enrollmentDate: new Date("2023-01-09"), pensumCode: "37-1" },
    },
    {
      identity: "707205", firstName: "Santiago", lastName: "Vargas",
      email: "santiago.vargas@politecnicointernacionaldev.onmicrosoft.com",
      role: "STUDENT" as const,
      student: { studentCode: "2024-0001", campus: "SEDE VIRTUAL", enrollmentDate: new Date("2024-01-08"), pensumCode: "V 181" },
    },
  ];

  for (const userData of usersData) {
    const { student, ...userFields } = userData;
    const user = await prisma.user.upsert({
      where: { identity: userFields.identity },
      update: {},
      create: { ...userFields, enabled: true },
    });
    if (student) {
      const pensumId = pensumMap[student.pensumCode];
      await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          pensumId,
          studentCode: student.studentCode,
          campus: student.campus,
          enrollmentDate: student.enrollmentDate,
          status: "ACTIVE",
          creditsEarned: 0,
        },
      });
    }
  }
  console.log("✅ Users and Students created");
  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
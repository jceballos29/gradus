using Gradus.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Gradus.Infrastructure.Persistence;

/// <summary>
/// Inserta datos de prueba para las reglas y equivalencias entre DSAM Presencial y Virtual.
/// Solo ejecuta si la tabla de reglas está vacía.
/// </summary>
public class DataSeeder
{
    private readonly GradusDbContext _db;
    private readonly ILogger<DataSeeder> _logger;

    // OID ficticio del coordinador para el seed
    private const string SeedCoordinatorOid = "seed-coordinator-oid";

    public DataSeeder(GradusDbContext db, ILogger<DataSeeder> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await _db.HomologationRules.AnyAsync(ct))
        {
            _logger.LogInformation("Seed ya fue ejecutado — omitiendo.");
            return;
        }

        _logger.LogInformation("Ejecutando seed de reglas y equivalencias...");

        // ── Regla 351C → 372V ────────────────────────────────────────────
        // DSAM Presencial → DSAM Virtual
        // Nota mínima: 3.0, máx 70% créditos, misma área requerida
        var rule351To372 = HomologationRule.Create(
            sourceProgramCode: "351C",
            targetProgramCode: "372V",
            minGrade: 3.0m,
            maxCreditsPercentage: 70,
            requiresSameArea: true,
            createdByAzureOid: SeedCoordinatorOid
        );

        await _db.HomologationRules.AddAsync(rule351To372, ct);
        await _db.SaveChangesAsync(ct);

        // Equivalencias 351C → 372V
        // Las materias comparten nombre pero tienen códigos distintos
        var equivalences351To372 = new List<SubjectEquivalence>
        {
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1306",
                "Competencias Comunicativas",
                1,
                "1426",
                "Competencias Comunicativas",
                1
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0940",
                "Matemática Básica",
                2,
                "1427",
                "Matemática Básica",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0552",
                "Álgebra Lineal",
                2,
                "1510",
                "Álgebra Lineal",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0547",
                "Programación Web",
                3,
                "1507",
                "Programación Web",
                3
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0546",
                "Diseño de Algoritmos",
                2,
                "1508",
                "Diseño de Algoritmos",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0557",
                "Estructura de Datos",
                2,
                "1509",
                "Estructura de Datos",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0554",
                "Programación Orientada a Objetos",
                3,
                "1511",
                "Programación Orientada a Objetos",
                3
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0560",
                "Bases de Datos I",
                2,
                "1512",
                "Bases de Datos I",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0707",
                "Fundamentos de Redes",
                1,
                "1513",
                "Fundamentos de Redes",
                1
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0558",
                "Programación I",
                3,
                "1514",
                "Programación I",
                3
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1646",
                "Bases de Datos II",
                3,
                "1515",
                "Bases de Datos II",
                3
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0564",
                "Sistemas Operativos",
                2,
                "1516",
                "Sistemas Operativos",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1647",
                "Ingeniería de Software I",
                3,
                "1517",
                "Ingeniería de Software I",
                3
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0563",
                "Programación II",
                3,
                "1519",
                "Programación II",
                3
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0548",
                "Seguridad Informática",
                1,
                "1522",
                "Seguridad Informática",
                1
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0559",
                "Legislación Informática",
                1,
                "1526",
                "Legislación Informática",
                1
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1418",
                "Diseño de Algoritmos II",
                2,
                "1520",
                "Diseño de Algoritmos II",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1341",
                "Bases de Datos III",
                1,
                "1525",
                "Bases de Datos III",
                1
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1342",
                "Soporte y Mantenimiento",
                2,
                "1521",
                "Soporte y Mantenimiento",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1346",
                "Ingeniería de Software II",
                2,
                "1523",
                "Ingeniería de Software II",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1338",
                "Aplicaciones I",
                4,
                "1524",
                "Aplicaciones I",
                4
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1420",
                "Calidad del Software",
                2,
                "1527",
                "Calidad del Software",
                2
            ),
            CreateEq(rule351To372.Id, "351C", "372V", "0787", "Inglés I", 2, "1445", "Inglés I", 2),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0789",
                "Inglés II",
                2,
                "1454",
                "Inglés II",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "0793",
                "Inglés III",
                2,
                "1461",
                "Inglés III",
                2
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1305",
                "Plan de Vida",
                1,
                "1446",
                "Plan de Vida",
                1
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1308",
                "Orientación a la Empleabilidad",
                1,
                "1455",
                "Orientación a la Empleabilidad",
                1
            ),
            CreateEq(
                rule351To372.Id,
                "351C",
                "372V",
                "1313",
                "Orientación al Emprendimiento",
                1,
                "1462",
                "Orientación al Emprendimiento",
                1
            ),
        };

        await _db.SubjectEquivalences.AddRangeAsync(equivalences351To372, ct);

        // ── Regla 372V → 351C ────────────────────────────────────────────
        // DSAM Virtual → DSAM Presencial (inversa — mismas equivalencias)
        var rule372To351 = HomologationRule.Create(
            sourceProgramCode: "372V",
            targetProgramCode: "351C",
            minGrade: 3.0m,
            maxCreditsPercentage: 70,
            requiresSameArea: true,
            createdByAzureOid: SeedCoordinatorOid
        );

        await _db.HomologationRules.AddAsync(rule372To351, ct);
        await _db.SaveChangesAsync(ct);

        // Equivalencias inversas (mismas materias, códigos invertidos)
        var equivalences372To351 = equivalences351To372
            .Select(e =>
                CreateEq(
                    rule372To351.Id,
                    "372V",
                    "351C",
                    e.TargetSubjectCode,
                    e.TargetSubjectName,
                    e.TargetCredits,
                    e.SourceSubjectCode,
                    e.SourceSubjectName,
                    e.SourceCredits
                )
            )
            .ToList();

        await _db.SubjectEquivalences.AddRangeAsync(equivalences372To351, ct);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Seed completado: 2 reglas, {Count} equivalencias.",
            equivalences351To372.Count * 2
        );
    }

    private static SubjectEquivalence CreateEq(
        Guid ruleId,
        string srcProgram,
        string tgtProgram,
        string srcCode,
        string srcName,
        int srcCredits,
        string tgtCode,
        string tgtName,
        int tgtCredits
    )
    {
        return SubjectEquivalence.Create(
            homologationRuleId: ruleId,
            sourceProgramCode: srcProgram,
            targetProgramCode: tgtProgram,
            sourceSubjectCode: srcCode,
            sourceSubjectName: srcName,
            sourceCredits: srcCredits,
            targetSubjectCode: tgtCode,
            targetSubjectName: tgtName,
            targetCredits: tgtCredits,
            createdByAzureOid: SeedCoordinatorOid
        );
    }
}

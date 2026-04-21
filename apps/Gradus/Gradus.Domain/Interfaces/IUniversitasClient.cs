namespace Gradus.Domain.Interfaces;

/// <summary>
/// Contrato para la comunicación M2M con Universitas (portal académico).
/// La implementación vive en Infrastructure — el Domain solo conoce el contrato.
/// </summary>
public interface IUniversitasClient
{
    /// <summary>
    /// Obtiene el perfil del estudiante incluyendo su programa actual.
    /// </summary>
    Task<StudentProfileDto?> GetStudentProfileAsync(
        string identity,
        CancellationToken ct = default
    );

    /// <summary>
    /// Obtiene el historial completo de materias cursadas por el estudiante.
    /// </summary>
    Task<StudentHistoryDto?> GetStudentHistoryAsync(
        string identity,
        CancellationToken ct = default
    );

    /// <summary>
    /// Obtiene el progreso académico del estudiante.
    /// </summary>
    Task<StudentProgressDto?> GetStudentProgressAsync(
        string identity,
        CancellationToken ct = default
    );
}

// DTOs de respuesta de Universitas
// (aquí en Domain porque son contratos de la interfaz)

public record StudentProfileDto(
    string Identity,
    string FirstName,
    string LastName,
    string Email,
    string StudentCode,
    string Campus,
    string Status,
    ProgramDto Program,
    PensumDto Pensum,
    InstitutionDto Institution
);

public record StudentHistoryDto(
    string Identity,
    int TotalSubjects,
    IReadOnlyList<SubjectRecordDto> Subjects
);

public record StudentProgressDto(
    string Identity,
    int CreditsEarned,
    int TotalCredits,
    double ProgressPercentage,
    SubjectCountsDto Subjects,
    string? ActiveTerm
);

public record ProgramDto(string Code, string Name, string Mode);

public record PensumDto(string Code, int TotalCredits, int Periods);

public record InstitutionDto(string Name, string Nit);

public record SubjectCountsDto(int Passed, int InProgress, int Failed, int Withdrawn);

public record SubjectRecordDto(
    string Code,
    string Name,
    int Credits,
    string Area,
    int Period,
    string Term,
    string Status,
    decimal? FinalGrade
);

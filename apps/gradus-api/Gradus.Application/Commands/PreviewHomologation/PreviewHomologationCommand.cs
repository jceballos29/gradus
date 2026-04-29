using MediatR;

namespace Gradus.Application.Commands.PreviewHomologation;

/// <summary>
/// Genera una vista previa de homologación para el estudiante.
/// Evalúa su historial contra las reglas configuradas y retorna
/// qué materias se homologan y cuáles no.
/// </summary>
public record PreviewHomologationCommand(
    /// <summary>Identity del estudiante (Azure OID).</summary>
    string StudentAzureOid,
    /// <summary>Código del programa al que desea cambiarse.</summary>
    string TargetProgramCode
) : IRequest<PreviewHomologationResponse>;

// ── DTOs de respuesta ──────────────────────────────────────────────────────

public record PreviewHomologationResponse(
    Guid DraftRequestId,
    StudentSummary Student,
    ProgramSummary SourceProgram,
    ProgramSummary TargetProgram,
    RuleSummary Rule,
    IReadOnlyList<HomologableSubjectDto> HomologableSubjects,
    IReadOnlyList<RejectedSubjectDto> RejectedSubjects,
    HomologationMetrics Metrics
);

public record StudentSummary(
    string Identity,
    string AzureOid,
    string FullName,
    string StudentCode,
    string Campus
);

public record ProgramSummary(string Code, string Name, string Mode);

public record RuleSummary(decimal MinGrade, int MaxCreditsPercentage, bool RequiresSameArea);

public record HomologableSubjectDto(
    string SourceCode,
    string SourceName,
    decimal SourceGrade,
    int SourceCredits,
    string SourceArea,
    string TargetCode,
    string TargetName,
    int TargetCredits,
    bool AutoApproved
);

public record RejectedSubjectDto(
    string SourceCode,
    string SourceName,
    decimal? SourceGrade,
    int SourceCredits,
    string SourceArea,
    string RejectionReason,
    string RejectionReasonDescription
);

public record HomologationMetrics(
    int TotalSubjectsInHistory,
    int TotalSubjectsEvaluated,
    int TotalHomologable,
    int TotalRejected,
    int CreditsHomologable,
    int TotalTargetCredits,
    double HomologationPercentage
);

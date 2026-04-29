using Gradus.Domain.Enums;

namespace Gradus.Domain.Entities;

/// <summary>
/// Materia evaluada dentro de una solicitud de homologación.
/// Snapshot inmutable al momento de crear la solicitud.
/// </summary>
public class HomologationSubject
{
    public Guid Id { get; private set; }
    public Guid HomologationRequestId { get; private set; }

    // Snapshot de la materia origen (del historial del estudiante en Universitas)
    public string SourceSubjectCode { get; private set; } = string.Empty;
    public string SourceSubjectName { get; private set; } = string.Empty;
    public decimal SourceGrade { get; private set; }
    public int SourceCredits { get; private set; }
    public string SourceArea { get; private set; } = string.Empty;

    // Snapshot de la materia destino (del pensum del programa destino)
    public string TargetSubjectCode { get; private set; } = string.Empty;
    public string TargetSubjectName { get; private set; } = string.Empty;
    public int TargetCredits { get; private set; }

    // Resultado de la evaluación automática
    public bool IsHomologable { get; private set; }
    public RejectionReason? RejectionReason { get; private set; }

    // Excepción manual del coordinador
    public bool CoordinatorOverride { get; private set; }
    public bool AutoApproved { get; private set; }
    public string? CoordinatorNotes { get; private set; }
    public string? OverriddenByAzureOid { get; private set; }

    public DateTime CreatedAt { get; private set; }

    // Navegación
    public HomologationRequest HomologationRequest { get; private set; } = null!;

    private HomologationSubject() { }

    /// <summary>
    /// Crea una materia homologable (evaluación automática aprobada).
    /// </summary>
    public static HomologationSubject CreateApproved(
        Guid homologationRequestId,
        string sourceSubjectCode,
        string sourceSubjectName,
        decimal sourceGrade,
        int sourceCredits,
        string sourceArea,
        string targetSubjectCode,
        string targetSubjectName,
        int targetCredits
    )
    {
        return new HomologationSubject
        {
            Id = Guid.NewGuid(),
            HomologationRequestId = homologationRequestId,
            SourceSubjectCode = sourceSubjectCode,
            SourceSubjectName = sourceSubjectName,
            SourceGrade = sourceGrade,
            SourceCredits = sourceCredits,
            SourceArea = sourceArea,
            TargetSubjectCode = targetSubjectCode,
            TargetSubjectName = targetSubjectName,
            TargetCredits = targetCredits,
            IsHomologable = true,
            AutoApproved = true,
            CreatedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Crea una materia no homologable (evaluación automática rechazada).
    /// </summary>
    public static HomologationSubject CreateRejected(
        Guid homologationRequestId,
        string sourceSubjectCode,
        string sourceSubjectName,
        decimal sourceGrade,
        int sourceCredits,
        string sourceArea,
        string targetSubjectCode,
        string targetSubjectName,
        int targetCredits,
        RejectionReason reason
    )
    {
        return new HomologationSubject
        {
            Id = Guid.NewGuid(),
            HomologationRequestId = homologationRequestId,
            SourceSubjectCode = sourceSubjectCode,
            SourceSubjectName = sourceSubjectName,
            SourceGrade = sourceGrade,
            SourceCredits = sourceCredits,
            SourceArea = sourceArea,
            TargetSubjectCode = targetSubjectCode,
            TargetSubjectName = targetSubjectName,
            TargetCredits = targetCredits,
            IsHomologable = false,
            RejectionReason = reason,
            AutoApproved = false,
            CreatedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// El coordinador modifica el resultado de la evaluación automática.
    /// </summary>
    internal void ApplyCoordinatorOverride(
        bool isHomologable,
        string coordinatorAzureOid,
        string? notes = null
    )
    {
        IsHomologable = isHomologable;
        CoordinatorOverride = true;
        OverriddenByAzureOid = coordinatorAzureOid;
        CoordinatorNotes = notes;

        if (!isHomologable)
            RejectionReason = Enums.RejectionReason.CoordinatorOverride;
        else
            RejectionReason = null;
    }
}

namespace Gradus.Domain.Entities;

/// <summary>
/// Equivalencia específica entre dos asignaturas de programas distintos.
/// Configurada manualmente por el coordinador.
/// </summary>
public class SubjectEquivalence
{
    public Guid Id { get; private set; }

    public string SourceProgramCode { get; private set; } = string.Empty;
    public string TargetProgramCode { get; private set; } = string.Empty;

    // Materia origen (en el programa actual del estudiante)
    public string SourceSubjectCode { get; private set; } = string.Empty;
    public string SourceSubjectName { get; private set; } = string.Empty;
    public int SourceCredits { get; private set; }

    // Materia destino (en el programa al que desea cambiarse)
    public string TargetSubjectCode { get; private set; } = string.Empty;
    public string TargetSubjectName { get; private set; } = string.Empty;
    public int TargetCredits { get; private set; }

    /// <summary>
    /// Override de nota mínima específico para esta equivalencia.
    /// Si es null, se usa el MinGrade de HomologationRule.
    /// </summary>
    public decimal? MinGradeOverride { get; private set; }

    public bool Active { get; private set; }

    public string CreatedByAzureOid { get; private set; } = string.Empty;
    public string? UpdatedByAzureOid { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // Navegación
    public Guid HomologationRuleId { get; private set; }
    public HomologationRule HomologationRule { get; private set; } = null!;

    private SubjectEquivalence() { }

    public static SubjectEquivalence Create(
        Guid homologationRuleId,
        string sourceProgramCode,
        string targetProgramCode,
        string sourceSubjectCode,
        string sourceSubjectName,
        int sourceCredits,
        string targetSubjectCode,
        string targetSubjectName,
        int targetCredits,
        string createdByAzureOid,
        decimal? minGradeOverride = null
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceSubjectCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(targetSubjectCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(createdByAzureOid);

        if (minGradeOverride.HasValue && (minGradeOverride < 0 || minGradeOverride > 5))
            throw new ArgumentOutOfRangeException(nameof(minGradeOverride));

        return new SubjectEquivalence
        {
            Id = Guid.NewGuid(),
            HomologationRuleId = homologationRuleId,
            SourceProgramCode = sourceProgramCode.Trim().ToUpper(),
            TargetProgramCode = targetProgramCode.Trim().ToUpper(),
            SourceSubjectCode = sourceSubjectCode.Trim(),
            SourceSubjectName = sourceSubjectName.Trim(),
            SourceCredits = sourceCredits,
            TargetSubjectCode = targetSubjectCode.Trim(),
            TargetSubjectName = targetSubjectName.Trim(),
            TargetCredits = targetCredits,
            MinGradeOverride = minGradeOverride,
            Active = true,
            CreatedByAzureOid = createdByAzureOid,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public void Deactivate(string updatedByAzureOid)
    {
        Active = false;
        UpdatedByAzureOid = updatedByAzureOid;
        UpdatedAt = DateTime.UtcNow;
    }
}

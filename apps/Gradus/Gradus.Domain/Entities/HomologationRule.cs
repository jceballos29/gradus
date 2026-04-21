namespace Gradus.Domain.Entities;

/// <summary>
/// Regla global de homologación entre dos programas.
/// El coordinador configura una regla por cada par (origen → destino).
/// </summary>
public class HomologationRule
{
    public Guid Id { get; private set; }

    /// <summary>Código del programa origen (ej: "351C").</summary>
    public string SourceProgramCode { get; private set; } = string.Empty;

    /// <summary>Código del programa destino (ej: "372V").</summary>
    public string TargetProgramCode { get; private set; } = string.Empty;

    /// <summary>Nota mínima requerida (ej: 3.00).</summary>
    public decimal MinGrade { get; private set; }

    /// <summary>
    /// Porcentaje máximo de créditos del programa destino que se pueden homologar.
    /// Ej: 60 significa que no se puede homologar más del 60% de los créditos totales.
    /// </summary>
    public int MaxCreditsPercentage { get; private set; }

    /// <summary>
    /// Si true, la materia debe pertenecer al mismo área de formación
    /// (BASIC, SPECIFIC, COMPLEMENTARY) en ambos programas.
    /// </summary>
    public bool RequiresSameArea { get; private set; }

    /// <summary>Si false, no se pueden iniciar solicitudes con este par de programas.</summary>
    public bool Active { get; private set; }

    /// <summary>OID de Azure AD del coordinador que creó la regla.</summary>
    public string CreatedByAzureOid { get; private set; } = string.Empty;

    /// <summary>OID de Azure AD del coordinador que modificó la regla por última vez.</summary>
    public string? UpdatedByAzureOid { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // Navegación
    public IReadOnlyCollection<SubjectEquivalence> SubjectEquivalences =>
        _subjectEquivalences.AsReadOnly();
    private readonly List<SubjectEquivalence> _subjectEquivalences = [];

    // Constructor para EF Core
    private HomologationRule() { }

    public static HomologationRule Create(
        string sourceProgramCode,
        string targetProgramCode,
        decimal minGrade,
        int maxCreditsPercentage,
        bool requiresSameArea,
        string createdByAzureOid
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceProgramCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(targetProgramCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(createdByAzureOid);

        if (minGrade < 0 || minGrade > 5)
            throw new ArgumentOutOfRangeException(
                nameof(minGrade),
                "La nota mínima debe estar entre 0 y 5."
            );

        if (maxCreditsPercentage < 1 || maxCreditsPercentage > 100)
            throw new ArgumentOutOfRangeException(
                nameof(maxCreditsPercentage),
                "El porcentaje debe estar entre 1 y 100."
            );

        if (sourceProgramCode == targetProgramCode)
            throw new ArgumentException("El programa origen y destino no pueden ser iguales.");

        return new HomologationRule
        {
            Id = Guid.NewGuid(),
            SourceProgramCode = sourceProgramCode.Trim().ToUpper(),
            TargetProgramCode = targetProgramCode.Trim().ToUpper(),
            MinGrade = minGrade,
            MaxCreditsPercentage = maxCreditsPercentage,
            RequiresSameArea = requiresSameArea,
            Active = true,
            CreatedByAzureOid = createdByAzureOid,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public void Update(
        decimal minGrade,
        int maxCreditsPercentage,
        bool requiresSameArea,
        string updatedByAzureOid
    )
    {
        if (minGrade < 0 || minGrade > 5)
            throw new ArgumentOutOfRangeException(nameof(minGrade));

        if (maxCreditsPercentage < 1 || maxCreditsPercentage > 100)
            throw new ArgumentOutOfRangeException(nameof(maxCreditsPercentage));

        MinGrade = minGrade;
        MaxCreditsPercentage = maxCreditsPercentage;
        RequiresSameArea = requiresSameArea;
        UpdatedByAzureOid = updatedByAzureOid;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate(string updatedByAzureOid)
    {
        Active = false;
        UpdatedByAzureOid = updatedByAzureOid;
        UpdatedAt = DateTime.UtcNow;
    }
}

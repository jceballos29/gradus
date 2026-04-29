using Gradus.Domain.Enums;

namespace Gradus.Domain.Entities;

/// <summary>
/// Solicitud de homologación. Núcleo del sistema.
/// Una solicitud por estudiante por cambio de programa.
/// </summary>
public class HomologationRequest
{
    public Guid Id { get; private set; }

    // Datos del estudiante (desnormalizados al crear — snapshot)
    public string StudentIdentity { get; private set; } = string.Empty;
    public string StudentAzureOid { get; private set; } = string.Empty;
    public string StudentName { get; private set; } = string.Empty;
    public string StudentCode { get; private set; } = string.Empty;

    // Programas involucrados (desnormalizados — snapshot)
    public string SourceProgramCode { get; private set; } = string.Empty;
    public string SourceProgramName { get; private set; } = string.Empty;
    public string TargetProgramCode { get; private set; } = string.Empty;
    public string TargetProgramName { get; private set; } = string.Empty;

    // Estado y métricas
    public HomologationStatus Status { get; private set; }
    public int TotalSubjectsEvaluated { get; private set; }
    public int TotalSubjectsApproved { get; private set; }
    public int TotalCreditsHomologated { get; private set; }

    // Observaciones
    public string? StudentNotes { get; private set; }
    public string? CoordinatorNotes { get; private set; }

    // Resolución por coordinador
    public string? ReviewedByAzureOid { get; private set; }
    public DateTime? ReviewedAt { get; private set; }

    // Documento generado
    public string? DocumentUrl { get; private set; }
    public DateTime? DocumentGeneratedAt { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // Navegación
    public IReadOnlyCollection<HomologationSubject> Subjects => _subjects.AsReadOnly();
    private readonly List<HomologationSubject> _subjects = [];

    private HomologationRequest() { }

    /// <summary>
    /// Crea una nueva solicitud en estado Draft.
    /// Se llama cuando el estudiante genera la vista previa.
    /// </summary>
    public static HomologationRequest CreateDraft(
        string studentIdentity,
        string studentAzureOid,
        string studentName,
        string studentCode,
        string sourceProgramCode,
        string sourceProgramName,
        string targetProgramCode,
        string targetProgramName
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(studentIdentity);
        ArgumentException.ThrowIfNullOrWhiteSpace(studentAzureOid);
        ArgumentException.ThrowIfNullOrWhiteSpace(studentName);
        ArgumentException.ThrowIfNullOrWhiteSpace(studentCode);

        return new HomologationRequest
        {
            Id = Guid.NewGuid(),
            StudentIdentity = studentIdentity,
            StudentAzureOid = studentAzureOid,
            StudentName = studentName,
            StudentCode = studentCode,
            SourceProgramCode = sourceProgramCode.Trim().ToUpper(),
            SourceProgramName = sourceProgramName.Trim(),
            TargetProgramCode = targetProgramCode.Trim().ToUpper(),
            TargetProgramName = targetProgramName.Trim(),
            Status = HomologationStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Agrega las materias evaluadas a la solicitud.
    /// Solo se puede hacer en estado Draft.
    /// </summary>
    public void AddSubjects(IEnumerable<HomologationSubject> subjects)
    {
        if (Status != HomologationStatus.Draft)
            throw new InvalidOperationException(
                "Solo se pueden agregar materias a una solicitud en estado Draft."
            );

        _subjects.AddRange(subjects);
        RecalculateMetrics();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// El estudiante acepta la vista previa y envía la solicitud al coordinador.
    /// </summary>
    public void Submit(string? studentNotes = null)
    {
        if (Status != HomologationStatus.Draft)
            throw new InvalidOperationException(
                "Solo se puede enviar una solicitud en estado Draft."
            );

        if (!_subjects.Any())
            throw new InvalidOperationException(
                "No se puede enviar una solicitud sin materias evaluadas."
            );

        Status = HomologationStatus.Pending;
        StudentNotes = studentNotes;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Un coordinador toma la solicitud para revisión.
    /// </summary>
    public void StartReview(string coordinatorAzureOid)
    {
        if (Status != HomologationStatus.Pending)
            throw new InvalidOperationException(
                "Solo se puede iniciar revisión en solicitudes Pending."
            );

        Status = HomologationStatus.Reviewing;
        ReviewedByAzureOid = coordinatorAzureOid;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Coordinador aprueba la solicitud con posibles excepciones manuales.
    /// </summary>
    public void Approve(string coordinatorAzureOid, string? notes = null)
    {
        if (Status != HomologationStatus.Reviewing)
            throw new InvalidOperationException(
                "Solo se puede aprobar una solicitud en estado Reviewing."
            );

        Status = HomologationStatus.Approved;
        ReviewedByAzureOid = coordinatorAzureOid;
        CoordinatorNotes = notes;
        ReviewedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        RecalculateMetrics();
    }

    /// <summary>
    /// Coordinador rechaza la solicitud.
    /// </summary>
    public void Reject(string coordinatorAzureOid, string? notes = null)
    {
        if (Status != HomologationStatus.Reviewing)
            throw new InvalidOperationException(
                "Solo se puede rechazar una solicitud en estado Reviewing."
            );

        Status = HomologationStatus.Rejected;
        ReviewedByAzureOid = coordinatorAzureOid;
        CoordinatorNotes = notes;
        ReviewedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marca la solicitud como DocumentReady cuando el PDF fue generado.
    /// </summary>
    public void SetDocumentReady(string documentUrl)
    {
        if (Status != HomologationStatus.Approved)
            throw new InvalidOperationException(
                "Solo se puede generar documento para solicitudes Approved."
            );

        ArgumentException.ThrowIfNullOrWhiteSpace(documentUrl);

        Status = HomologationStatus.DocumentReady;
        DocumentUrl = documentUrl;
        DocumentGeneratedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// El coordinador puede modificar el resultado de una materia específica.
    /// </summary>
    public void OverrideSubject(
        Guid subjectId,
        bool isHomologable,
        string coordinatorAzureOid,
        string? notes = null
    )
    {
        if (Status != HomologationStatus.Reviewing)
            throw new InvalidOperationException(
                "Solo se pueden modificar materias durante la revisión."
            );

        var subject =
            _subjects.FirstOrDefault(s => s.Id == subjectId)
            ?? throw new InvalidOperationException(
                $"Materia {subjectId} no encontrada en esta solicitud."
            );

        subject.ApplyCoordinatorOverride(isHomologable, coordinatorAzureOid, notes);
        RecalculateMetrics();
        UpdatedAt = DateTime.UtcNow;
    }

    private void RecalculateMetrics()
    {
        var approved = _subjects.Where(s => s.IsHomologable).ToList();
        TotalSubjectsEvaluated = _subjects.Count;
        TotalSubjectsApproved = approved.Count;
        TotalCreditsHomologated = approved.Sum(s => s.SourceCredits);
    }
}

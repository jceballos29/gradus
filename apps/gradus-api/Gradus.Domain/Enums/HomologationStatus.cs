namespace Gradus.Domain.Enums;

/// <summary>
/// Estado del ciclo de vida de una solicitud de homologación.
/// </summary>
public enum HomologationStatus
{
    /// <summary>Vista previa generada. El estudiante aún no ha enviado.</summary>
    Draft,

    /// <summary>Estudiante envió la solicitud. Esperando coordinador.</summary>
    Pending,

    /// <summary>Un coordinador está revisando activamente.</summary>
    Reviewing,

    /// <summary>Coordinador aprobó la homologación.</summary>
    Approved,

    /// <summary>Coordinador rechazó la solicitud.</summary>
    Rejected,

    /// <summary>PDF legal generado y disponible para descarga.</summary>
    DocumentReady,
}

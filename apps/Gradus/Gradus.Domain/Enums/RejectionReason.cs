namespace Gradus.Domain.Enums;

/// <summary>
/// Razón por la que una materia específica no es homologable automáticamente.
/// </summary>
public enum RejectionReason
{
    /// <summary>No existe equivalencia configurada para esta materia.</summary>
    NoEquivalenceDefined,

    /// <summary>La nota obtenida es menor a la nota mínima requerida.</summary>
    GradeTooLow,

    /// <summary>
    /// La materia pertenece a un área diferente y la regla requiere misma área.
    /// </summary>
    DifferentArea,

    /// <summary>
    /// Incluir esta materia superaría el porcentaje máximo de créditos homologables.
    /// </summary>
    ExceedsMaxCreditsPercentage,

    /// <summary>Excepción manual del coordinador — rechazó aunque cumplía las reglas.</summary>
    CoordinatorOverride,
}

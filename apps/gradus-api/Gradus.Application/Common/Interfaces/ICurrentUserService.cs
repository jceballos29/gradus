namespace Gradus.Application.Common.Interfaces;

/// <summary>
/// Provee información del usuario autenticado extraída del JWT.
/// Implementado en la capa API para acceder al HttpContext.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>
    /// OID del usuario en Azure AD (claim "oid" del access token).
    /// </summary>
    string AzureOid { get; }

    /// <summary>
    /// Indica si el usuario tiene el rol "coordinador".
    /// </summary>
    bool IsCoordinator { get; }

    /// <summary>
    /// Indica si el usuario tiene el rol "estudiante".
    /// </summary>
    bool IsStudent { get; }
}

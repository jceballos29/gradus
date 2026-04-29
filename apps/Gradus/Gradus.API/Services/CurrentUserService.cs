using System.Security.Claims;
using Gradus.Application.Common.Interfaces;

namespace Gradus.API.Services;

/// <summary>
/// Extrae la identidad del usuario autenticado desde el JWT de Azure AD.
/// Los claims que usa Azure AD v2.0 son "oid" para el Object ID y "roles" para los roles.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    /// <inheritdoc/>
    public string AzureOid =>
        // Azure AD v2.0 envía el OID en el claim "oid"
        User?.FindFirstValue("oid")
        // Fallback al claim largo (tokens v1 o con mapeo activado)
        ?? User?.FindFirstValue("http://schemas.microsoft.com/identity/claims/objectidentifier")
        ?? throw new UnauthorizedAccessException(
            "No se pudo obtener el OID del token. Verifica que el token incluya el claim 'oid'."
        );

    /// <inheritdoc/>
    public bool IsCoordinator => User?.IsInRole("coordinador") ?? false;

    /// <inheritdoc/>
    public bool IsStudent => User?.IsInRole("estudiante") ?? false;
}

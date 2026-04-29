namespace Gradus.Infrastructure.Configuration;

/// <summary>
/// Configuración para la comunicación M2M con Universitas.
/// Se inyecta via IOptions<UniversitasOptions>.
/// </summary>
public class UniversitasOptions
{
    public const string SectionName = "Universitas";

    /// <summary>URL base de universitas-ui (ej: http://localhost:3003)</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Tenant ID de Azure AD</summary>
    public string TenantId { get; set; } = string.Empty;

    /// <summary>Client ID de gradus-api en Azure AD</summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>Client Secret de gradus-api en Azure AD</summary>
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Scope M2M — el que configuramos en T-005:
    /// api://47ab77cc-9160-45a5-b4a0-dc52623cc325/.default
    /// </summary>
    public string Scope { get; set; } = string.Empty;

    /// <summary>
    /// Segundos antes del vencimiento en que se renueva el token.
    /// Por defecto 60s — si el token vence en 1h, se renueva con 59m de vida.
    /// </summary>
    public int TokenExpiryBufferSeconds { get; set; } = 60;
}

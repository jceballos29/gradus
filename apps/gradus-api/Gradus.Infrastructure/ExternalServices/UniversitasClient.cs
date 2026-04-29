using System.Net.Http.Json;
using System.Text.Json;
using Gradus.Domain.Interfaces;
using Gradus.Infrastructure.Configuration;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Gradus.Infrastructure.ExternalServices;

public class UniversitasClient : IUniversitasClient
{
    private readonly HttpClient _httpClient;
    private readonly IDistributedCache _cache;
    private readonly UniversitasOptions _options;
    private readonly ILogger<UniversitasClient> _logger;

    private const string TokenCacheKey = "gradus:m2m:universitas_token";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public UniversitasClient(
        HttpClient httpClient,
        IDistributedCache cache,
        IOptions<UniversitasOptions> options,
        ILogger<UniversitasClient> logger
    )
    {
        _httpClient = httpClient;
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    // ── API pública ────────────────────────────────────────────────────

    public async Task<StudentProfileDto?> GetStudentProfileAsync(
        string identity,
        CancellationToken ct = default
    )
    {
        return await GetAsync<StudentProfileDto>($"/api/m2m/students/{identity}", identity, ct);
    }

    public async Task<StudentHistoryDto?> GetStudentHistoryAsync(
        string identity,
        CancellationToken ct = default
    )
    {
        return await GetAsync<StudentHistoryDto>(
            $"/api/m2m/students/{identity}/history",
            identity,
            ct
        );
    }

    public async Task<StudentProgressDto?> GetStudentProgressAsync(
        string identity,
        CancellationToken ct = default
    )
    {
        return await GetAsync<StudentProgressDto>(
            $"/api/m2m/students/{identity}/progress",
            identity,
            ct
        );
    }

    // ── Implementación interna ─────────────────────────────────────────

    private async Task<T?> GetAsync<T>(string path, string identity, CancellationToken ct)
    {
        try
        {
            var token = await GetOrRefreshTokenAsync(ct);
            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.GetAsync(path, ct);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogWarning(
                    "Universitas: recurso no encontrado para identity={Identity} path={Path}",
                    identity,
                    path
                );
                return default;
            }

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<T>(JsonOptions, ct);
            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(
                ex,
                "Error HTTP al consultar Universitas. Path={Path} Identity={Identity}",
                path,
                identity
            );
            throw new UniversitasClientException(
                $"No se pudo conectar con Universitas: {ex.Message}",
                ex
            );
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogError(ex, "Timeout al consultar Universitas. Path={Path}", path);
            throw new UniversitasClientException("Timeout al consultar Universitas.", ex);
        }
    }

    // ── Token M2M con caché Redis ──────────────────────────────────────

    private async Task<string> GetOrRefreshTokenAsync(CancellationToken ct)
    {
        // 1. Intentar obtener token cacheado
        var cached = await _cache.GetStringAsync(TokenCacheKey, ct);
        if (!string.IsNullOrEmpty(cached))
        {
            _logger.LogDebug("Token M2M obtenido desde caché Redis.");
            return cached;
        }

        // 2. No hay token en caché — pedir uno nuevo a Azure AD
        _logger.LogInformation("Token M2M no encontrado en caché. Solicitando a Azure AD...");
        var tokenResponse = await RequestNewTokenAsync(ct);

        // 3. Calcular TTL: tiempo de vida del token menos el buffer de seguridad
        var ttl = TimeSpan.FromSeconds(tokenResponse.ExpiresIn - _options.TokenExpiryBufferSeconds);

        if (ttl <= TimeSpan.Zero)
        {
            _logger.LogWarning(
                "El token M2M tiene un TTL inválido ({ExpiresIn}s). " + "Usando sin cachear.",
                tokenResponse.ExpiresIn
            );
            return tokenResponse.AccessToken;
        }

        // 4. Guardar en Redis con TTL
        await _cache.SetStringAsync(
            TokenCacheKey,
            tokenResponse.AccessToken,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
            ct
        );

        _logger.LogInformation("Token M2M cacheado en Redis por {Ttl} segundos.", ttl.TotalSeconds);

        return tokenResponse.AccessToken;
    }

    private async Task<M2MTokenResponse> RequestNewTokenAsync(CancellationToken ct)
    {
        var tokenEndpoint =
            $"https://login.microsoftonline.com/{_options.TenantId}/oauth2/v2.0/token";

        var body = new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = _options.ClientId,
                ["client_secret"] = _options.ClientSecret,
                ["scope"] = _options.Scope,
            }
        );

        // Usar un HttpClient genérico para el token — no el de Universitas
        using var tokenClient = new HttpClient();
        var response = await tokenClient.PostAsync(tokenEndpoint, body, ct);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Error al obtener token M2M de Azure AD. Status={Status} Body={Body}",
                response.StatusCode,
                error
            );
            throw new UniversitasClientException(
                $"No se pudo obtener token M2M: {response.StatusCode}"
            );
        }

        var tokenResponse = await response.Content.ReadFromJsonAsync<M2MTokenResponse>(
            JsonOptions,
            ct
        );

        return tokenResponse
            ?? throw new UniversitasClientException("Respuesta de token vacía de Azure AD.");
    }

    // ── DTOs internos ──────────────────────────────────────────────────

    private sealed record M2MTokenResponse(
        [property: System.Text.Json.Serialization.JsonPropertyName("access_token")]
            string AccessToken,
        [property: System.Text.Json.Serialization.JsonPropertyName("expires_in")] int ExpiresIn,
        [property: System.Text.Json.Serialization.JsonPropertyName("token_type")] string TokenType
    );
}

/// <summary>
/// Excepción específica para errores de comunicación con Universitas.
/// Permite a los handlers distinguir entre errores de negocio y errores de infraestructura.
/// </summary>
public class UniversitasClientException : Exception
{
    public UniversitasClientException(string message)
        : base(message) { }

    public UniversitasClientException(string message, Exception inner)
        : base(message, inner) { }
}

using System.Net;
using System.Text.Json;
using FluentValidation;

namespace Gradus.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger
    )
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(
                "Validación fallida: {Errors}",
                string.Join(", ", ex.Errors.Select(e => e.ErrorMessage))
            );

            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Response.ContentType = "application/json";

            var errors = ex
                .Errors.GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(
                    new
                    {
                        type = "ValidationError",
                        title = "Datos inválidos",
                        status = 400,
                        errors,
                    }
                )
            );
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Acceso no autorizado: {Message}", ex.Message);

            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(
                    new
                    {
                        type = "Forbidden",
                        title = ex.Message,
                        status = 403,
                    }
                )
            );
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Regla de negocio violada: {Message}", ex.Message);

            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(
                    new
                    {
                        type = "BusinessRuleViolation",
                        title = ex.Message,
                        status = 409,
                    }
                )
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado");

            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(
                    new
                    {
                        type = "InternalServerError",
                        title = "Ocurrió un error interno. Por favor intenta de nuevo.",
                        status = 500,
                    }
                )
            );
        }
    }
}

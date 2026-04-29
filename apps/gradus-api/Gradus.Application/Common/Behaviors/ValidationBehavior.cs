using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Gradus.Application.Common.Behaviors;

/// <summary>
/// Pipeline behavior de MediatR que ejecuta FluentValidation
/// antes de cada handler. Si hay errores de validación, lanza
/// ValidationException antes de llegar al handler.
/// </summary>
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;
    private readonly ILogger<ValidationBehavior<TRequest, TResponse>> _logger;

    public ValidationBehavior(
        IEnumerable<IValidator<TRequest>> validators,
        ILogger<ValidationBehavior<TRequest, TResponse>> logger
    )
    {
        _validators = validators;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken
    )
    {
        if (!_validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);

        var failures = _validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Any())
        {
            _logger.LogWarning(
                "Validación fallida para {Request}: {Errors}",
                typeof(TRequest).Name,
                string.Join(", ", failures.Select(f => f.ErrorMessage))
            );

            throw new ValidationException(failures);
        }

        return await next();
    }
}

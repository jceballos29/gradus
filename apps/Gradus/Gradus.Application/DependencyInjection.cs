using FluentValidation;
using Gradus.Application.Common.Behaviors;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Gradus.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services,
        string? mediatRLicense = null
    )
    {
        var assembly = typeof(DependencyInjection).Assembly;

        // MediatR — registra todos los handlers del assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            if (!string.IsNullOrWhiteSpace(mediatRLicense))
            {
                cfg.LicenseKey = mediatRLicense;
            }
            // Pipeline: validación antes de cada handler
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        // FluentValidation — registra todos los validators del assembly
        services.AddValidatorsFromAssembly(assembly);

        return services;
    }
}

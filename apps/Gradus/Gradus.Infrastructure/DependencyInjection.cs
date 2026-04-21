using Gradus.Domain.Interfaces;
using Gradus.Infrastructure.Persistence;
using Gradus.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Gradus.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // ── EF Core + PostgreSQL ─────────────────────────────────────────
        services.AddDbContext<GradusDbContext>(options =>
        {
            options.UseNpgsql(
                configuration.GetConnectionString("GradusDb"),
                npgsql =>
                {
                    npgsql.MigrationsHistoryTable("__ef_migrations_history", "public");
                    npgsql.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorCodesToAdd: null
                    );
                }
            );

            // En desarrollo, loguear queries SQL
#if DEBUG
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
#endif
        });

        // ── Repositorios ─────────────────────────────────────────────────
        services.AddScoped<IHomologationRepository, HomologationRepository>();
        services.AddScoped<IEquivalenceRepository, EquivalenceRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();

        // ── Seeder ───────────────────────────────────────────────────────
        services.AddScoped<DataSeeder>();

        return services;
    }
}

using Gradus.Domain.Interfaces;
using Gradus.Infrastructure.Configuration;
using Gradus.Infrastructure.ExternalServices;
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

        // ── Redis ────────────────────────────────────────────────────────
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
            options.InstanceName = "gradus:";
        });

        // ── Universitas Client (M2M) ──────────────────────────────────────
        services.Configure<UniversitasOptions>(
            configuration.GetSection(UniversitasOptions.SectionName)
        );

        services
            .AddHttpClient<IUniversitasClient, UniversitasClient>(
                (sp, client) =>
                {
                    var options =
                        sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<UniversitasOptions>>().Value;
                    client.BaseAddress = new Uri(options.BaseUrl);
                    client.Timeout = TimeSpan.FromSeconds(10);
                }
            )
            .AddStandardResilienceHandler(); // Polly: reintentos automáticos

        return services;
    }
}

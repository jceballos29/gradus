using Gradus.Domain.Entities;
using Gradus.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Gradus.Infrastructure.Persistence;

public class GradusDbContext : DbContext
{
    public GradusDbContext(DbContextOptions<GradusDbContext> options)
        : base(options) { }

    public DbSet<HomologationRule> HomologationRules => Set<HomologationRule>();
    public DbSet<SubjectEquivalence> SubjectEquivalences => Set<SubjectEquivalence>();
    public DbSet<HomologationRequest> HomologationRequests => Set<HomologationRequest>();
    public DbSet<HomologationSubject> HomologationSubjects => Set<HomologationSubject>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Aplica todas las configuraciones del assembly automáticamente
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GradusDbContext).Assembly);

        // Convierte todos los enums a string en la DB (legible y estable)
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType.IsEnum)
                {
                    var converterType = typeof(EnumToStringConverter<>).MakeGenericType(
                        property.ClrType
                    );
                    var converter = (ValueConverter)Activator.CreateInstance(converterType)!;
                    property.SetValueConverter(converter);
                }
            }
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Snake_case automático para todas las tablas y columnas
        configurationBuilder.Conventions.Add(_ => new SnakeCaseNamingConvention());
    }
}

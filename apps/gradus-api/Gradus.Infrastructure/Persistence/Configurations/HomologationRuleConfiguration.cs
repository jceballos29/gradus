using Gradus.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gradus.Infrastructure.Persistence.Configurations;

public class HomologationRuleConfiguration : IEntityTypeConfiguration<HomologationRule>
{
    public void Configure(EntityTypeBuilder<HomologationRule> builder)
    {
        builder.ToTable("homologation_rules");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.SourceProgramCode).IsRequired().HasMaxLength(20);

        builder.Property(r => r.TargetProgramCode).IsRequired().HasMaxLength(20);

        builder.Property(r => r.MinGrade).IsRequired().HasPrecision(4, 2);

        builder.Property(r => r.MaxCreditsPercentage).IsRequired();

        builder.Property(r => r.RequiresSameArea).IsRequired();

        builder.Property(r => r.Active).IsRequired().HasDefaultValue(true);

        builder.Property(r => r.CreatedByAzureOid).IsRequired().HasMaxLength(50);

        builder.Property(r => r.UpdatedByAzureOid).HasMaxLength(50);

        builder.Property(r => r.CreatedAt).IsRequired().HasColumnType("timestamptz");

        builder.Property(r => r.UpdatedAt).IsRequired().HasColumnType("timestamptz");

        // Un solo par (origen, destino) por regla
        builder
            .HasIndex(r => new { r.SourceProgramCode, r.TargetProgramCode })
            .IsUnique()
            .HasDatabaseName("ix_homologation_rules_program_pair");

        builder.HasIndex(r => r.Active).HasDatabaseName("ix_homologation_rules_active");

        // Relación con equivalencias
        builder
            .HasMany(r => r.SubjectEquivalences)
            .WithOne(e => e.HomologationRule)
            .HasForeignKey(e => e.HomologationRuleId)
            .OnDelete(DeleteBehavior.Cascade);

        // Acceso a campos privados
        builder
            .Navigation(r => r.SubjectEquivalences)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

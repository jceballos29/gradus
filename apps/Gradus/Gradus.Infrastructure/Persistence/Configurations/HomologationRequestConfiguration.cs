using Gradus.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gradus.Infrastructure.Persistence.Configurations;

public class HomologationRequestConfiguration : IEntityTypeConfiguration<HomologationRequest>
{
    public void Configure(EntityTypeBuilder<HomologationRequest> builder)
    {
        builder.ToTable("homologation_requests");

        builder.HasKey(r => r.Id);

        // Datos del estudiante (snapshot)
        builder.Property(r => r.StudentIdentity).IsRequired().HasMaxLength(50);
        builder.Property(r => r.StudentAzureOid).IsRequired().HasMaxLength(50);
        builder.Property(r => r.StudentName).IsRequired().HasMaxLength(200);
        builder.Property(r => r.StudentCode).IsRequired().HasMaxLength(20);

        // Programas (snapshot)
        builder.Property(r => r.SourceProgramCode).IsRequired().HasMaxLength(20);
        builder.Property(r => r.SourceProgramName).IsRequired().HasMaxLength(255);
        builder.Property(r => r.TargetProgramCode).IsRequired().HasMaxLength(20);
        builder.Property(r => r.TargetProgramName).IsRequired().HasMaxLength(255);

        // Estado
        builder.Property(r => r.Status).IsRequired().HasMaxLength(50);

        // Métricas
        builder.Property(r => r.TotalSubjectsEvaluated).IsRequired().HasDefaultValue(0);
        builder.Property(r => r.TotalSubjectsApproved).IsRequired().HasDefaultValue(0);
        builder.Property(r => r.TotalCreditsHomologated).IsRequired().HasDefaultValue(0);

        // Observaciones
        builder.Property(r => r.StudentNotes).HasColumnType("text");
        builder.Property(r => r.CoordinatorNotes).HasColumnType("text");

        // Resolución
        builder.Property(r => r.ReviewedByAzureOid).HasMaxLength(50);
        builder.Property(r => r.ReviewedAt).HasColumnType("timestamptz");

        // Documento
        builder.Property(r => r.DocumentUrl).HasColumnType("text");
        builder.Property(r => r.DocumentGeneratedAt).HasColumnType("timestamptz");

        builder.Property(r => r.CreatedAt).IsRequired().HasColumnType("timestamptz");
        builder.Property(r => r.UpdatedAt).IsRequired().HasColumnType("timestamptz");

        // Índices — hot paths
        builder
            .HasIndex(r => r.StudentIdentity)
            .HasDatabaseName("ix_homologation_requests_student_identity");

        builder.HasIndex(r => r.Status).HasDatabaseName("ix_homologation_requests_status");

        builder
            .HasIndex(r => new
            {
                r.StudentIdentity,
                r.SourceProgramCode,
                r.TargetProgramCode,
                r.Status,
            })
            .HasDatabaseName("ix_homologation_requests_active_check");

        builder.Property(r => r.CreatedAt).IsRequired().HasColumnType("timestamptz");

        // Relación con subjects
        builder
            .HasMany(r => r.Subjects)
            .WithOne(s => s.HomologationRequest)
            .HasForeignKey(s => s.HomologationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(r => r.Subjects).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

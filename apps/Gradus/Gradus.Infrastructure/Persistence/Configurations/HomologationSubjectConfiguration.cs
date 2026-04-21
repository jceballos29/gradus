using Gradus.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gradus.Infrastructure.Persistence.Configurations;

public class HomologationSubjectConfiguration : IEntityTypeConfiguration<HomologationSubject>
{
    public void Configure(EntityTypeBuilder<HomologationSubject> builder)
    {
        builder.ToTable("homologation_subjects");

        builder.HasKey(s => s.Id);

        // Snapshot origen
        builder.Property(s => s.SourceSubjectCode).IsRequired().HasMaxLength(20);
        builder.Property(s => s.SourceSubjectName).IsRequired().HasMaxLength(255);
        builder.Property(s => s.SourceGrade).IsRequired().HasPrecision(4, 2);
        builder.Property(s => s.SourceCredits).IsRequired();
        builder.Property(s => s.SourceArea).IsRequired().HasMaxLength(50);

        // Snapshot destino
        builder.Property(s => s.TargetSubjectCode).IsRequired().HasMaxLength(20);
        builder.Property(s => s.TargetSubjectName).IsRequired().HasMaxLength(255);
        builder.Property(s => s.TargetCredits).IsRequired();

        // Resultado
        builder.Property(s => s.IsHomologable).IsRequired();
        builder.Property(s => s.RejectionReason).HasMaxLength(50);
        builder.Property(s => s.AutoApproved).IsRequired().HasDefaultValue(false);
        builder.Property(s => s.CoordinatorOverride).IsRequired().HasDefaultValue(false);
        builder.Property(s => s.CoordinatorNotes).HasColumnType("text");
        builder.Property(s => s.OverriddenByAzureOid).HasMaxLength(50);

        builder.Property(s => s.CreatedAt).IsRequired().HasColumnType("timestamptz");

        // Índices
        builder
            .HasIndex(s => s.HomologationRequestId)
            .HasDatabaseName("ix_homologation_subjects_request_id");

        builder
            .HasIndex(s => s.IsHomologable)
            .HasDatabaseName("ix_homologation_subjects_is_homologable");
    }
}

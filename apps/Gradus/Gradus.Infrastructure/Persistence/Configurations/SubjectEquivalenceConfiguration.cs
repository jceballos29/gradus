using Gradus.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gradus.Infrastructure.Persistence.Configurations;

public class SubjectEquivalenceConfiguration : IEntityTypeConfiguration<SubjectEquivalence>
{
    public void Configure(EntityTypeBuilder<SubjectEquivalence> builder)
    {
        builder.ToTable("subject_equivalences");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.SourceProgramCode).IsRequired().HasMaxLength(20);
        builder.Property(e => e.TargetProgramCode).IsRequired().HasMaxLength(20);

        builder.Property(e => e.SourceSubjectCode).IsRequired().HasMaxLength(20);
        builder.Property(e => e.SourceSubjectName).IsRequired().HasMaxLength(255);
        builder.Property(e => e.SourceCredits).IsRequired();

        builder.Property(e => e.TargetSubjectCode).IsRequired().HasMaxLength(20);
        builder.Property(e => e.TargetSubjectName).IsRequired().HasMaxLength(255);
        builder.Property(e => e.TargetCredits).IsRequired();

        builder.Property(e => e.MinGradeOverride).HasPrecision(4, 2);

        builder.Property(e => e.Active).IsRequired().HasDefaultValue(true);

        builder.Property(e => e.CreatedByAzureOid).IsRequired().HasMaxLength(50);
        builder.Property(e => e.UpdatedByAzureOid).HasMaxLength(50);

        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz");
        builder.Property(e => e.UpdatedAt).IsRequired().HasColumnType("timestamptz");

        // Índices
        builder
            .HasIndex(e => new { e.SourceProgramCode, e.TargetProgramCode })
            .HasDatabaseName("ix_subject_equivalences_program_pair");

        builder
            .HasIndex(e => e.SourceSubjectCode)
            .HasDatabaseName("ix_subject_equivalences_source_subject");
    }
}

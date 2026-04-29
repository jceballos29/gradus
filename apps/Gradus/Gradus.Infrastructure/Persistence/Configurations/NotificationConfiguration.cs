using Gradus.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gradus.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notifications");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.RecipientAzureOid).IsRequired().HasMaxLength(50);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(200);
        builder.Property(n => n.Message).IsRequired().HasColumnType("text");
        builder.Property(n => n.Type).IsRequired().HasMaxLength(50);
        builder.Property(n => n.ReferenceId);
        builder.Property(n => n.ReadAt).HasColumnType("timestamptz");
        builder.Property(n => n.CreatedAt).IsRequired().HasColumnType("timestamptz");

        // Hot path: notificaciones no leídas de un usuario
        builder
            .HasIndex(n => new { n.RecipientAzureOid, n.ReadAt })
            .HasDatabaseName("ix_notifications_recipient_unread");

        builder.HasIndex(n => n.CreatedAt).HasDatabaseName("ix_notifications_created_at");
    }
}

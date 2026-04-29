using Gradus.Domain.Enums;

namespace Gradus.Domain.Entities;

/// <summary>
/// Notificación in-app para estudiantes y coordinadores.
/// </summary>
public class Notification
{
    public Guid Id { get; private set; }

    /// <summary>OID de Azure AD del destinatario.</summary>
    public string RecipientAzureOid { get; private set; } = string.Empty;

    public string Title { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public NotificationType Type { get; private set; }

    /// <summary>ID de la HomologationRequest relacionada.</summary>
    public Guid? ReferenceId { get; private set; }

    /// <summary>null = no leída.</summary>
    public DateTime? ReadAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    private Notification() { }

    public static Notification Create(
        string recipientAzureOid,
        string title,
        string message,
        NotificationType type,
        Guid? referenceId = null
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(recipientAzureOid);
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(message);

        return new Notification
        {
            Id = Guid.NewGuid(),
            RecipientAzureOid = recipientAzureOid,
            Title = title.Trim(),
            Message = message.Trim(),
            Type = type,
            ReferenceId = referenceId,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void MarkAsRead()
    {
        if (ReadAt.HasValue)
            return;
        ReadAt = DateTime.UtcNow;
    }
}

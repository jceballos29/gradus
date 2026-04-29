using Gradus.Domain.Enums;

namespace Gradus.Application.Common.Interfaces;

/// <summary>
/// Envía notificaciones in-app y por email.
/// La implementación vive en Infrastructure.
/// </summary>
public interface INotificationService
{
    Task NotifyAsync(
        string recipientAzureOid,
        string title,
        string message,
        NotificationType type,
        Guid? referenceId = null,
        CancellationToken ct = default
    );
}

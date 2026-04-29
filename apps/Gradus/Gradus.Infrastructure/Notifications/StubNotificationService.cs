using Gradus.Application.Common.Interfaces;
using Gradus.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace Gradus.Infrastructure.Notifications;

/// <summary>
/// Implementación temporal — loguea las notificaciones.
/// Se reemplaza en T-208 con SignalR + email real.
/// </summary>
public class StubNotificationService : INotificationService
{
    private readonly ILogger<StubNotificationService> _logger;

    public StubNotificationService(ILogger<StubNotificationService> logger)
    {
        _logger = logger;
    }

    public Task NotifyAsync(
        string recipientAzureOid,
        string title,
        string message,
        NotificationType type,
        Guid? referenceId = null,
        CancellationToken ct = default
    )
    {
        _logger.LogInformation(
            "[STUB NOTIFICATION] To={Recipient} Type={Type} Title={Title}",
            recipientAzureOid,
            type,
            title
        );
        return Task.CompletedTask;
    }
}

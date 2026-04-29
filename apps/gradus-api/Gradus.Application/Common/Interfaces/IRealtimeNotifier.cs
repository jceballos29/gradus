namespace Gradus.Application.Common.Interfaces;

/// <summary>
/// Abstracción para envío de notificaciones en tiempo real.
/// La implementación usa SignalR pero el Application no lo sabe.
/// </summary>
public interface IRealtimeNotifier
{
    Task SendToUserAsync(
        string userAzureOid,
        string eventName,
        object payload,
        CancellationToken ct = default
    );
}

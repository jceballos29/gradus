using Gradus.API.Hubs;
using Gradus.Application.Common.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Gradus.API.Services;

public class SignalRNotifier : IRealtimeNotifier
{
    private readonly IHubContext<NotificationHub> _hub;

    public SignalRNotifier(IHubContext<NotificationHub> hub)
    {
        _hub = hub;
    }

    public async Task SendToUserAsync(
        string userAzureOid,
        string eventName,
        object payload,
        CancellationToken ct = default
    )
    {
        await _hub.Clients.Group(userAzureOid).SendAsync(eventName, payload, ct);
    }
}

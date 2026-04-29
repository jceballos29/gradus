using Microsoft.AspNetCore.SignalR;

namespace Gradus.API.Hubs;

/// <summary>
/// Hub de SignalR para notificaciones en tiempo real.
/// El cliente se conecta con su Azure OID como identificador de grupo.
/// </summary>
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// El cliente llama este método al conectarse para registrar su identidad.
    /// Esto permite enviarle notificaciones personalizadas.
    /// </summary>
    public async Task RegisterUser(string azureOid)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, azureOid);

        _logger.LogInformation(
            "Usuario {OID} registrado en SignalR. ConnectionId={ConnectionId}",
            azureOid,
            Context.ConnectionId
        );
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("Cliente conectado: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("Cliente desconectado: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}

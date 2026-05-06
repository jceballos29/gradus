using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Gradus.API.Hubs;

[Authorize]
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
    /// Los coordinadores también se unen al grupo 'coordinator-group' para
    /// recibir notificaciones de broadcast de nuevas solicitudes.
    /// </summary>
    public async Task RegisterUser(string azureOid)
    {
        // 1. Grupo personal del usuario (OID real)
        await Groups.AddToGroupAsync(Context.ConnectionId, azureOid);

        // 2. Si es coordinador, también añadir al grupo de broadcast
        if (Context.User?.IsInRole("coordinador") == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "coordinator-group");
            _logger.LogInformation(
                "Coordinador {OID} añadido al grupo 'coordinator-group'. ConnectionId={ConnectionId}",
                azureOid,
                Context.ConnectionId
            );
        }

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

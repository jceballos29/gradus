using Gradus.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gradus.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Produces("application/json")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationRepository _repository;

    public NotificationsController(INotificationRepository repository)
    {
        _repository = repository;
    }

    /// <summary>
    /// Retorna las notificaciones no leídas del usuario.
    /// </summary>
    [HttpGet("unread")]
    public async Task<IActionResult> GetUnread([FromQuery] string azureOid, CancellationToken ct)
    {
        var notifications = await _repository.GetUnreadByRecipientAsync(azureOid, ct);
        return Ok(
            notifications.Select(n => new
            {
                n.Id,
                n.Title,
                n.Message,
                Type = n.Type.ToString(),
                n.ReferenceId,
                n.CreatedAt,
                IsRead = n.ReadAt.HasValue,
            })
        );
    }

    /// <summary>
    /// Retorna todas las notificaciones del usuario paginadas.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string azureOid,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default
    )
    {
        var notifications = await _repository.GetAllByRecipientAsync(azureOid, page, pageSize, ct);

        return Ok(
            notifications.Select(n => new
            {
                n.Id,
                n.Title,
                n.Message,
                Type = n.Type.ToString(),
                n.ReferenceId,
                n.CreatedAt,
                IsRead = n.ReadAt.HasValue,
            })
        );
    }

    /// <summary>
    /// Marca una notificación como leída.
    /// </summary>
    [HttpPatch("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid notificationId, CancellationToken ct)
    {
        await _repository.MarkAsReadAsync(notificationId, ct);
        await _repository.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>
    /// Marca todas las notificaciones del usuario como leídas.
    /// </summary>
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead(
        [FromQuery] string azureOid,
        CancellationToken ct
    )
    {
        await _repository.MarkAllAsReadAsync(azureOid, ct);
        await _repository.SaveChangesAsync(ct);
        return NoContent();
    }
}

using Gradus.Application.Common.Interfaces;
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
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(
        INotificationRepository repository,
        ICurrentUserService currentUser
    )
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Retorna las notificaciones no leídas del usuario.
    /// Los coordinadores reciben las notificaciones del grupo 'coordinator-group'.
    /// </summary>
    [HttpGet("unread")]
    public async Task<IActionResult> GetUnread(CancellationToken ct)
    {
        var effectiveOid = _currentUser.IsCoordinator ? "coordinator-group" : _currentUser.AzureOid;
        var notifications = await _repository.GetUnreadByRecipientAsync(effectiveOid, ct);
        return Ok(notifications.Select(MapNotification));
    }

    /// <summary>
    /// Retorna todas las notificaciones del usuario paginadas.
    /// Los coordinadores reciben las notificaciones del grupo 'coordinator-group'.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default
    )
    {
        var effectiveOid = _currentUser.IsCoordinator ? "coordinator-group" : _currentUser.AzureOid;
        var notifications = await _repository.GetAllByRecipientAsync(
            effectiveOid,
            page,
            pageSize,
            ct
        );
        return Ok(notifications.Select(MapNotification));
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
    /// Los coordinadores marcan las del grupo 'coordinator-group'.
    /// </summary>
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken ct)
    {
        var effectiveOid = _currentUser.IsCoordinator ? "coordinator-group" : _currentUser.AzureOid;
        await _repository.MarkAllAsReadAsync(effectiveOid, ct);
        await _repository.SaveChangesAsync(ct);
        return NoContent();
    }

    private static object MapNotification(Domain.Entities.Notification n) =>
        new
        {
            n.Id,
            n.Title,
            n.Message,
            Type = n.Type.ToString(),
            n.ReferenceId,
            n.CreatedAt,
            IsRead = n.ReadAt.HasValue,
        };
}

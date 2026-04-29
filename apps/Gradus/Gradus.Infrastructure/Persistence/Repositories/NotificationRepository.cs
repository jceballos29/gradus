using Gradus.Domain.Entities;
using Gradus.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Gradus.Infrastructure.Persistence.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly GradusDbContext _db;

    public NotificationRepository(GradusDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Notification>> GetUnreadByRecipientAsync(
        string recipientAzureOid,
        CancellationToken ct = default
    )
    {
        return await _db
            .Notifications.Where(n => n.RecipientAzureOid == recipientAzureOid && n.ReadAt == null)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Notification>> GetAllByRecipientAsync(
        string recipientAzureOid,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default
    )
    {
        return await _db
            .Notifications.Where(n => n.RecipientAzureOid == recipientAzureOid)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Notification notification, CancellationToken ct = default)
    {
        await _db.Notifications.AddAsync(notification, ct);
    }

    public async Task MarkAsReadAsync(Guid notificationId, CancellationToken ct = default)
    {
        var notification = await _db.Notifications.FirstOrDefaultAsync(
            n => n.Id == notificationId,
            ct
        );

        notification?.MarkAsRead();
    }

    public async Task MarkAllAsReadAsync(string recipientAzureOid, CancellationToken ct = default)
    {
        var unread = await _db
            .Notifications.Where(n => n.RecipientAzureOid == recipientAzureOid && n.ReadAt == null)
            .ToListAsync(ct);

        foreach (var n in unread)
            n.MarkAsRead();
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _db.SaveChangesAsync(ct);
    }
}

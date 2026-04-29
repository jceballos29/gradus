using Gradus.Domain.Entities;

namespace Gradus.Domain.Interfaces;

public interface INotificationRepository
{
    Task<IReadOnlyList<Notification>> GetUnreadByRecipientAsync(
        string recipientAzureOid,
        CancellationToken ct = default
    );

    Task<IReadOnlyList<Notification>> GetAllByRecipientAsync(
        string recipientAzureOid,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default
    );

    Task AddAsync(Notification notification, CancellationToken ct = default);

    Task MarkAsReadAsync(Guid notificationId, CancellationToken ct = default);

    Task MarkAllAsReadAsync(string recipientAzureOid, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

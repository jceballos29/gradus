using Gradus.Application.Common.Interfaces;
using Gradus.Domain.Entities;
using Gradus.Domain.Enums;
using Gradus.Domain.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Gradus.Infrastructure.Notifications;

/// <summary>
/// Implementación real del servicio de notificaciones.
/// Persiste in-app en DB y envía via SignalR en tiempo real.
/// El email se delega a IEmailService.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly IRealtimeNotifier _realtimeNotifier;
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        INotificationRepository repository,
        IRealtimeNotifier realtimeNotifier,
        IEmailService emailService,
        ILogger<NotificationService> logger
    )
    {
        _repository = repository;
        _realtimeNotifier = realtimeNotifier;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task NotifyAsync(
        string recipientAzureOid,
        string title,
        string message,
        NotificationType type,
        Guid? referenceId = null,
        CancellationToken ct = default
    )
    {
        // 1. Persistir notificación in-app en DB
        var notification = Notification.Create(
            recipientAzureOid,
            title,
            message,
            type,
            referenceId
        );

        await _repository.AddAsync(notification, ct);
        await _repository.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Notificación persistida: Id={Id} Recipient={Recipient} Type={Type}",
            notification.Id,
            recipientAzureOid,
            type
        );

        // 2. Enviar via SignalR al cliente conectado (si está online)
        try
        {
            await _realtimeNotifier.SendToUserAsync(
                recipientAzureOid,
                "ReceiveNotification",
                new
                {
                    id = notification.Id,
                    title = notification.Title,
                    message = notification.Message,
                    type = notification.Type.ToString(),
                    referenceId = notification.ReferenceId,
                    createdAt = notification.CreatedAt,
                },
                ct
            );

            _logger.LogDebug("Notificación enviada via SignalR a {Recipient}", recipientAzureOid);
        }
        catch (Exception ex)
        {
            // SignalR no debe bloquear el flujo principal
            _logger.LogWarning(
                ex,
                "Error al enviar notificación SignalR a {Recipient}. "
                    + "La notificación quedó persistida en DB.",
                recipientAzureOid
            );
        }

        // 3. Email — solo para eventos importantes
        if (ShouldSendEmail(type))
        {
            try
            {
                await _emailService.SendAsync(
                    toEmail: $"{recipientAzureOid}@politecnicointernacionaldev.onmicrosoft.com",
                    toName: recipientAzureOid,
                    subject: title,
                    htmlBody: BuildEmailHtml(title, message, referenceId),
                    ct: ct
                );
            }
            catch (Exception ex)
            {
                // El email tampoco bloquea el flujo
                _logger.LogWarning(ex, "Error al enviar email a {Recipient}.", recipientAzureOid);
            }
        }
    }

    private static bool ShouldSendEmail(NotificationType type) =>
        type switch
        {
            NotificationType.HomologationApproved => true,
            NotificationType.HomologationRejected => true,
            NotificationType.DocumentReady => true,
            _ => false, // HomologationSubmitted y HomologationUnderReview solo in-app
        };

    private static string BuildEmailHtml(string title, string message, Guid? referenceId)
    {
        var referenceSection = referenceId.HasValue
            ? $"<p style='color:#666;font-size:12px'>ID de solicitud: {referenceId}</p>"
            : string.Empty;

        return $$"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; }
                    .header { background: #1a3a5c; padding: 24px; }
                    .header h1 { color: white; margin: 0; font-size: 18px; }
                    .header p { color: #a0b4c8; margin: 4px 0 0; font-size: 13px; }
                    .body { padding: 24px; }
                    .body h2 { color: #1a3a5c; font-size: 16px; }
                    .body p { color: #333; line-height: 1.6; }
                    .footer { background: #f0f4f8; padding: 16px 24px; font-size: 11px; color: #888; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>Politécnico Internacional</h1>
                        <p>Sistema de Homologación — Gradus</p>
                    </div>
                    <div class='body'>
                        <h2>{{title}}</h2>
                        <p>{{message}}</p>
                        {{referenceSection}}
                    </div>
                    <div class='footer'>
                        Este es un correo automático del sistema Gradus. No responder a este mensaje.
                    </div>
                </div>
            </body>
            </html>
            """;
    }
}

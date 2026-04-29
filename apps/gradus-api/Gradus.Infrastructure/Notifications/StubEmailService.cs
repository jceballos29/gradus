using Gradus.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Gradus.Infrastructure.Notifications;

/// <summary>
/// Email stub para desarrollo — loguea sin enviar.
/// En producción reemplazar por SendGridEmailService.
/// </summary>
public class StubEmailService : IEmailService
{
    private readonly ILogger<StubEmailService> _logger;

    public StubEmailService(ILogger<StubEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken ct = default
    )
    {
        _logger.LogInformation(
            "[STUB EMAIL] To={Email} Subject={Subject} | "
                + "(En producción esto enviaría un email real via SendGrid)",
            toEmail,
            subject
        );

        return Task.CompletedTask;
    }
}

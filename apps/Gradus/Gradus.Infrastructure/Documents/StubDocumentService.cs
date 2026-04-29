using Gradus.Application.Common.Interfaces;
using Gradus.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Gradus.Infrastructure.Documents;

/// <summary>
/// Implementación temporal — retorna una URL ficticia.
/// Se reemplaza en T-207 con QuestPDF real.
/// </summary>
public class StubDocumentService : IDocumentService
{
    private readonly ILogger<StubDocumentService> _logger;

    public StubDocumentService(ILogger<StubDocumentService> logger)
    {
        _logger = logger;
    }

    public Task<string> GenerateHomologationDocumentAsync(
        HomologationRequest request,
        CancellationToken ct = default
    )
    {
        _logger.LogInformation(
            "[STUB DOCUMENT] Generando documento para solicitud {Id}",
            request.Id
        );

        var url = $"/documents/homologation-{request.Id}.pdf";
        return Task.FromResult(url);
    }
}

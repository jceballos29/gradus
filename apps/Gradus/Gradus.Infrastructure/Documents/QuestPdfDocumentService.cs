using Gradus.Application.Common.Interfaces;
using Gradus.Domain.Entities;
using Gradus.Infrastructure.Documents.Pdf;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Gradus.Infrastructure.Documents;

public class QuestPdfDocumentService : IDocumentService
{
    private readonly ILogger<QuestPdfDocumentService> _logger;
    private readonly string _outputDirectory;

    public QuestPdfDocumentService(ILogger<QuestPdfDocumentService> logger)
    {
        _logger = logger;
        // En desarrollo: carpeta local. En producción: reemplazar por Azure Blob.
        _outputDirectory = Path.Combine(Directory.GetCurrentDirectory(), "documents");
        Directory.CreateDirectory(_outputDirectory);
    }

    public async Task<string> GenerateHomologationDocumentAsync(
        HomologationRequest request,
        CancellationToken ct = default
    )
    {
        _logger.LogInformation("Generando documento PDF para solicitud {Id}", request.Id);

        var fileName = $"homologacion-{request.Id}.pdf";
        var filePath = Path.Combine(_outputDirectory, fileName);

        var document = new HomologationDocument(request);
        document.GeneratePdf(filePath);

        _logger.LogInformation("Documento generado exitosamente: {Path}", filePath);

        // URL relativa para acceso via API — en prod sería una URL de Azure Blob
        var documentUrl = $"/documents/{fileName}";

        return await Task.FromResult(documentUrl);
    }
}

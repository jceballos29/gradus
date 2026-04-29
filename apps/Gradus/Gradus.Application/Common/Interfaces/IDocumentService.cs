using Gradus.Domain.Entities;

namespace Gradus.Application.Common.Interfaces;

/// <summary>
/// Genera el documento PDF legal de homologación.
/// La implementación vive en Infrastructure (QuestPDF).
/// </summary>
public interface IDocumentService
{
    /// <summary>
    /// Genera el PDF y retorna la ruta o URL donde fue guardado.
    /// </summary>
    Task<string> GenerateHomologationDocumentAsync(
        HomologationRequest request,
        CancellationToken ct = default
    );
}

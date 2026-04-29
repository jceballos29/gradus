using Gradus.Application.Common.Interfaces;
using Gradus.Domain.Enums;
using Gradus.Domain.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Gradus.Application.Commands.ReviewHomologation;

public class ReviewHomologationHandler
    : IRequestHandler<ReviewHomologationCommand, ReviewHomologationResponse>
{
    private readonly IHomologationRepository _requests;
    private readonly INotificationService _notifications;
    private readonly IDocumentService _documents;
    private readonly ILogger<ReviewHomologationHandler> _logger;

    public ReviewHomologationHandler(
        IHomologationRepository requests,
        INotificationService notifications,
        IDocumentService documents,
        ILogger<ReviewHomologationHandler> logger
    )
    {
        _requests = requests;
        _notifications = notifications;
        _documents = documents;
        _logger = logger;
    }

    public async Task<ReviewHomologationResponse> Handle(
        ReviewHomologationCommand command,
        CancellationToken cancellationToken
    )
    {
        var request =
            await _requests.GetByIdWithSubjectsAsync(command.RequestId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"No se encontró la solicitud {command.RequestId}."
            );

        // 1. Si es la primera acción del coordinador, tomar la solicitud
        if (request.Status == HomologationStatus.Pending)
        {
            request.StartReview(command.CoordinatorAzureOid);
            await _requests.UpdateAsync(request, cancellationToken);
            await _requests.SaveChangesAsync(cancellationToken);
        }

        // 2. Aplicar overrides manuales si el coordinador los envió
        if (command.SubjectOverrides?.Any() == true)
        {
            foreach (var @override in command.SubjectOverrides)
            {
                request.OverrideSubject(
                    @override.SubjectId,
                    @override.IsHomologable,
                    command.CoordinatorAzureOid,
                    @override.Notes
                );
            }
        }

        // 3. Aprobar o rechazar
        if (command.Approve)
        {
            request.Approve(command.CoordinatorAzureOid, command.CoordinatorNotes);
            await _requests.UpdateAsync(request, cancellationToken);
            await _requests.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Solicitud aprobada: Id={Id} por Coordinador={Coordinator}",
                request.Id,
                command.CoordinatorAzureOid
            );

            // 4. Generar PDF
            try
            {
                var documentUrl = await _documents.GenerateHomologationDocumentAsync(
                    request,
                    cancellationToken
                );

                request.SetDocumentReady(documentUrl);
                await _requests.UpdateAsync(request, cancellationToken);
                await _requests.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Documento generado: {Url}", documentUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error al generar el documento para solicitud {Id}. "
                        + "La solicitud quedó en estado Approved.",
                    request.Id
                );
                // No fallamos el flujo completo si el PDF falla
                // El coordinador puede regenerarlo manualmente
            }

            // 5. Notificar al estudiante
            await _notifications.NotifyAsync(
                recipientAzureOid: request.StudentAzureOid,
                title: "¡Solicitud de homologación aprobada!",
                message: $"Tu solicitud de homologación de "
                    + $"{request.SourceProgramCode} a {request.TargetProgramCode} "
                    + $"fue aprobada. {request.TotalSubjectsApproved} materias "
                    + $"homologadas ({request.TotalCreditsHomologated} créditos). "
                    + "El documento está disponible para descarga.",
                type: NotificationType.HomologationApproved,
                referenceId: request.Id,
                ct: cancellationToken
            );

            return new ReviewHomologationResponse(
                RequestId: request.Id,
                Status: request.Status.ToString(),
                Message: $"Solicitud aprobada. {request.TotalSubjectsApproved} materias "
                    + $"homologadas. Documento generado."
            );
        }
        else
        {
            request.Reject(command.CoordinatorAzureOid, command.CoordinatorNotes);
            await _requests.UpdateAsync(request, cancellationToken);
            await _requests.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Solicitud rechazada: Id={Id} por Coordinador={Coordinator}",
                request.Id,
                command.CoordinatorAzureOid
            );

            await _notifications.NotifyAsync(
                recipientAzureOid: request.StudentAzureOid,
                title: "Solicitud de homologación no aprobada",
                message: $"Tu solicitud de homologación fue revisada y no fue aprobada. "
                    + $"Observaciones del coordinador: {command.CoordinatorNotes}",
                type: NotificationType.HomologationRejected,
                referenceId: request.Id,
                ct: cancellationToken
            );

            return new ReviewHomologationResponse(
                RequestId: request.Id,
                Status: request.Status.ToString(),
                Message: "Solicitud rechazada."
            );
        }
    }
}

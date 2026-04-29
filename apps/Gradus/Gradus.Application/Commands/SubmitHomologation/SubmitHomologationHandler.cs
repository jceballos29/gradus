using Gradus.Application.Common.Interfaces;
using Gradus.Domain.Enums;
using Gradus.Domain.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Gradus.Application.Commands.SubmitHomologation;

public class SubmitHomologationHandler
    : IRequestHandler<SubmitHomologationCommand, SubmitHomologationResponse>
{
    private readonly IHomologationRepository _requests;
    private readonly INotificationService _notifications;
    private readonly ILogger<SubmitHomologationHandler> _logger;

    // OID del coordinador — en producción se buscaría dinámicamente
    // por ahora notificamos al coordinador seed
    private const string CoordinatorGroupOid = "coordinator-group";

    public SubmitHomologationHandler(
        IHomologationRepository requests,
        INotificationService notifications,
        ILogger<SubmitHomologationHandler> logger
    )
    {
        _requests = requests;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<SubmitHomologationResponse> Handle(
        SubmitHomologationCommand command,
        CancellationToken cancellationToken
    )
    {
        // 1. Cargar la solicitud con sus subjects
        var request =
            await _requests.GetByIdWithSubjectsAsync(command.DraftRequestId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"No se encontró la solicitud {command.DraftRequestId}."
            );

        // 2. Verificar que pertenece al estudiante que la envía
        if (
            !request.StudentAzureOid.Equals(
                command.StudentAzureOid,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new UnauthorizedAccessException(
                "Solo el estudiante que generó la solicitud puede enviarla."
            );
        }

        // 3. Transición de estado: Draft → Pending
        request.Submit(command.StudentNotes);

        await _requests.UpdateAsync(request, cancellationToken);
        await _requests.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Solicitud enviada: Id={Id} Estudiante={Student}",
            request.Id,
            request.StudentName
        );

        // 4. Notificar al coordinador
        await _notifications.NotifyAsync(
            recipientAzureOid: CoordinatorGroupOid,
            title: "Nueva solicitud de homologación",
            message: $"{request.StudentName} envió una solicitud de homologación "
                + $"de {request.SourceProgramCode} a {request.TargetProgramCode}. "
                + $"{request.TotalSubjectsApproved} materias homologables.",
            type: NotificationType.HomologationSubmitted,
            referenceId: request.Id,
            ct: cancellationToken
        );

        return new SubmitHomologationResponse(
            RequestId: request.Id,
            Status: request.Status.ToString(),
            Message: "Tu solicitud fue enviada correctamente. "
                + "El coordinador la revisará pronto."
        );
    }
}

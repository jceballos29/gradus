using MediatR;

namespace Gradus.Application.Commands.SubmitHomologation;

/// <summary>
/// El estudiante acepta la vista previa y envía la solicitud al coordinador.
/// </summary>
public record SubmitHomologationCommand(
    Guid DraftRequestId,
    string StudentAzureOid,
    string? StudentNotes
) : IRequest<SubmitHomologationResponse>;

public record SubmitHomologationResponse(Guid RequestId, string Status, string Message);

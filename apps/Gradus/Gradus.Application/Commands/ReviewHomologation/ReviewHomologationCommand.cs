using MediatR;

namespace Gradus.Application.Commands.ReviewHomologation;

/// <summary>
/// El coordinador aprueba o rechaza una solicitud,
/// con posibilidad de hacer excepciones en materias individuales.
/// </summary>
public record ReviewHomologationCommand(
    Guid RequestId,
    string CoordinatorAzureOid,
    bool Approve,
    string? CoordinatorNotes,
    IReadOnlyList<SubjectOverrideDto>? SubjectOverrides
) : IRequest<ReviewHomologationResponse>;

/// <summary>
/// Override manual del coordinador en una materia específica.
/// </summary>
public record SubjectOverrideDto(Guid SubjectId, bool IsHomologable, string? Notes);

public record ReviewHomologationResponse(Guid RequestId, string Status, string Message);

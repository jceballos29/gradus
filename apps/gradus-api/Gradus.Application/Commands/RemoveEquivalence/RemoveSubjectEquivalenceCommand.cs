using MediatR;

namespace Gradus.Application.Commands.RemoveEquivalence;

public record RemoveSubjectEquivalenceCommand(Guid EquivalenceId, string CoordinatorAzureOid)
    : IRequest;

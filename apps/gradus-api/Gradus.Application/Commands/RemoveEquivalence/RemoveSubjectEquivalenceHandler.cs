using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Commands.RemoveEquivalence;

public class RemoveSubjectEquivalenceHandler : IRequestHandler<RemoveSubjectEquivalenceCommand>
{
    private readonly IEquivalenceRepository _equivalences;

    public RemoveSubjectEquivalenceHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task Handle(
        RemoveSubjectEquivalenceCommand command,
        CancellationToken cancellationToken
    )
    {
        var equivalence =
            await _equivalences.GetEquivalenceByIdAsync(command.EquivalenceId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"No se encontró la equivalencia {command.EquivalenceId}."
            );

        equivalence.Deactivate(command.CoordinatorAzureOid);

        await _equivalences.UpdateEquivalenceAsync(equivalence, cancellationToken);
        await _equivalences.SaveChangesAsync(cancellationToken);
    }
}

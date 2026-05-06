using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Commands.UpdateEquivalence;

public class UpdateSubjectEquivalenceHandler : IRequestHandler<UpdateSubjectEquivalenceCommand>
{
    private readonly IEquivalenceRepository _equivalences;

    public UpdateSubjectEquivalenceHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task Handle(
        UpdateSubjectEquivalenceCommand command,
        CancellationToken cancellationToken
    )
    {
        var equivalence =
            await _equivalences.GetEquivalenceByIdAsync(command.EquivalenceId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"No se encontró la equivalencia {command.EquivalenceId}."
            );

        equivalence.Update(
            command.SourceSubjectCode,
            command.SourceSubjectName,
            command.SourceCredits,
            command.TargetSubjectCode,
            command.TargetSubjectName,
            command.TargetCredits,
            command.MinGradeOverride,
            command.CoordinatorAzureOid
        );

        await _equivalences.UpdateEquivalenceAsync(equivalence, cancellationToken);
        await _equivalences.SaveChangesAsync(cancellationToken);
    }
}

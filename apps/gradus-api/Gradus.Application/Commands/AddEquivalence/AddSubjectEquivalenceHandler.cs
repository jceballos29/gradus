using Gradus.Domain.Entities;
using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Commands.AddEquivalence;

public class AddSubjectEquivalenceHandler
    : IRequestHandler<AddSubjectEquivalenceCommand, AddSubjectEquivalenceResponse>
{
    private readonly IEquivalenceRepository _equivalences;

    public AddSubjectEquivalenceHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task<AddSubjectEquivalenceResponse> Handle(
        AddSubjectEquivalenceCommand command,
        CancellationToken cancellationToken
    )
    {
        var rule =
            await _equivalences.GetRuleByIdAsync(command.RuleId, cancellationToken)
            ?? throw new InvalidOperationException($"No se encontró la regla {command.RuleId}.");

        var equivalence = SubjectEquivalence.Create(
            homologationRuleId: rule.Id,
            sourceProgramCode: rule.SourceProgramCode,
            targetProgramCode: rule.TargetProgramCode,
            sourceSubjectCode: command.SourceSubjectCode,
            sourceSubjectName: command.SourceSubjectName,
            sourceCredits: command.SourceCredits,
            targetSubjectCode: command.TargetSubjectCode,
            targetSubjectName: command.TargetSubjectName,
            targetCredits: command.TargetCredits,
            createdByAzureOid: command.CoordinatorAzureOid,
            minGradeOverride: command.MinGradeOverride
        );

        await _equivalences.AddEquivalenceAsync(equivalence, cancellationToken);
        await _equivalences.SaveChangesAsync(cancellationToken);

        return new AddSubjectEquivalenceResponse(equivalence.Id);
    }
}

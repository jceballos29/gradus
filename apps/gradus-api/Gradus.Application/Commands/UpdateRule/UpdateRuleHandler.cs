using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Commands.UpdateRule;

public class UpdateRuleHandler : IRequestHandler<UpdateRuleCommand>
{
    private readonly IEquivalenceRepository _equivalences;

    public UpdateRuleHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task Handle(UpdateRuleCommand command, CancellationToken cancellationToken)
    {
        var rule =
            await _equivalences.GetRuleByIdAsync(command.RuleId, cancellationToken)
            ?? throw new InvalidOperationException($"No se encontró la regla {command.RuleId}.");

        rule.Update(
            command.MinGrade,
            command.MaxCreditsPercentage,
            command.RequiresSameArea,
            command.CoordinatorAzureOid
        );

        await _equivalences.UpdateRuleAsync(rule, cancellationToken);
        await _equivalences.SaveChangesAsync(cancellationToken);
    }
}

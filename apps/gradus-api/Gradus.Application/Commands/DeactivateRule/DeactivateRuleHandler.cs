using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Commands.DeactivateRule;

public class DeactivateRuleHandler : IRequestHandler<DeactivateRuleCommand>
{
    private readonly IEquivalenceRepository _equivalences;

    public DeactivateRuleHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task Handle(DeactivateRuleCommand command, CancellationToken cancellationToken)
    {
        var rule =
            await _equivalences.GetRuleByIdAsync(command.RuleId, cancellationToken)
            ?? throw new InvalidOperationException($"No se encontró la regla {command.RuleId}.");

        rule.Deactivate(command.CoordinatorAzureOid);

        await _equivalences.UpdateRuleAsync(rule, cancellationToken);
        await _equivalences.SaveChangesAsync(cancellationToken);
    }
}

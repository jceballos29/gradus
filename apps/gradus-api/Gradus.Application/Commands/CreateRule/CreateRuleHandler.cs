using Gradus.Domain.Entities;
using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Commands.CreateRule;

public class CreateRuleHandler : IRequestHandler<CreateRuleCommand, CreateRuleResponse>
{
    private readonly IEquivalenceRepository _equivalences;

    public CreateRuleHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task<CreateRuleResponse> Handle(
        CreateRuleCommand command,
        CancellationToken cancellationToken
    )
    {
        var rule = HomologationRule.Create(
            command.SourceProgramCode,
            command.TargetProgramCode,
            command.MinGrade,
            command.MaxCreditsPercentage,
            command.RequiresSameArea,
            command.CoordinatorAzureOid
        );

        await _equivalences.AddRuleAsync(rule, cancellationToken);
        await _equivalences.SaveChangesAsync(cancellationToken);

        return new CreateRuleResponse(rule.Id);
    }
}

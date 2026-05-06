using MediatR;

namespace Gradus.Application.Commands.UpdateRule;

public record UpdateRuleCommand(
    Guid RuleId,
    decimal MinGrade,
    int MaxCreditsPercentage,
    bool RequiresSameArea,
    string CoordinatorAzureOid
) : IRequest;

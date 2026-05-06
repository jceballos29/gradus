using MediatR;

namespace Gradus.Application.Commands.CreateRule;

public record CreateRuleCommand(
    string SourceProgramCode,
    string TargetProgramCode,
    decimal MinGrade,
    int MaxCreditsPercentage,
    bool RequiresSameArea,
    string CoordinatorAzureOid
) : IRequest<CreateRuleResponse>;

public record CreateRuleResponse(Guid RuleId);

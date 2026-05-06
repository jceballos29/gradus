using MediatR;

namespace Gradus.Application.Commands.DeactivateRule;

public record DeactivateRuleCommand(Guid RuleId, string CoordinatorAzureOid) : IRequest;

using MediatR;

namespace Gradus.Application.Commands.AddEquivalence;

public record AddSubjectEquivalenceCommand(
    Guid RuleId,
    string SourceSubjectCode,
    string SourceSubjectName,
    int SourceCredits,
    string TargetSubjectCode,
    string TargetSubjectName,
    int TargetCredits,
    decimal? MinGradeOverride,
    string CoordinatorAzureOid
) : IRequest<AddSubjectEquivalenceResponse>;

public record AddSubjectEquivalenceResponse(Guid EquivalenceId);

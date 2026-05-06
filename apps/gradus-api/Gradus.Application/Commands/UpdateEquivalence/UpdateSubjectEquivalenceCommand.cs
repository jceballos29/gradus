using MediatR;

namespace Gradus.Application.Commands.UpdateEquivalence;

public record UpdateSubjectEquivalenceCommand(
    Guid EquivalenceId,
    string SourceSubjectCode,
    string SourceSubjectName,
    int SourceCredits,
    string TargetSubjectCode,
    string TargetSubjectName,
    int TargetCredits,
    decimal? MinGradeOverride,
    string CoordinatorAzureOid
) : IRequest;

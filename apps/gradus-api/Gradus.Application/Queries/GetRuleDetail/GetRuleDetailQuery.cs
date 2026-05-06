using MediatR;

namespace Gradus.Application.Queries.GetRuleDetail;

public record GetRuleDetailQuery(Guid RuleId) : IRequest<HomologationRuleDetailDto>;

public record HomologationRuleDetailDto(
    Guid Id,
    string SourceProgramCode,
    string TargetProgramCode,
    decimal MinGrade,
    int MaxCreditsPercentage,
    bool RequiresSameArea,
    bool Active,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<SubjectEquivalenceDto> Equivalences
);

public record SubjectEquivalenceDto(
    Guid Id,
    string SourceSubjectCode,
    string SourceSubjectName,
    int SourceCredits,
    string TargetSubjectCode,
    string TargetSubjectName,
    int TargetCredits,
    decimal? MinGradeOverride,
    bool Active
);

using MediatR;

namespace Gradus.Application.Queries.GetAllRules;

public record GetAllRulesQuery : IRequest<IReadOnlyList<HomologationRuleDto>>;

public record HomologationRuleDto(
    Guid Id,
    string SourceProgramCode,
    string TargetProgramCode,
    decimal MinGrade,
    int MaxCreditsPercentage,
    bool RequiresSameArea,
    bool Active,
    DateTime CreatedAt,
    int EquivalencesCount
);

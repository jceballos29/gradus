using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Queries.GetRuleDetail;

public class GetRuleDetailHandler : IRequestHandler<GetRuleDetailQuery, HomologationRuleDetailDto>
{
    private readonly IEquivalenceRepository _equivalences;

    public GetRuleDetailHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task<HomologationRuleDetailDto> Handle(
        GetRuleDetailQuery query,
        CancellationToken cancellationToken
    )
    {
        var rule =
            await _equivalences.GetRuleByIdAsync(query.RuleId, cancellationToken)
            ?? throw new InvalidOperationException($"No se encontró la regla {query.RuleId}.");

        return new HomologationRuleDetailDto(
            Id: rule.Id,
            SourceProgramCode: rule.SourceProgramCode,
            TargetProgramCode: rule.TargetProgramCode,
            MinGrade: rule.MinGrade,
            MaxCreditsPercentage: rule.MaxCreditsPercentage,
            RequiresSameArea: rule.RequiresSameArea,
            Active: rule.Active,
            CreatedAt: rule.CreatedAt,
            UpdatedAt: rule.UpdatedAt,
            Equivalences: rule
                .SubjectEquivalences.Select(e => new SubjectEquivalenceDto(
                    e.Id,
                    e.SourceSubjectCode,
                    e.SourceSubjectName,
                    e.SourceCredits,
                    e.TargetSubjectCode,
                    e.TargetSubjectName,
                    e.TargetCredits,
                    e.MinGradeOverride,
                    e.Active
                ))
                .ToList()
        );
    }
}

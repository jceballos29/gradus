using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Queries.GetAllRules;

public class GetAllRulesHandler
    : IRequestHandler<GetAllRulesQuery, IReadOnlyList<HomologationRuleDto>>
{
    private readonly IEquivalenceRepository _equivalences;

    public GetAllRulesHandler(IEquivalenceRepository equivalences)
    {
        _equivalences = equivalences;
    }

    public async Task<IReadOnlyList<HomologationRuleDto>> Handle(
        GetAllRulesQuery query,
        CancellationToken cancellationToken
    )
    {
        var rules = await _equivalences.GetAllRulesAsync(cancellationToken);

        return rules
            .Select(r => new HomologationRuleDto(
                r.Id,
                r.SourceProgramCode,
                r.TargetProgramCode,
                r.MinGrade,
                r.MaxCreditsPercentage,
                r.RequiresSameArea,
                r.Active,
                r.CreatedAt,
                r.SubjectEquivalences.Count
            ))
            .ToList();
    }
}

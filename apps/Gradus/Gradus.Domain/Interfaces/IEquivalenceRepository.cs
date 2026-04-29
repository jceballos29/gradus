using Gradus.Domain.Entities;

namespace Gradus.Domain.Interfaces;

public interface IEquivalenceRepository
{
    Task<HomologationRule?> GetRuleAsync(
        string sourceProgramCode,
        string targetProgramCode,
        CancellationToken ct = default
    );

    Task<IReadOnlyList<SubjectEquivalence>> GetEquivalencesAsync(
        string sourceProgramCode,
        string targetProgramCode,
        CancellationToken ct = default
    );

    Task<IReadOnlyList<HomologationRule>> GetAllRulesAsync(CancellationToken ct = default);

    Task AddRuleAsync(HomologationRule rule, CancellationToken ct = default);

    Task UpdateRuleAsync(HomologationRule rule, CancellationToken ct = default);

    Task AddEquivalenceAsync(SubjectEquivalence equivalence, CancellationToken ct = default);

    Task UpdateEquivalenceAsync(SubjectEquivalence equivalence, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

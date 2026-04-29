using Gradus.Domain.Entities;
using Gradus.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Gradus.Infrastructure.Persistence.Repositories;

public class EquivalenceRepository : IEquivalenceRepository
{
    private readonly GradusDbContext _db;

    public EquivalenceRepository(GradusDbContext db)
    {
        _db = db;
    }

    public async Task<HomologationRule?> GetRuleAsync(
        string sourceProgramCode,
        string targetProgramCode,
        CancellationToken ct = default
    )
    {
        return await _db.HomologationRules.FirstOrDefaultAsync(
            r =>
                r.SourceProgramCode == sourceProgramCode
                && r.TargetProgramCode == targetProgramCode
                && r.Active,
            ct
        );
    }

    public async Task<IReadOnlyList<SubjectEquivalence>> GetEquivalencesAsync(
        string sourceProgramCode,
        string targetProgramCode,
        CancellationToken ct = default
    )
    {
        return await _db
            .SubjectEquivalences.Where(e =>
                e.SourceProgramCode == sourceProgramCode
                && e.TargetProgramCode == targetProgramCode
                && e.Active
            )
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<HomologationRule>> GetAllRulesAsync(
        CancellationToken ct = default
    )
    {
        return await _db
            .HomologationRules.Include(r => r.SubjectEquivalences.Where(e => e.Active))
            .OrderBy(r => r.SourceProgramCode)
            .ToListAsync(ct);
    }

    public async Task AddRuleAsync(HomologationRule rule, CancellationToken ct = default)
    {
        await _db.HomologationRules.AddAsync(rule, ct);
    }

    public Task UpdateRuleAsync(HomologationRule rule, CancellationToken ct = default)
    {
        _db.HomologationRules.Update(rule);
        return Task.CompletedTask;
    }

    public async Task AddEquivalenceAsync(
        SubjectEquivalence equivalence,
        CancellationToken ct = default
    )
    {
        await _db.SubjectEquivalences.AddAsync(equivalence, ct);
    }

    public Task UpdateEquivalenceAsync(
        SubjectEquivalence equivalence,
        CancellationToken ct = default
    )
    {
        _db.SubjectEquivalences.Update(equivalence);
        return Task.CompletedTask;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _db.SaveChangesAsync(ct);
    }
}

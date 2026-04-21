using Gradus.Domain.Entities;
using Gradus.Domain.Enums;
using Gradus.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Gradus.Infrastructure.Persistence.Repositories;

public class HomologationRepository : IHomologationRepository
{
    private readonly GradusDbContext _db;

    public HomologationRepository(GradusDbContext db)
    {
        _db = db;
    }

    public async Task<HomologationRequest?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.HomologationRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
    }

    public async Task<HomologationRequest?> GetByIdWithSubjectsAsync(
        Guid id,
        CancellationToken ct = default
    )
    {
        return await _db
            .HomologationRequests.Include(r => r.Subjects)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
    }

    public async Task<IReadOnlyList<HomologationRequest>> GetByStudentIdentityAsync(
        string studentIdentity,
        CancellationToken ct = default
    )
    {
        return await _db
            .HomologationRequests.Where(r => r.StudentIdentity == studentIdentity)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<HomologationRequest>> GetByStatusAsync(
        HomologationStatus status,
        CancellationToken ct = default
    )
    {
        return await _db
            .HomologationRequests.Where(r => r.Status == status)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<bool> HasActiveRequestAsync(
        string studentIdentity,
        string sourceProgramCode,
        string targetProgramCode,
        CancellationToken ct = default
    )
    {
        var activeStatuses = new[]
        {
            HomologationStatus.Draft,
            HomologationStatus.Pending,
            HomologationStatus.Reviewing,
        };

        return await _db.HomologationRequests.AnyAsync(
            r =>
                r.StudentIdentity == studentIdentity
                && r.SourceProgramCode == sourceProgramCode
                && r.TargetProgramCode == targetProgramCode
                && activeStatuses.Contains(r.Status),
            ct
        );
    }

    public async Task AddAsync(HomologationRequest request, CancellationToken ct = default)
    {
        await _db.HomologationRequests.AddAsync(request, ct);
    }

    public Task UpdateAsync(HomologationRequest request, CancellationToken ct = default)
    {
        _db.HomologationRequests.Update(request);
        return Task.CompletedTask;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _db.SaveChangesAsync(ct);
    }
}

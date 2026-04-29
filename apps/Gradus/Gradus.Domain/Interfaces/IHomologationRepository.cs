using Gradus.Domain.Entities;
using Gradus.Domain.Enums;

namespace Gradus.Domain.Interfaces;

public interface IHomologationRepository
{
    Task<HomologationRequest?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<HomologationRequest?> GetByIdWithSubjectsAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<HomologationRequest>> GetByStudentIdentityAsync(
        string studentIdentity,
        CancellationToken ct = default
    );

    Task<IReadOnlyList<HomologationRequest>> GetByStatusAsync(
        HomologationStatus status,
        CancellationToken ct = default
    );

    /// <summary>
    /// Verifica si el estudiante ya tiene una solicitud activa (PENDING o REVIEWING)
    /// para el mismo par de programas.
    /// </summary>
    Task<bool> HasActiveRequestAsync(
        string studentIdentity,
        string sourceProgramCode,
        string targetProgramCode,
        CancellationToken ct = default
    );

    Task AddAsync(HomologationRequest request, CancellationToken ct = default);

    Task UpdateAsync(HomologationRequest request, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

using Gradus.Domain.Enums;
using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Queries.GetPendingRequests;

public class GetPendingRequestsHandler
    : IRequestHandler<GetPendingRequestsQuery, IReadOnlyList<PendingRequestDto>>
{
    private readonly IHomologationRepository _requests;

    public GetPendingRequestsHandler(IHomologationRepository requests)
    {
        _requests = requests;
    }

    public async Task<IReadOnlyList<PendingRequestDto>> Handle(
        GetPendingRequestsQuery query,
        CancellationToken cancellationToken
    )
    {
        // Trae tanto PENDING como REVIEWING — el coordinador ve ambos
        var pending = await _requests.GetByStatusAsync(
            HomologationStatus.Pending,
            cancellationToken
        );

        var reviewing = await _requests.GetByStatusAsync(
            HomologationStatus.Reviewing,
            cancellationToken
        );

        return pending
            .Concat(reviewing)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new PendingRequestDto(
                r.Id,
                r.StudentName,
                r.StudentCode,
                r.SourceProgramCode,
                r.TargetProgramCode,
                r.Status.ToString(),
                r.TotalSubjectsApproved,
                r.TotalCreditsHomologated,
                r.CreatedAt
            ))
            .ToList();
    }
}

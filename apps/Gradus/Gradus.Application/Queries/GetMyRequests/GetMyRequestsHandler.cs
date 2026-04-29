using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Queries.GetMyRequests;

public class GetMyRequestsHandler
    : IRequestHandler<GetMyRequestsQuery, IReadOnlyList<RequestSummaryDto>>
{
    private readonly IHomologationRepository _requests;

    public GetMyRequestsHandler(IHomologationRepository requests)
    {
        _requests = requests;
    }

    public async Task<IReadOnlyList<RequestSummaryDto>> Handle(
        GetMyRequestsQuery query,
        CancellationToken cancellationToken
    )
    {
        var requests = await _requests.GetByStudentIdentityAsync(
            query.StudentAzureOid,
            cancellationToken
        );

        return requests
            .Select(r => new RequestSummaryDto(
                r.Id,
                r.SourceProgramCode,
                r.SourceProgramName,
                r.TargetProgramCode,
                r.TargetProgramName,
                r.Status.ToString(),
                r.TotalSubjectsApproved,
                r.TotalCreditsHomologated,
                r.CreatedAt,
                r.ReviewedAt,
                r.DocumentUrl
            ))
            .ToList();
    }
}

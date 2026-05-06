using Gradus.Application.Queries.GetMyRequests;
using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Queries.GetStudentRequests;

public class GetStudentRequestsHandler
    : IRequestHandler<GetStudentRequestsQuery, IReadOnlyList<RequestSummaryDto>>
{
    private readonly IHomologationRepository _requests;

    public GetStudentRequestsHandler(IHomologationRepository requests)
    {
        _requests = requests;
    }

    public async Task<IReadOnlyList<RequestSummaryDto>> Handle(
        GetStudentRequestsQuery query,
        CancellationToken cancellationToken
    )
    {
        var requests = await _requests.GetByStudentIdentityAsync(
            query.StudentOid,
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

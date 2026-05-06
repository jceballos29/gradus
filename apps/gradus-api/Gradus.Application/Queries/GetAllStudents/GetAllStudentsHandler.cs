using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Queries.GetAllStudents;

public class GetAllStudentsHandler
    : IRequestHandler<GetAllStudentsQuery, IReadOnlyList<StudentSummaryDto>>
{
    private readonly IHomologationRepository _requests;

    public GetAllStudentsHandler(IHomologationRepository requests)
    {
        _requests = requests;
    }

    public async Task<IReadOnlyList<StudentSummaryDto>> Handle(
        GetAllStudentsQuery query,
        CancellationToken cancellationToken
    )
    {
        var all = await _requests.GetAllStudentRequestsAsync(query.Search, cancellationToken);

        return all
            .GroupBy(r => r.StudentAzureOid)
            .Select(g =>
            {
                var latest = g.First();
                return new StudentSummaryDto(
                    StudentAzureOid: g.Key,
                    StudentName: latest.StudentName,
                    StudentCode: latest.StudentCode,
                    SourceProgramCode: latest.SourceProgramCode,
                    TargetProgramCode: latest.TargetProgramCode,
                    TotalRequests: g.Count(),
                    LastRequestDate: latest.CreatedAt,
                    LastStatus: latest.Status.ToString()
                );
            })
            .OrderBy(s => s.StudentName)
            .ToList();
    }
}

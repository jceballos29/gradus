using MediatR;

namespace Gradus.Application.Queries.GetAllStudents;

public record GetAllStudentsQuery(string? Search) : IRequest<IReadOnlyList<StudentSummaryDto>>;

public record StudentSummaryDto(
    string StudentAzureOid,
    string StudentName,
    string StudentCode,
    string SourceProgramCode,
    string TargetProgramCode,
    int TotalRequests,
    DateTime LastRequestDate,
    string LastStatus
);

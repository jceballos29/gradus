using MediatR;

namespace Gradus.Application.Queries.GetMyRequests;

public record GetMyRequestsQuery(string StudentAzureOid)
    : IRequest<IReadOnlyList<RequestSummaryDto>>;

public record RequestSummaryDto(
    Guid Id,
    string SourceProgramCode,
    string SourceProgramName,
    string TargetProgramCode,
    string TargetProgramName,
    string Status,
    int TotalSubjectsApproved,
    int TotalCreditsHomologated,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    string? DocumentUrl
);

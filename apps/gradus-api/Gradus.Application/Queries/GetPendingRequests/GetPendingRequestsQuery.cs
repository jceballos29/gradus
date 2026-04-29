using MediatR;

namespace Gradus.Application.Queries.GetPendingRequests;

public record GetPendingRequestsQuery : IRequest<IReadOnlyList<PendingRequestDto>>;

public record PendingRequestDto(
    Guid Id,
    string StudentName,
    string StudentCode,
    string SourceProgramCode,
    string TargetProgramCode,
    string Status,
    int TotalSubjectsApproved,
    int TotalCreditsHomologated,
    DateTime CreatedAt
);

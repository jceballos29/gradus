using Gradus.Domain.Enums;
using MediatR;

namespace Gradus.Application.Queries.GetRequestDetail;

public record GetRequestDetailQuery(Guid RequestId, string CallerAzureOid, bool IsCoordinator)
    : IRequest<RequestDetailDto>;

public record RequestDetailDto(
    Guid Id,
    string StudentName,
    string StudentCode,
    string StudentAzureOid,
    string SourceProgramCode,
    string SourceProgramName,
    string TargetProgramCode,
    string TargetProgramName,
    string Status,
    string? StudentNotes,
    string? CoordinatorNotes,
    string? DocumentUrl,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    HomologationMetricsDto Metrics,
    IReadOnlyList<SubjectDetailDto> HomologableSubjects,
    IReadOnlyList<SubjectDetailDto> RejectedSubjects
);

public record HomologationMetricsDto(
    int TotalEvaluated,
    int TotalApproved,
    int TotalRejected,
    int CreditsHomologated
);

public record SubjectDetailDto(
    Guid Id,
    string SourceCode,
    string SourceName,
    decimal SourceGrade,
    int SourceCredits,
    string SourceArea,
    string TargetCode,
    string TargetName,
    int TargetCredits,
    bool IsHomologable,
    string? RejectionReason,
    bool CoordinatorOverride,
    string? CoordinatorNotes
);

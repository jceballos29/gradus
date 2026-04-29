using Gradus.Domain.Interfaces;
using MediatR;

namespace Gradus.Application.Queries.GetRequestDetail;

public class GetRequestDetailHandler : IRequestHandler<GetRequestDetailQuery, RequestDetailDto>
{
    private readonly IHomologationRepository _requests;

    public GetRequestDetailHandler(IHomologationRepository requests)
    {
        _requests = requests;
    }

    public async Task<RequestDetailDto> Handle(
        GetRequestDetailQuery query,
        CancellationToken cancellationToken
    )
    {
        var request =
            await _requests.GetByIdWithSubjectsAsync(query.RequestId, cancellationToken)
            ?? throw new InvalidOperationException(
                $"No se encontró la solicitud {query.RequestId}."
            );

        // Verificar acceso: el estudiante solo puede ver sus propias solicitudes
        if (
            !query.IsCoordinator
            && !request.StudentAzureOid.Equals(
                query.CallerAzureOid,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new UnauthorizedAccessException("No tienes permiso para ver esta solicitud.");
        }

        var subjects = request.Subjects.ToList();
        var homologable = subjects.Where(s => s.IsHomologable).ToList();
        var rejected = subjects.Where(s => !s.IsHomologable).ToList();

        return new RequestDetailDto(
            Id: request.Id,
            StudentName: request.StudentName,
            StudentCode: request.StudentCode,
            StudentAzureOid: request.StudentAzureOid,
            SourceProgramCode: request.SourceProgramCode,
            SourceProgramName: request.SourceProgramName,
            TargetProgramCode: request.TargetProgramCode,
            TargetProgramName: request.TargetProgramName,
            Status: request.Status.ToString(),
            StudentNotes: request.StudentNotes,
            CoordinatorNotes: request.CoordinatorNotes,
            DocumentUrl: request.DocumentUrl,
            CreatedAt: request.CreatedAt,
            ReviewedAt: request.ReviewedAt,
            Metrics: new HomologationMetricsDto(
                request.TotalSubjectsEvaluated,
                request.TotalSubjectsApproved,
                request.TotalSubjectsEvaluated - request.TotalSubjectsApproved,
                request.TotalCreditsHomologated
            ),
            HomologableSubjects: homologable.Select(MapSubject).ToList(),
            RejectedSubjects: rejected.Select(MapSubject).ToList()
        );
    }

    private static SubjectDetailDto MapSubject(Gradus.Domain.Entities.HomologationSubject s) =>
        new(
            s.Id,
            s.SourceSubjectCode,
            s.SourceSubjectName,
            s.SourceGrade,
            s.SourceCredits,
            s.SourceArea,
            s.TargetSubjectCode,
            s.TargetSubjectName,
            s.TargetCredits,
            s.IsHomologable,
            s.RejectionReason?.ToString(),
            s.CoordinatorOverride,
            s.CoordinatorNotes
        );
}

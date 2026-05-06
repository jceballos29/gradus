using Gradus.Application.Queries.GetMyRequests;
using MediatR;

namespace Gradus.Application.Queries.GetStudentRequests;

public record GetStudentRequestsQuery(string StudentOid)
    : IRequest<IReadOnlyList<RequestSummaryDto>>;

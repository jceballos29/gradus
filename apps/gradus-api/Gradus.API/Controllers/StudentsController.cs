using Gradus.Application.Queries.GetAllStudents;
using Gradus.Application.Queries.GetMyRequests;
using Gradus.Application.Queries.GetStudentRequests;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gradus.API.Controllers;

[ApiController]
[Route("api/students")]
[Produces("application/json")]
[Authorize(Roles = "coordinador")]
public class StudentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public StudentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Retorna todos los estudiantes que tienen solicitudes de homologación.
    /// Filtra opcionalmente por nombre o código del estudiante.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<StudentSummaryDto>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] string? search, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAllStudentsQuery(search), ct);
        return Ok(result);
    }

    /// <summary>
    /// Retorna el historial completo de solicitudes de un estudiante.
    /// </summary>
    [HttpGet("{studentOid}/requests")]
    [ProducesResponseType(typeof(IReadOnlyList<RequestSummaryDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRequests(string studentOid, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetStudentRequestsQuery(studentOid), ct);
        return Ok(result);
    }
}

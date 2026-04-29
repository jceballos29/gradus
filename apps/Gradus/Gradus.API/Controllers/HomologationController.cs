using Gradus.Application.Commands.PreviewHomologation;
using Gradus.Application.Commands.ReviewHomologation;
using Gradus.Application.Commands.SubmitHomologation;
using Gradus.Application.Common.Interfaces;
using Gradus.Application.Queries.GetMyRequests;
using Gradus.Application.Queries.GetPendingRequests;
using Gradus.Application.Queries.GetRequestDetail;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gradus.API.Controllers;

[ApiController]
[Route("api/homologations")]
[Produces("application/json")]
[Authorize]
public class HomologationController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public HomologationController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Genera la vista previa de homologación para el estudiante.
    /// Evalúa su historial y retorna qué materias se homologan.
    /// </summary>
    [HttpPost("preview")]
    [Authorize(Roles = "estudiante")]
    [ProducesResponseType(typeof(PreviewHomologationResponse), 200)]
    [ProducesResponseType(409)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Preview(
        [FromBody] PreviewRequest request,
        CancellationToken ct
    )
    {
        var command = new PreviewHomologationCommand(
            StudentAzureOid: _currentUser.AzureOid,
            TargetProgramCode: request.TargetProgramCode
        );

        var result = await _mediator.Send(command, ct);
        return Ok(result);
    }

    /// <summary>
    /// El estudiante acepta la vista previa y envía la solicitud al coordinador.
    /// </summary>
    [HttpPost("{draftId:guid}/submit")]
    [Authorize(Roles = "estudiante")]
    [ProducesResponseType(typeof(SubmitHomologationResponse), 200)]
    [ProducesResponseType(409)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Submit(
        Guid draftId,
        [FromBody] SubmitRequest request,
        CancellationToken ct
    )
    {
        var command = new SubmitHomologationCommand(
            DraftRequestId: draftId,
            StudentAzureOid: _currentUser.AzureOid,
            StudentNotes: request.StudentNotes
        );

        var result = await _mediator.Send(command, ct);
        return Ok(result);
    }

    /// <summary>
    /// El coordinador aprueba o rechaza una solicitud con posibles excepciones manuales.
    /// </summary>
    [HttpPost("{requestId:guid}/review")]
    [Authorize(Roles = "coordinador")]
    [ProducesResponseType(typeof(ReviewHomologationResponse), 200)]
    [ProducesResponseType(409)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Review(
        Guid requestId,
        [FromBody] ReviewRequest request,
        CancellationToken ct
    )
    {
        var command = new ReviewHomologationCommand(
            RequestId: requestId,
            CoordinatorAzureOid: _currentUser.AzureOid,
            Approve: request.Approve,
            CoordinatorNotes: request.CoordinatorNotes,
            SubjectOverrides: request
                .SubjectOverrides?.Select(o => new SubjectOverrideDto(
                    o.SubjectId,
                    o.IsHomologable,
                    o.Notes
                ))
                .ToList()
        );

        var result = await _mediator.Send(command, ct);
        return Ok(result);
    }

    /// <summary>
    /// Retorna todas las solicitudes del estudiante autenticado.
    /// El OID se extrae del token — no es necesario enviarlo como parámetro.
    /// </summary>
    [HttpGet("my")]
    [Authorize(Roles = "estudiante")]
    [ProducesResponseType(typeof(IReadOnlyList<RequestSummaryDto>), 200)]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMyRequestsQuery(_currentUser.AzureOid), ct);
        return Ok(result);
    }

    /// <summary>
    /// Retorna solicitudes pendientes de revisión. Solo para coordinadores.
    /// </summary>
    [HttpGet("pending")]
    [Authorize(Roles = "coordinador")]
    [ProducesResponseType(typeof(IReadOnlyList<PendingRequestDto>), 200)]
    public async Task<IActionResult> GetPending(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPendingRequestsQuery(), ct);
        return Ok(result);
    }

    /// <summary>
    /// Retorna el detalle completo de una solicitud.
    /// El OID del llamante y su rol se extraen del token automáticamente.
    /// </summary>
    [HttpGet("{requestId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(RequestDetailDto), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetDetail(Guid requestId, CancellationToken ct = default)
    {
        var result = await _mediator.Send(
            new GetRequestDetailQuery(requestId, _currentUser.AzureOid, _currentUser.IsCoordinator),
            ct
        );
        return Ok(result);
    }
}

// ── Request DTOs ───────────────────────────────────────────────────
// Solo contienen campos que el cliente debe proveer explícitamente.
// El OID del usuario nunca se acepta del body/query — siempre del token JWT.

/// <summary>El estudiante solo indica el programa destino; su OID viene del token.</summary>
public record PreviewRequest(string TargetProgramCode);

/// <summary>El estudiante puede agregar notas opcionales; su OID viene del token.</summary>
public record SubmitRequest(string? StudentNotes);

/// <summary>El coordinador envía la decisión; su OID viene del token.</summary>
public record ReviewRequest(
    bool Approve,
    string? CoordinatorNotes,
    IReadOnlyList<SubjectOverrideRequest>? SubjectOverrides
);

public record SubjectOverrideRequest(Guid SubjectId, bool IsHomologable, string? Notes);

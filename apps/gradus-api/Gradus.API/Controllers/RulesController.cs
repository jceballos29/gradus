using Gradus.Application.Commands.AddEquivalence;
using Gradus.Application.Commands.CreateRule;
using Gradus.Application.Commands.DeactivateRule;
using Gradus.Application.Commands.RemoveEquivalence;
using Gradus.Application.Commands.UpdateEquivalence;
using Gradus.Application.Commands.UpdateRule;
using Gradus.Application.Common.Interfaces;
using Gradus.Application.Queries.GetAllRules;
using Gradus.Application.Queries.GetRuleDetail;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gradus.API.Controllers;

[ApiController]
[Route("api/rules")]
[Produces("application/json")]
[Authorize(Roles = "coordinador")]
public class RulesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public RulesController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Retorna todas las reglas de homologación (activas e inactivas).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<HomologationRuleDto>), 200)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAllRulesQuery(), ct);
        return Ok(result);
    }

    /// <summary>
    /// Retorna el detalle completo de una regla, incluyendo sus equivalencias.
    /// </summary>
    [HttpGet("{ruleId:guid}")]
    [ProducesResponseType(typeof(HomologationRuleDetailDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetDetail(Guid ruleId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetRuleDetailQuery(ruleId), ct);
        return Ok(result);
    }

    /// <summary>
    /// Crea una nueva regla de homologación entre dos programas.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CreateRuleResponse), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Create([FromBody] CreateRuleRequest request, CancellationToken ct)
    {
        var command = new CreateRuleCommand(
            SourceProgramCode: request.SourceProgramCode,
            TargetProgramCode: request.TargetProgramCode,
            MinGrade: request.MinGrade,
            MaxCreditsPercentage: request.MaxCreditsPercentage,
            RequiresSameArea: request.RequiresSameArea,
            CoordinatorAzureOid: _currentUser.AzureOid
        );

        var result = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetDetail), new { ruleId = result.RuleId }, result);
    }

    /// <summary>
    /// Actualiza los parámetros de una regla existente.
    /// </summary>
    [HttpPut("{ruleId:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(
        Guid ruleId,
        [FromBody] UpdateRuleRequest request,
        CancellationToken ct
    )
    {
        var command = new UpdateRuleCommand(
            RuleId: ruleId,
            MinGrade: request.MinGrade,
            MaxCreditsPercentage: request.MaxCreditsPercentage,
            RequiresSameArea: request.RequiresSameArea,
            CoordinatorAzureOid: _currentUser.AzureOid
        );

        await _mediator.Send(command, ct);
        return NoContent();
    }

    /// <summary>
    /// Desactiva una regla (soft delete). Las solicitudes existentes no se ven afectadas.
    /// </summary>
    [HttpDelete("{ruleId:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Deactivate(Guid ruleId, CancellationToken ct)
    {
        await _mediator.Send(new DeactivateRuleCommand(ruleId, _currentUser.AzureOid), ct);
        return NoContent();
    }

    /// <summary>
    /// Agrega una equivalencia de materias a una regla.
    /// </summary>
    [HttpPost("{ruleId:guid}/equivalences")]
    [ProducesResponseType(typeof(AddSubjectEquivalenceResponse), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> AddEquivalence(
        Guid ruleId,
        [FromBody] EquivalenceRequest request,
        CancellationToken ct
    )
    {
        var command = new AddSubjectEquivalenceCommand(
            RuleId: ruleId,
            SourceSubjectCode: request.SourceSubjectCode,
            SourceSubjectName: request.SourceSubjectName,
            SourceCredits: request.SourceCredits,
            TargetSubjectCode: request.TargetSubjectCode,
            TargetSubjectName: request.TargetSubjectName,
            TargetCredits: request.TargetCredits,
            MinGradeOverride: request.MinGradeOverride,
            CoordinatorAzureOid: _currentUser.AzureOid
        );

        var result = await _mediator.Send(command, ct);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Actualiza una equivalencia de materias existente.
    /// </summary>
    [HttpPut("{ruleId:guid}/equivalences/{equivalenceId:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateEquivalence(
        Guid equivalenceId,
        [FromBody] EquivalenceRequest request,
        CancellationToken ct
    )
    {
        var command = new UpdateSubjectEquivalenceCommand(
            EquivalenceId: equivalenceId,
            SourceSubjectCode: request.SourceSubjectCode,
            SourceSubjectName: request.SourceSubjectName,
            SourceCredits: request.SourceCredits,
            TargetSubjectCode: request.TargetSubjectCode,
            TargetSubjectName: request.TargetSubjectName,
            TargetCredits: request.TargetCredits,
            MinGradeOverride: request.MinGradeOverride,
            CoordinatorAzureOid: _currentUser.AzureOid
        );

        await _mediator.Send(command, ct);
        return NoContent();
    }

    /// <summary>
    /// Elimina (desactiva) una equivalencia de materias.
    /// </summary>
    [HttpDelete("{ruleId:guid}/equivalences/{equivalenceId:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> RemoveEquivalence(Guid equivalenceId, CancellationToken ct)
    {
        await _mediator.Send(
            new RemoveSubjectEquivalenceCommand(equivalenceId, _currentUser.AzureOid),
            ct
        );
        return NoContent();
    }
}

// ── Request DTOs ───────────────────────────────────────────────────

public record CreateRuleRequest(
    string SourceProgramCode,
    string TargetProgramCode,
    decimal MinGrade,
    int MaxCreditsPercentage,
    bool RequiresSameArea
);

public record UpdateRuleRequest(decimal MinGrade, int MaxCreditsPercentage, bool RequiresSameArea);

public record EquivalenceRequest(
    string SourceSubjectCode,
    string SourceSubjectName,
    int SourceCredits,
    string TargetSubjectCode,
    string TargetSubjectName,
    int TargetCredits,
    decimal? MinGradeOverride
);

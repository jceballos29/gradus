using FluentValidation;

namespace Gradus.Application.Commands.UpdateRule;

public class UpdateRuleValidator : AbstractValidator<UpdateRuleCommand>
{
    public UpdateRuleValidator()
    {
        RuleFor(x => x.RuleId).NotEmpty().WithMessage("El ID de la regla es requerido.");

        RuleFor(x => x.MinGrade)
            .InclusiveBetween(0, 5)
            .WithMessage("La nota mínima debe estar entre 0 y 5.");

        RuleFor(x => x.MaxCreditsPercentage)
            .InclusiveBetween(1, 100)
            .WithMessage("El porcentaje de créditos debe estar entre 1 y 100.");

        RuleFor(x => x.CoordinatorAzureOid)
            .NotEmpty()
            .WithMessage("El OID del coordinador es requerido.");
    }
}

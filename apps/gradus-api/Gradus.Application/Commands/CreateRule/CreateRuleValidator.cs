using FluentValidation;

namespace Gradus.Application.Commands.CreateRule;

public class CreateRuleValidator : AbstractValidator<CreateRuleCommand>
{
    public CreateRuleValidator()
    {
        RuleFor(x => x.SourceProgramCode)
            .NotEmpty()
            .WithMessage("El código del programa origen es requerido.")
            .MaximumLength(20);

        RuleFor(x => x.TargetProgramCode)
            .NotEmpty()
            .WithMessage("El código del programa destino es requerido.")
            .MaximumLength(20);

        RuleFor(x => x)
            .Must(x => x.SourceProgramCode != x.TargetProgramCode)
            .WithMessage("El programa origen y destino no pueden ser iguales.");

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

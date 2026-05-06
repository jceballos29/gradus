using FluentValidation;

namespace Gradus.Application.Commands.UpdateEquivalence;

public class UpdateSubjectEquivalenceValidator : AbstractValidator<UpdateSubjectEquivalenceCommand>
{
    public UpdateSubjectEquivalenceValidator()
    {
        RuleFor(x => x.EquivalenceId)
            .NotEmpty()
            .WithMessage("El ID de la equivalencia es requerido.");

        RuleFor(x => x.SourceSubjectCode)
            .NotEmpty()
            .WithMessage("El código de la materia origen es requerido.")
            .MaximumLength(20);

        RuleFor(x => x.SourceSubjectName)
            .NotEmpty()
            .WithMessage("El nombre de la materia origen es requerido.")
            .MaximumLength(255);

        RuleFor(x => x.SourceCredits)
            .GreaterThan(0)
            .WithMessage("Los créditos de la materia origen deben ser mayores a 0.");

        RuleFor(x => x.TargetSubjectCode)
            .NotEmpty()
            .WithMessage("El código de la materia destino es requerido.")
            .MaximumLength(20);

        RuleFor(x => x.TargetSubjectName)
            .NotEmpty()
            .WithMessage("El nombre de la materia destino es requerido.")
            .MaximumLength(255);

        RuleFor(x => x.TargetCredits)
            .GreaterThan(0)
            .WithMessage("Los créditos de la materia destino deben ser mayores a 0.");

        RuleFor(x => x.MinGradeOverride)
            .InclusiveBetween(0, 5)
            .WithMessage("El override de nota mínima debe estar entre 0 y 5.")
            .When(x => x.MinGradeOverride.HasValue);

        RuleFor(x => x.CoordinatorAzureOid)
            .NotEmpty()
            .WithMessage("El OID del coordinador es requerido.");
    }
}

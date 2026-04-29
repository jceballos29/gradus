using FluentValidation;

namespace Gradus.Application.Commands.PreviewHomologation;

public class PreviewHomologationValidator : AbstractValidator<PreviewHomologationCommand>
{
    public PreviewHomologationValidator()
    {
        RuleFor(x => x.StudentAzureOid)
            .NotEmpty()
            .WithMessage("El OID del estudiante es requerido.");

        RuleFor(x => x.TargetProgramCode)
            .NotEmpty()
            .WithMessage("El código del programa destino es requerido.")
            .MaximumLength(20)
            .WithMessage("El código del programa no puede superar 20 caracteres.");
    }
}

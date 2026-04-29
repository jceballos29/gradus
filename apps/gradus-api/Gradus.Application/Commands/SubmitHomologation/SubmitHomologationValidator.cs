using FluentValidation;

namespace Gradus.Application.Commands.SubmitHomologation;

public class SubmitHomologationValidator : AbstractValidator<SubmitHomologationCommand>
{
    public SubmitHomologationValidator()
    {
        RuleFor(x => x.DraftRequestId)
            .NotEmpty()
            .WithMessage("El ID de la solicitud es requerido.");

        RuleFor(x => x.StudentAzureOid)
            .NotEmpty()
            .WithMessage("El OID del estudiante es requerido.");

        RuleFor(x => x.StudentNotes)
            .MaximumLength(1000)
            .WithMessage("Las observaciones no pueden superar 1000 caracteres.")
            .When(x => x.StudentNotes != null);
    }
}

using FluentValidation;

namespace Gradus.Application.Commands.ReviewHomologation;

public class ReviewHomologationValidator : AbstractValidator<ReviewHomologationCommand>
{
    public ReviewHomologationValidator()
    {
        RuleFor(x => x.RequestId).NotEmpty().WithMessage("El ID de la solicitud es requerido.");

        RuleFor(x => x.CoordinatorAzureOid)
            .NotEmpty()
            .WithMessage("El OID del coordinador es requerido.");

        RuleFor(x => x.CoordinatorNotes)
            .MaximumLength(2000)
            .WithMessage("Las observaciones no pueden superar 2000 caracteres.")
            .When(x => x.CoordinatorNotes != null);

        // Si rechaza, debe incluir observaciones
        RuleFor(x => x.CoordinatorNotes)
            .NotEmpty()
            .WithMessage("Debe incluir observaciones al rechazar una solicitud.")
            .When(x => !x.Approve);
    }
}

namespace Gradus.Domain.Enums;

/// <summary>
/// Tipo de evento que originó la notificación in-app.
/// </summary>
public enum NotificationType
{
    /// <summary>El estudiante envió una nueva solicitud.</summary>
    HomologationSubmitted,

    /// <summary>Un coordinador tomó la solicitud para revisión.</summary>
    HomologationUnderReview,

    /// <summary>La solicitud fue aprobada.</summary>
    HomologationApproved,

    /// <summary>La solicitud fue rechazada.</summary>
    HomologationRejected,

    /// <summary>El documento PDF ya está disponible para descarga.</summary>
    DocumentReady,
}

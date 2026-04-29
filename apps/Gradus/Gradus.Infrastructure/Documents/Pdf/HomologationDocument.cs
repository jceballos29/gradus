using Gradus.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Gradus.Infrastructure.Documents.Pdf;

/// <summary>
/// Documento PDF de homologación académica.
/// Replica la plantilla institucional del Politécnico Internacional.
/// </summary>
public class HomologationDocument : IDocument
{
    private readonly HomologationRequest _request;

    // Colores institucionales
    private static readonly string ColorPrimario = "#1a3a5c"; // Azul oscuro PI
    private static readonly string ColorSecundario = "#2d6ea6"; // Azul medio
    private static readonly string ColorBorde = "#cccccc";
    private static readonly string ColorFilaAlterna = "#f5f8fc";

    public HomologationDocument(HomologationRequest request)
    {
        _request = request;
    }

    public DocumentMetadata GetMetadata() =>
        new()
        {
            Title = $"Acta de Homologación - {_request.StudentName}",
            Author = "Politécnico Internacional",
            Subject = "Homologación Académica",
            Keywords = "homologación, académico, Politécnico Internacional",
            CreationDate = DateTimeOffset.UtcNow,
        };

    public DocumentSettings GetSettings() => DocumentSettings.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.Letter);
            page.Margin(2, Unit.Centimetre);
            page.PageColor(Colors.White);
            page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().Element(ComposeFooter);
        });
    }

    // ── ENCABEZADO ──────────────────────────────────────────────────────────

    private void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            // Línea superior de color institucional
            col.Item().Height(6).Background(ColorPrimario);

            col.Item()
                .Padding(10)
                .Row(row =>
                {
                    // Logo / nombre institucional
                    row.RelativeItem(3)
                        .Column(c =>
                        {
                            c.Item()
                                .Text("POLITÉCNICO INTERNACIONAL")
                                .Bold()
                                .FontSize(14)
                                .FontColor(ColorPrimario);

                            c.Item()
                                .Text("Institución de Educación Superior")
                                .FontSize(8)
                                .FontColor(Colors.Grey.Medium);
                        });

                    // Título del documento
                    row.RelativeItem(2)
                        .AlignRight()
                        .Column(c =>
                        {
                            c.Item()
                                .Background(ColorPrimario)
                                .Padding(8)
                                .Text("ACTA DE HOMOLOGACIÓN")
                                .Bold()
                                .FontSize(11)
                                .FontColor(Colors.White)
                                .AlignCenter();

                            c.Item()
                                .Border(1)
                                .BorderColor(ColorBorde)
                                .Padding(5)
                                .Text(
                                    $"Resolución: GR-{_request.CreatedAt.Year}-{_request.Id.ToString()[..8].ToUpper()}"
                                )
                                .FontSize(8)
                                .FontColor(ColorPrimario)
                                .AlignCenter();
                        });
                });

            // Línea divisora
            col.Item().Height(2).Background(ColorSecundario);
        });
    }

    // ── CONTENIDO PRINCIPAL ─────────────────────────────────────────────────

    private void ComposeContent(IContainer container)
    {
        container
            .PaddingTop(15)
            .Column(col =>
            {
                // Sección 1: Datos del estudiante
                col.Item().Element(ComposeDatosEstudiante);
                col.Item().PaddingTop(15).Element(ComposeInfoAcademica);
                col.Item().PaddingTop(15).Element(ComposeMateriasHomologadas);

                // Observaciones del coordinador (si existen)
                if (!string.IsNullOrWhiteSpace(_request.CoordinatorNotes))
                {
                    col.Item().PaddingTop(15).Element(ComposeObservaciones);
                }

                col.Item().PaddingTop(25).Element(ComposeFirmas);
            });
    }

    private void ComposeDatosEstudiante(IContainer container)
    {
        container.Column(col =>
        {
            // Título sección
            col.Item()
                .Background(ColorPrimario)
                .Padding(5)
                .Text("DATOS DEL ESTUDIANTE")
                .Bold()
                .FontSize(9)
                .FontColor(Colors.White);

            col.Item()
                .Border(1)
                .BorderColor(ColorBorde)
                .Padding(10)
                .Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(1);
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(1);
                        cols.RelativeColumn(2);
                    });

                    void Celda(string label, string valor)
                    {
                        table.Cell().Text(label).Bold().FontColor(ColorPrimario);
                        table.Cell().Text(valor).FontColor(Colors.Black);
                    }

                    Celda("Nombre:", _request.StudentName);
                    Celda("Código:", _request.StudentCode);
                    Celda("Fecha de solicitud:", _request.CreatedAt.ToString("dd/MM/yyyy"));
                    Celda(
                        "Fecha de aprobación:",
                        _request.ReviewedAt?.ToString("dd/MM/yyyy") ?? "—"
                    );
                });
        });
    }

    private void ComposeInfoAcademica(IContainer container)
    {
        container.Column(col =>
        {
            col.Item()
                .Background(ColorPrimario)
                .Padding(5)
                .Text("INFORMACIÓN ACADÉMICA")
                .Bold()
                .FontSize(9)
                .FontColor(Colors.White);

            col.Item()
                .Border(1)
                .BorderColor(ColorBorde)
                .Padding(10)
                .Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(1);
                        cols.RelativeColumn(3);
                    });

                    void Fila(string label, string valor)
                    {
                        table.Cell().PaddingBottom(4).Text(label).Bold().FontColor(ColorPrimario);
                        table.Cell().PaddingBottom(4).Text(valor);
                    }

                    Fila(
                        "Programa origen:",
                        $"{_request.SourceProgramCode} — {_request.SourceProgramName}"
                    );
                    Fila(
                        "Programa destino:",
                        $"{_request.TargetProgramCode} — {_request.TargetProgramName}"
                    );
                    Fila(
                        "Total materias homologadas:",
                        $"{_request.TotalSubjectsApproved} asignaturas"
                    );
                    Fila(
                        "Total créditos homologados:",
                        $"{_request.TotalCreditsHomologated} créditos"
                    );
                });
        });
    }

    private void ComposeMateriasHomologadas(IContainer container)
    {
        var subjects = _request
            .Subjects.Where(s => s.IsHomologable)
            .OrderBy(s => s.SourceArea)
            .ThenBy(s => s.SourceSubjectName)
            .ToList();

        container.Column(col =>
        {
            col.Item()
                .Background(ColorPrimario)
                .Padding(5)
                .Text("ASIGNATURAS HOMOLOGADAS")
                .Bold()
                .FontSize(9)
                .FontColor(Colors.White);

            col.Item()
                .Border(1)
                .BorderColor(ColorBorde)
                .Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.ConstantColumn(55); // Código origen
                        cols.RelativeColumn(3); // Nombre origen
                        cols.ConstantColumn(45); // Nota
                        cols.ConstantColumn(55); // Código destino
                        cols.RelativeColumn(3); // Nombre destino
                        cols.ConstantColumn(50); // Créditos
                        cols.ConstantColumn(60); // Área
                    });

                    // Encabezado tabla
                    void Header(string texto)
                    {
                        table
                            .Cell()
                            .Background(ColorSecundario)
                            .Padding(4)
                            .Text(texto)
                            .Bold()
                            .FontSize(8)
                            .FontColor(Colors.White)
                            .AlignCenter();
                    }

                    Header("Cód. Origen");
                    Header("Asignatura Origen");
                    Header("Nota");
                    Header("Cód. Destino");
                    Header("Asignatura Destino");
                    Header("Créditos");
                    Header("Área");

                    // Filas de datos
                    for (int i = 0; i < subjects.Count; i++)
                    {
                        var s = subjects[i];
                        var bgColor = i % 2 == 0 ? "#ffffff" : ColorFilaAlterna;

                        void Celda(string texto, bool center = false)
                        {
                            var cell = table
                                .Cell()
                                .Background(bgColor)
                                .BorderBottom(1)
                                .BorderColor(ColorBorde)
                                .Padding(4);

                            if (center)
                                cell.Text(texto).FontSize(8).AlignCenter();
                            else
                                cell.Text(texto).FontSize(8);
                        }

                        Celda(s.SourceSubjectCode, center: true);
                        Celda(s.SourceSubjectName);
                        Celda(s.SourceGrade.ToString("F1"), center: true);
                        Celda(s.TargetSubjectCode, center: true);
                        Celda(s.TargetSubjectName);
                        Celda(s.TargetCredits.ToString(), center: true);
                        Celda(GetAreaLabel(s.SourceArea), center: true);
                    }
                });
        });
    }

    private void ComposeObservaciones(IContainer container)
    {
        container.Column(col =>
        {
            col.Item()
                .Background(ColorPrimario)
                .Padding(5)
                .Text("OBSERVACIONES")
                .Bold()
                .FontSize(9)
                .FontColor(Colors.White);

            col.Item()
                .Border(1)
                .BorderColor(ColorBorde)
                .Padding(10)
                .Text(_request.CoordinatorNotes ?? string.Empty)
                .FontSize(9)
                .Italic();
        });
    }

    private void ComposeFirmas(IContainer container)
    {
        container.Row(row =>
        {
            // Firma decana
            row.RelativeItem()
                .Column(col =>
                {
                    col.Item().BorderBottom(1).BorderColor(Colors.Black).Height(40);

                    col.Item()
                        .PaddingTop(5)
                        .Text("DECANA DE ÁREA")
                        .Bold()
                        .FontSize(9)
                        .AlignCenter();
                    col.Item()
                        .Text("Politécnico Internacional")
                        .FontSize(8)
                        .AlignCenter()
                        .FontColor(Colors.Grey.Medium);
                });

            row.ConstantItem(40); // Espaciado

            // Firma jefe de registro
            row.RelativeItem()
                .Column(col =>
                {
                    col.Item().BorderBottom(1).BorderColor(Colors.Black).Height(40);

                    col.Item()
                        .PaddingTop(5)
                        .Text("JEFE DE REGISTRO Y CONTROL")
                        .Bold()
                        .FontSize(9)
                        .AlignCenter();
                    col.Item()
                        .Text("Politécnico Internacional")
                        .FontSize(8)
                        .AlignCenter()
                        .FontColor(Colors.Grey.Medium);
                });
        });
    }

    // ── PIE DE PÁGINA ───────────────────────────────────────────────────────

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Height(1).Background(ColorBorde);

            col.Item()
                .PaddingTop(5)
                .Row(row =>
                {
                    row.RelativeItem()
                        .Text(text =>
                        {
                            text.Span("NOTA: ").Bold().FontSize(7);
                            text.Span("Al imprimir el presente documento, se convierte en ")
                                .FontSize(7);
                            text.Span("COPIA NO CONTROLADA").Bold().FontSize(7);
                            text.Span(", a menos que se identifique como ").FontSize(7);
                            text.Span("COPIA CONTROLADA").Bold().FontSize(7);
                            text.Span(".").FontSize(7);
                        });

                    row.ConstantItem(80)
                        .AlignRight()
                        .Text(text =>
                        {
                            text.Span("Página ").FontSize(7).FontColor(Colors.Grey.Medium);
                            text.CurrentPageNumber().FontSize(7).FontColor(Colors.Grey.Medium);
                            text.Span(" de ").FontSize(7).FontColor(Colors.Grey.Medium);
                            text.TotalPages().FontSize(7).FontColor(Colors.Grey.Medium);
                        });
                });
        });
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static string GetAreaLabel(string area) =>
        area switch
        {
            "BASIC" => "Básica",
            "SPECIFIC" => "Específica",
            "COMPLEMENTARY" => "Complementaria",
            _ => area,
        };
}

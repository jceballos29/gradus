using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;

namespace Gradus.Infrastructure.Persistence;

/// <summary>
/// Convierte automáticamente PascalCase → snake_case para tablas y columnas.
/// HomologationRequest → homologation_requests
/// SourceProgramCode   → source_program_code
/// </summary>
public partial class SnakeCaseNamingConvention
    : IEntityTypeAddedConvention,
        IPropertyAddedConvention,
        IForeignKeyOwnershipChangedConvention
{
    public void ProcessEntityTypeAdded(
        IConventionEntityTypeBuilder entityTypeBuilder,
        IConventionContext<IConventionEntityTypeBuilder> context
    )
    {
        var entityType = entityTypeBuilder.Metadata;
        if (entityType.GetTableName() is { } tableName)
        {
            entityTypeBuilder.ToTable(ToSnakeCase(tableName) + "s");
        }
    }

    public void ProcessPropertyAdded(
        IConventionPropertyBuilder propertyBuilder,
        IConventionContext<IConventionPropertyBuilder> context
    )
    {
        var property = propertyBuilder.Metadata;
        if (property.GetColumnName() is { } columnName)
        {
            propertyBuilder.HasColumnName(ToSnakeCase(columnName));
        }
    }

    public void ProcessForeignKeyOwnershipChanged(
        IConventionForeignKeyBuilder relationshipBuilder,
        IConventionContext<bool?> context
    ) { }

    private static string ToSnakeCase(string name)
    {
        return SnakeCaseRegex().Replace(name, "$1_$2").ToLower();
    }

    [GeneratedRegex("([a-z0-9])([A-Z])")]
    private static partial Regex SnakeCaseRegex();
}

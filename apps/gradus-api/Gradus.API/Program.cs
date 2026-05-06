using System.IdentityModel.Tokens.Jwt;
using Gradus.API.Hubs;
using Gradus.API.Middleware;
using Gradus.API.Services;
using Gradus.Application;
using Gradus.Application.Common.Interfaces;
using Gradus.Domain.Interfaces;
using Gradus.Infrastructure;
using Gradus.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

// ── Desactivar remapeo de claim types de JWT ─────────────────────────────
// Por defecto, JwtSecurityTokenHandler remapea "roles" a la URI larga de WS-Federation,
// lo que rompe [Authorize(Roles = "estudiante")] cuando RoleClaimType = "roles".
// Al limpiar el mapa, los claims llegan con sus nombres originales del token.
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
JsonWebTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);
var mediatRLicense = builder.Configuration["MediatR:LicenseKey"];
var config = builder.Configuration;

// ── Controladores ─────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── Swagger con soporte JWT ───────────────────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title = "Gradus API",
            Version = "v1",
            Description = "Sistema de Homologación Académica — Politécnico Internacional",
        }
    );

    // Definición Bearer — nueva sintaxis .NET 10
    c.AddSecurityDefinition(
        "bearer",
        new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "JWT Authorization header usando Bearer. Ejemplo: Bearer {token}",
        }
    );

    // Requirement — nueva sintaxis con lambda y OpenApiSecuritySchemeReference
    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = [],
    });
});

// ── Autenticación Azure AD (JWT Bearer) ──────────────────────────────────
builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://login.microsoftonline.com/{config["AzureAd:TenantId"]}/v2.0";

        // Evitar que el handler vuelva a mapear claim names (ya limpiamos el mapa global).
        options.MapInboundClaims = false;

        // No se usa options.Audience directamente porque necesitamos aceptar
        // múltiples formatos según si el token fue emitido como v1 o v2.
        // Se configura ValidAudiences en TokenValidationParameters.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5),

            // Audiencias válidas:
            // - api://<ClientId>   → token v2 con scope api://ClientId/.default (esperado)
            // - <ClientId>         → token v2 alternativo (algunos flujos de Azure AD)
            ValidAudiences = new[]
            {
                $"api://{config["AzureAd:ClientId"]}",
                config["AzureAd:ClientId"],
            },

            // Azure AD envía roles en el claim "roles" (array).
            // Esto habilita [Authorize(Roles = "coordinador")] correctamente.
            RoleClaimType = "roles",

            // El OID del usuario se expone como claim "oid".
            NameClaimType = "oid",
        };

        // Issuers válidos: Azure AD emite desde v2.0 o desde sts.windows.net (v1)
        // dependiendo de cómo se configuró el App Registration.
        options.TokenValidationParameters.ValidIssuers = new[]
        {
            $"https://login.microsoftonline.com/{config["AzureAd:TenantId"]}/v2.0",
            $"https://sts.windows.net/{config["AzureAd:TenantId"]}/",
        };

        // SignalR WebSocket connections cannot send HTTP headers, so the JS client
        // passes the Bearer token as ?access_token= in the query string.
        // Without this handler, Context.User inside the Hub is always anonymous,
        // IsInRole("coordinador") returns false, and the coordinator never joins
        // "coordinator-group".
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (
                    !string.IsNullOrEmpty(accessToken)
                    && context.Request.Path.StartsWithSegments("/hubs")
                )
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();

// ── Identidad del usuario autenticado ────────────────────────────────────
// Permite leer el OID y los roles del token en cualquier servicio o controller.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// ── SignalR ───────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── CORS ──────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "GradusFrontend",
        policy =>
        {
            policy
                .WithOrigins("http://localhost:3004", "http://localhost:3003")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    );
});

// ── Capas de la aplicación ────────────────────────────────────────────────
builder.Services.AddScoped<IRealtimeNotifier, SignalRNotifier>();
builder.Services.AddApplication(mediatRLicense);
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// ── Migraciones y seed en desarrollo ─────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<GradusDbContext>();
    await db.Database.MigrateAsync();
    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
    await seeder.SeedAsync();

    // Swagger solo en desarrollo
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Gradus API v1");
        c.RoutePrefix = "swagger";
        c.DisplayRequestDuration();
    });
}

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("GradusFrontend");
app.UseMiddleware<ExceptionHandlingMiddleware>();

// El orden importa: Authentication antes de Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// ── Endpoints fijos ───────────────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithTags("Health")
    .AllowAnonymous();

app.MapGet(
        "/documents/{fileName}",
        (string fileName) =>
        {
            var path = Path.Combine(Directory.GetCurrentDirectory(), "documents", fileName);
            if (!File.Exists(path))
                return Results.NotFound();
            return Results.File(path, "application/pdf", fileName);
        }
    )
    .WithTags("Documents");

// Endpoint de prueba M2M — solo en desarrollo
if (app.Environment.IsDevelopment())
{
    app.MapGet(
            "/test/universitas/{identity}",
            async (string identity, IUniversitasClient client, CancellationToken ct) =>
            {
                var profile = await client.GetStudentProfileAsync(identity, ct);
                var history = await client.GetStudentHistoryAsync(identity, ct);
                return Results.Ok(new { profile, history });
            }
        )
        .WithTags("Test");
}

app.Run();

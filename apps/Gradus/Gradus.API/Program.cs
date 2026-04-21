var builder = WebApplication.CreateBuilder(args);

// ── Servicios ──────────────────────────────────────────────
// Aquí registraremos todos los servicios en las fases siguientes.
// Por ahora solo lo mínimo para que el servidor arranque.

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── Pipeline HTTP ───────────────────────────────────────────
var app = builder.Build();

// HTTPS solo en producción — en desarrollo lo maneja Nginx
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.MapControllers();

// Endpoint de salud — Docker y Kubernetes lo usan para
// saber si el servicio está vivo antes de enviarle tráfico
app.MapGet("/health", () => Results.Ok(new { status = "healthy" })).WithTags("Health");

app.Run();

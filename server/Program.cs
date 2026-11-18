using System.Text.Json.Serialization;
using LibraryInventory.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Data Source=library.db;Foreign Keys=True";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

const string ClientCors = "ClientCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCors, policy => policy
        .WithOrigins("http://localhost:5173", "http://localhost:4173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

await ApplyDatabaseMigrationsAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler("/error");

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors(ClientCors);

app.MapControllers();

app.Map("/error", (HttpContext context) =>
    Results.Problem(
        title: "Внутренняя ошибка сервера",
        detail: "Произошла непредвиденная ошибка. Попробуйте ещё раз.",
        statusCode: StatusCodes.Status500InternalServerError));

var webRoot = app.Environment.WebRootPath
    ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var indexPath = Path.Combine(webRoot, "index.html");

if (File.Exists(indexPath))
{
    app.MapFallback(async context =>
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.SendFileAsync(indexPath);
    });
}

app.Run();

static async Task ApplyDatabaseMigrationsAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
    if (pending.Count == 0)
    {
        await EnsureSqliteWalModeAsync(db);
        return;
    }

    var applied = (await db.Database.GetAppliedMigrationsAsync()).Any();
    if (!applied && await HasLegacySchemaAsync(db))
    {
        await BaselineInitialMigrationAsync(db);
        pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count == 0)
        {
            await EnsureSqliteWalModeAsync(db);
            return;
        }
    }

    await db.Database.MigrateAsync();
    await EnsureSqliteWalModeAsync(db);
}

static async Task<bool> HasLegacySchemaAsync(AppDbContext db)
{
    const string sql = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'Computers';";

    await using var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State != System.Data.ConnectionState.Open;
    if (shouldClose)
    {
        await connection.OpenAsync();
    }

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result) > 0;
    }
    finally
    {
        if (shouldClose)
        {
            await connection.CloseAsync();
        }
    }
}

static async Task BaselineInitialMigrationAsync(AppDbContext db)
{
    var migrations = db.Database.GetMigrations().ToList();
    var initialMigration = migrations
        .FirstOrDefault(m => m.EndsWith("_InitialCreate", StringComparison.Ordinal))
        ?? migrations.FirstOrDefault();

    if (initialMigration is null)
    {
        return;
    }

    await db.Database.ExecuteSqlRawAsync(
        "CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\" (" +
        "\"MigrationId\" TEXT NOT NULL CONSTRAINT \"PK___EFMigrationsHistory\" PRIMARY KEY, " +
        "\"ProductVersion\" TEXT NOT NULL);");

    await db.Database.ExecuteSqlRawAsync(
        "INSERT OR IGNORE INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") " +
        "VALUES ({0}, {1});",
        initialMigration,
        "8.0.28");
}

static async Task EnsureSqliteWalModeAsync(AppDbContext db)
{
    await using var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State != System.Data.ConnectionState.Open;
    if (shouldClose)
    {
        await connection.OpenAsync();
    }

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA journal_mode=WAL;";
        await command.ExecuteNonQueryAsync();
        await using var fk = connection.CreateCommand();
        fk.CommandText = "PRAGMA foreign_keys=ON;";
        await fk.ExecuteNonQueryAsync();
    }
    finally
    {
        if (shouldClose)
        {
            await connection.CloseAsync();
        }
    }
}

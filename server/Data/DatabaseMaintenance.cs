using Microsoft.EntityFrameworkCore;

namespace LibraryInventory.Api.Data;

public static class DatabaseMaintenance
{
    public static async Task PrepareAsync(
        AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        await ApplyMigrationsAsync(db, cancellationToken);
        await InventoryRegistry.RebuildAsync(db, cancellationToken);
        await EnsureSqliteWalModeAsync(db, cancellationToken);
    }

    public static async Task ApplyMigrationsAsync(
        AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
        if (pending.Count == 0)
        {
            return;
        }

        var applied = (await db.Database.GetAppliedMigrationsAsync(cancellationToken)).Any();
        if (!applied && await HasLegacySchemaAsync(db, cancellationToken))
        {
            await BaselineInitialMigrationAsync(db, cancellationToken);
            pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
            if (pending.Count == 0)
            {
                return;
            }
        }

        await db.Database.MigrateAsync(cancellationToken);
    }

    private static async Task<bool> HasLegacySchemaAsync(
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        const string sql = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'Computers';";
        var result = await ExecuteScalarAsync(db, sql, cancellationToken);
        return Convert.ToInt32(result) > 0;
    }

    private static async Task BaselineInitialMigrationAsync(
        AppDbContext db,
        CancellationToken cancellationToken)
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
            """
            CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
                "ProductVersion" TEXT NOT NULL
            );
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT OR IGNORE INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            VALUES ({0}, {1});
            """,
            [initialMigration, "8.0.28"],
            cancellationToken);
    }

    private static async Task EnsureSqliteWalModeAsync(
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        await using var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "PRAGMA journal_mode=WAL;";
            await command.ExecuteNonQueryAsync(cancellationToken);

            await using var foreignKeys = connection.CreateCommand();
            foreignKeys.CommandText = "PRAGMA foreign_keys=ON;";
            await foreignKeys.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<object?> ExecuteScalarAsync(
        AppDbContext db,
        string sql,
        CancellationToken cancellationToken)
    {
        await using var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            return await command.ExecuteScalarAsync(cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }
}

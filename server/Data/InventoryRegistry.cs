using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace LibraryInventory.Api.Data;

public static class InventoryRegistry
{
    public const string CreateSql = """
        CREATE TABLE IF NOT EXISTS "InventoryNumberRegistry" (
            "InventoryKey" TEXT NOT NULL CONSTRAINT "PK_InventoryNumberRegistry" PRIMARY KEY,
            "OwnerTable" TEXT NOT NULL CONSTRAINT "CK_InventoryNumberRegistry_OwnerTable" CHECK ("OwnerTable" IN ('Computers', 'Devices')),
            "OwnerId" INTEGER NOT NULL
        );

        CREATE TRIGGER IF NOT EXISTS "trg_Computers_InventoryNumber_Insert"
        AFTER INSERT ON "Computers"
        BEGIN
            SELECT RAISE(ABORT, 'Inventory number is required')
            WHERE NEW."InventoryNumberKey" IS NULL OR TRIM(NEW."InventoryNumberKey") = '';

            INSERT INTO "InventoryNumberRegistry" ("InventoryKey", "OwnerTable", "OwnerId")
            VALUES (NEW."InventoryNumberKey", 'Computers', NEW."Id");
        END;

        CREATE TRIGGER IF NOT EXISTS "trg_Computers_InventoryNumber_Update"
        AFTER UPDATE OF "InventoryNumberKey", "Id" ON "Computers"
        BEGIN
            SELECT RAISE(ABORT, 'Inventory number is required')
            WHERE NEW."InventoryNumberKey" IS NULL OR TRIM(NEW."InventoryNumberKey") = '';

            DELETE FROM "InventoryNumberRegistry"
            WHERE "OwnerTable" = 'Computers' AND "OwnerId" = OLD."Id";

            INSERT INTO "InventoryNumberRegistry" ("InventoryKey", "OwnerTable", "OwnerId")
            VALUES (NEW."InventoryNumberKey", 'Computers', NEW."Id");
        END;

        CREATE TRIGGER IF NOT EXISTS "trg_Computers_InventoryNumber_Delete"
        AFTER DELETE ON "Computers"
        BEGIN
            DELETE FROM "InventoryNumberRegistry"
            WHERE "OwnerTable" = 'Computers' AND "OwnerId" = OLD."Id";
        END;

        CREATE TRIGGER IF NOT EXISTS "trg_Devices_InventoryNumber_Insert"
        AFTER INSERT ON "Devices"
        BEGIN
            SELECT RAISE(ABORT, 'Inventory number is required')
            WHERE NEW."InventoryNumberKey" IS NULL OR TRIM(NEW."InventoryNumberKey") = '';

            INSERT INTO "InventoryNumberRegistry" ("InventoryKey", "OwnerTable", "OwnerId")
            VALUES (NEW."InventoryNumberKey", 'Devices', NEW."Id");
        END;

        CREATE TRIGGER IF NOT EXISTS "trg_Devices_InventoryNumber_Update"
        AFTER UPDATE OF "InventoryNumberKey", "Id" ON "Devices"
        BEGIN
            SELECT RAISE(ABORT, 'Inventory number is required')
            WHERE NEW."InventoryNumberKey" IS NULL OR TRIM(NEW."InventoryNumberKey") = '';

            DELETE FROM "InventoryNumberRegistry"
            WHERE "OwnerTable" = 'Devices' AND "OwnerId" = OLD."Id";

            INSERT INTO "InventoryNumberRegistry" ("InventoryKey", "OwnerTable", "OwnerId")
            VALUES (NEW."InventoryNumberKey", 'Devices', NEW."Id");
        END;

        CREATE TRIGGER IF NOT EXISTS "trg_Devices_InventoryNumber_Delete"
        AFTER DELETE ON "Devices"
        BEGIN
            DELETE FROM "InventoryNumberRegistry"
            WHERE "OwnerTable" = 'Devices' AND "OwnerId" = OLD."Id";
        END;
        """;

    public const string DropSql = """
        DROP TRIGGER IF EXISTS "trg_Computers_InventoryNumber_Insert";
        DROP TRIGGER IF EXISTS "trg_Computers_InventoryNumber_Update";
        DROP TRIGGER IF EXISTS "trg_Computers_InventoryNumber_Delete";
        DROP TRIGGER IF EXISTS "trg_Devices_InventoryNumber_Insert";
        DROP TRIGGER IF EXISTS "trg_Devices_InventoryNumber_Update";
        DROP TRIGGER IF EXISTS "trg_Devices_InventoryNumber_Delete";
        DROP TABLE IF EXISTS "InventoryNumberRegistry";
        """;

    public static async Task EnsureAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        await ExecuteSqlAsync(db, CreateSql, cancellationToken);
    }

    public static async Task DropAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        await ExecuteSqlAsync(db, DropSql, cancellationToken);
    }

    public static async Task RebuildAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        await EnsureAsync(db, cancellationToken);

        var keys = await InventoryNumberGuard.LoadOwnedKeysAsync(db, cancellationToken);
        var duplicates = keys
            .GroupBy(item => item.Key, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .ToList();

        if (duplicates.Count > 0)
        {
            var details = duplicates
                .Select(group => $"«{group.Key}»: {string.Join(", ", group.Select(item => item.Owner))}")
                .Take(10);
            throw new InvalidOperationException(
                "В базе обнаружены повторяющиеся инвентарные номера у компьютеров и устройств. " +
                "Устраните дубликаты до запуска приложения: " + string.Join("; ", details) + ".");
        }

        await using var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
            await ExecuteAsync(connection, transaction, "DELETE FROM \"InventoryNumberRegistry\";", cancellationToken);

            foreach (var item in keys)
            {
                var table = item.Owner.StartsWith("computer:", StringComparison.Ordinal) ? "Computers" : "Devices";
                var sql = $"UPDATE \"{table}\" SET \"InventoryNumberKey\" = @key WHERE \"Id\" = @id;";
                await ExecuteAsync(
                    connection,
                    transaction,
                    sql,
                    cancellationToken,
                    ("@key", item.Key),
                    ("@id", item.Id));
            }

            await transaction.CommitAsync(cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task ExecuteSqlAsync(
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
            await ExecuteAsync(connection, null, sql, cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task ExecuteAsync(
        DbConnection connection,
        DbTransaction? transaction,
        string sql,
        CancellationToken cancellationToken,
        params (string Name, object Value)[] parameters)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Transaction = transaction;

        foreach (var (name, value) in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value;
            command.Parameters.Add(parameter);
        }

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}

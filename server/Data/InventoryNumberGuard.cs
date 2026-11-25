using System.Text;
using LibraryInventory.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace LibraryInventory.Api.Data;

public sealed class InventoryNumberConflictException : Exception
{
    public InventoryNumberConflictException(string message) : base(message)
    {
    }
}

public static class InventoryNumberGuard
{
    private const int KeyMaxLength = 200;

    public sealed record OwnedKey(string Key, string Owner, int Id);
    private sealed record SourceRow(int Id, string InventoryNumber);

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim().Normalize(NormalizationForm.FormKC);
        var builder = new StringBuilder(normalized.Length);
        var pendingSpace = false;

        foreach (var ch in normalized)
        {
            if (char.IsWhiteSpace(ch))
            {
                pendingSpace = builder.Length > 0;
                continue;
            }

            if (pendingSpace)
            {
                builder.Append(' ');
                pendingSpace = false;
            }

            builder.Append(ch);
        }

        var result = builder.ToString().ToUpperInvariant();
        return result.Length <= KeyMaxLength ? result : result[..KeyMaxLength];
    }

    public static async Task<bool> IsTakenAsync(
        AppDbContext db,
        string inventoryNumber,
        int? computerId = null,
        int? deviceId = null,
        CancellationToken cancellationToken = default)
    {
        var key = Normalize(inventoryNumber);
        if (key.Length == 0)
        {
            return false;
        }

        var owner = computerId.HasValue ? $"computer:{computerId.Value}" : deviceId.HasValue ? $"device:{deviceId.Value}" : null;
        var keys = await LoadOwnedKeysAsync(db, cancellationToken);
        return keys.Any(item => item.Key == key && item.Owner != owner);
    }

    public static async Task<List<OwnedKey>> LoadOwnedKeysAsync(
        AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        var computers = await db.Computers
            .AsNoTracking()
            .Select(c => new { c.Id, c.InventoryNumber })
            .ToListAsync(cancellationToken);

        var devices = await db.Devices
            .AsNoTracking()
            .Select(d => new { d.Id, d.InventoryNumber })
            .ToListAsync(cancellationToken);

        var keys = computers
            .Select(c => new OwnedKey(Normalize(c.InventoryNumber), $"computer:{c.Id}", c.Id))
            .Concat(devices.Select(d => new OwnedKey(Normalize(d.InventoryNumber), $"device:{d.Id}", d.Id)))
            .Where(item => item.Key.Length > 0)
            .ToList();

        return keys;
    }

    public static void PrepareChanges(AppDbContext db)
    {
        var entries = GetInventoryEntries(db);
        ApplyKeys(entries);
        ValidateChanges(db, entries);
    }

    public static async Task PrepareChangesAsync(
        AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        var entries = GetInventoryEntries(db);
        ApplyKeys(entries);
        await ValidateChangesAsync(db, entries, cancellationToken);
    }

    private static List<EntityEntry> GetInventoryEntries(AppDbContext db)
    {
        db.ChangeTracker.DetectChanges();

        return db.ChangeTracker.Entries()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Where(entry => entry.Entity is Computer or Device)
            .ToList();
    }

    private static void ApplyKeys(IEnumerable<EntityEntry> entries)
    {
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Deleted)
            {
                continue;
            }

            switch (entry.Entity)
            {
                case Computer computer:
                    computer.InventoryNumberKey = Normalize(computer.InventoryNumber);
                    break;
                case Device device:
                    device.InventoryNumberKey = Normalize(device.InventoryNumber);
                    break;
            }
        }
    }

    private static void ValidateChanges(AppDbContext db, List<EntityEntry> entries)
    {
        var pending = GetPendingKeys(entries);
        if (pending.Count == 0)
        {
            return;
        }

        var excludedComputers = GetExcludedIds(entries, isComputer: true);
        var excludedDevices = GetExcludedIds(entries, isComputer: false);

        var computers = db.Computers
            .AsNoTracking()
            .Where(c => !excludedComputers.Contains(c.Id))
            .Select(c => new SourceRow(c.Id, c.InventoryNumber))
            .ToList();

        var devices = db.Devices
            .AsNoTracking()
            .Where(d => !excludedDevices.Contains(d.Id))
            .Select(d => new SourceRow(d.Id, d.InventoryNumber))
            .ToList();

        var seen = BuildSeenKeys(computers, devices);
        AddPendingKeys(seen, pending);
    }

    private static async Task ValidateChangesAsync(
        AppDbContext db,
        List<EntityEntry> entries,
        CancellationToken cancellationToken)
    {
        var pending = GetPendingKeys(entries);
        if (pending.Count == 0)
        {
            return;
        }

        var excludedComputers = GetExcludedIds(entries, isComputer: true);
        var excludedDevices = GetExcludedIds(entries, isComputer: false);

        var computers = await db.Computers
            .AsNoTracking()
            .Where(c => !excludedComputers.Contains(c.Id))
            .Select(c => new SourceRow(c.Id, c.InventoryNumber))
            .ToListAsync(cancellationToken);

        var devices = await db.Devices
            .AsNoTracking()
            .Where(d => !excludedDevices.Contains(d.Id))
            .Select(d => new SourceRow(d.Id, d.InventoryNumber))
            .ToListAsync(cancellationToken);

        var seen = BuildSeenKeys(computers, devices);
        AddPendingKeys(seen, pending);
    }

    private static List<OwnedKey> GetPendingKeys(IEnumerable<EntityEntry> entries) =>
        entries
            .Where(entry => entry.State != EntityState.Deleted)
            .Select(entry => entry.Entity switch
            {
                Computer c => new OwnedKey(Normalize(c.InventoryNumber), $"computer:{c.Id}", c.Id),
                Device d => new OwnedKey(Normalize(d.InventoryNumber), $"device:{d.Id}", d.Id),
                _ => null
            })
            .Where(item => item is not null && item.Key.Length > 0)
            .Select(item => item!)
            .ToList();

    private static HashSet<int> GetExcludedIds(IEnumerable<EntityEntry> entries, bool isComputer) =>
        entries
            .Where(entry => isComputer ? entry.Entity is Computer : entry.Entity is Device)
            .Select(entry => isComputer ? ((Computer)entry.Entity).Id : ((Device)entry.Entity).Id)
            .Where(id => id > 0)
            .ToHashSet();

    private static Dictionary<string, string> BuildSeenKeys(
        IEnumerable<SourceRow> computers,
        IEnumerable<SourceRow> devices)
    {
        var seen = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var computer in computers)
        {
            AddSeen(seen, Normalize(computer.InventoryNumber), $"computer:{computer.Id}");
        }

        foreach (var device in devices)
        {
            AddSeen(seen, Normalize(device.InventoryNumber), $"device:{device.Id}");
        }

        return seen;
    }

    private static void AddPendingKeys(Dictionary<string, string> seen, IEnumerable<OwnedKey> pending)
    {
        foreach (var item in pending)
        {
            AddSeen(seen, item.Key, item.Owner);
        }
    }

    private static void AddSeen(Dictionary<string, string> seen, string key, string owner)
    {
        if (key.Length == 0)
        {
            return;
        }

        if (seen.TryGetValue(key, out var existing) && existing != owner)
        {
            throw new InventoryNumberConflictException(
                "Инвентарный номер уже используется компьютером или устройством. Один инвентарный номер может принадлежать только одному оборудованию.");
        }

        seen[key] = owner;
    }
}

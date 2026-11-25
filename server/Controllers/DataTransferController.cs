using System.Globalization;
using System.Text;
using LibraryInventory.Api.Data;
using LibraryInventory.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LibraryInventory.Api.Controllers;

[ApiController]
[Route("api")]
public class DataTransferController(AppDbContext db) : ControllerBase
{
    private static readonly string[] ComputerColumns =
    [
        "InventoryNumber","Status","Model","Processor","GraphicsCard","RamGb","Storage","Motherboard",
        "OperatingSystem","Location","AssignedTo","CommissionedOn","DecommissionedOn","DecommissionReason","Notes"
    ];

    private static readonly string[] DeviceColumns =
    [
        "InventoryNumber","Status","Type","Manufacturer","Model","SerialNumber","ComputerInventoryNumber",
        "DecommissionedOn","DecommissionReason","Notes"
    ];

    [HttpGet("computers/export.csv")]
    public async Task<IActionResult> ExportComputersCsv()
    {
        var items = await db.Computers
            .AsNoTracking()
            .OrderBy(c => c.InventoryNumber)
            .ToListAsync();

        var sb = new StringBuilder();
        WriteCsvRow(sb, ComputerColumns);
        foreach (var c in items)
        {
            WriteCsvRow(sb,
            [
                c.InventoryNumber,
                c.Status.ToString(),
                c.Model,
                c.Processor,
                c.GraphicsCard,
                c.RamGb?.ToString(CultureInfo.InvariantCulture),
                c.Storage,
                c.Motherboard,
                c.OperatingSystem,
                c.Location,
                c.AssignedTo,
                c.CommissionedOn?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                c.DecommissionedOn?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                c.DecommissionReason,
                c.Notes
            ]);
        }

        return CsvFile(sb, "computers");
    }

    [HttpGet("devices/export.csv")]
    public async Task<IActionResult> ExportDevicesCsv()
    {
        var items = await db.Devices
            .AsNoTracking()
            .Include(d => d.Computer)
            .OrderBy(d => d.Type)
            .ThenBy(d => d.InventoryNumber)
            .ToListAsync();

        var sb = new StringBuilder();
        WriteCsvRow(sb, DeviceColumns);
        foreach (var d in items)
        {
            WriteCsvRow(sb,
            [
                d.InventoryNumber,
                d.Status.ToString(),
                d.Type.ToString(),
                d.Manufacturer,
                d.Model,
                d.SerialNumber,
                d.Computer?.InventoryNumber,
                d.DecommissionedOn?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                d.DecommissionReason,
                d.Notes
            ]);
        }

        return CsvFile(sb, "devices");
    }

    [HttpPost("computers/import.csv")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<ImportResult>> ImportComputersCsv(IFormFile? file, [FromQuery] string mode = "upsert")
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Выберите CSV-файл для импорта." });

        var rows = await ReadCsvAsync(file);
        if (rows.Count == 0)
            return BadRequest(new { message = "Файл пуст или имеет неверный формат." });

        var upsert = !string.Equals(mode, "insert", StringComparison.OrdinalIgnoreCase);
        var result = new ImportResult();
        var owners = await LoadOwnersByKeyAsync();
        var seenInFile = new HashSet<string>(StringComparer.Ordinal);

        foreach (var (row, index) in rows.Select((r, i) => (r, i + 2)))
        {
            var invRaw = Get(row, "InventoryNumber");
            if (string.IsNullOrWhiteSpace(invRaw))
            {
                result.Errors.Add($"Строка {index}: не указан InventoryNumber.");
                continue;
            }

            var inv = invRaw.Trim();
            var key = InventoryNumberGuard.Normalize(inv);
            if (key.Length == 0 || !seenInFile.Add(key))
            {
                result.Errors.Add($"Строка {index}: инвентарный номер '{inv}' повторяется в файле.");
                continue;
            }

            owners.TryGetValue(key, out var owner);
            Computer? existingComputer = null;

            if (owner?.StartsWith("computer:", StringComparison.Ordinal) == true)
            {
                var id = OwnerId(owner);
                existingComputer = await db.Computers.FirstOrDefaultAsync(c => c.Id == id);
            }
            else if (owner is not null)
            {
                result.Errors.Add($"Строка {index}: инвентарный номер '{inv}' уже используется устройством.");
                continue;
            }

            if (existingComputer is null)
            {
                var computer = new Computer
                {
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                if (!TryApplyComputer(computer, row, index, result.Errors)) continue;
                db.Computers.Add(computer);
                result.Created++;
            }
            else if (upsert)
            {
                if (!TryApplyComputer(existingComputer, row, index, result.Errors)) continue;
                existingComputer.UpdatedAt = DateTime.UtcNow;
                result.Updated++;
            }
            else
            {
                result.Skipped++;
            }
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch (InventoryNumberConflictException ex)
        {
            return Conflict(new { message = ex.Message, result });
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException { SqliteErrorCode: 19 })
        {
            return Conflict(new { message = "Конфликт уникальности при импорте. Проверьте дубли инвентарных номеров (включая совпадения между компьютерами и устройствами).", result });
        }

        return Ok(result);
    }

    [HttpPost("devices/import.csv")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<ImportResult>> ImportDevicesCsv(IFormFile? file, [FromQuery] string mode = "upsert")
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Выберите CSV-файл для импорта." });

        var rows = await ReadCsvAsync(file);
        if (rows.Count == 0)
            return BadRequest(new { message = "Файл пуст или имеет неверный формат." });

        var upsert = !string.Equals(mode, "insert", StringComparison.OrdinalIgnoreCase);
        var result = new ImportResult();
        var owners = await LoadOwnersByKeyAsync();
        var seenInFile = new HashSet<string>(StringComparer.Ordinal);

        foreach (var (row, index) in rows.Select((r, i) => (r, i + 2)))
        {
            var invRaw = Get(row, "InventoryNumber");
            if (string.IsNullOrWhiteSpace(invRaw))
            {
                result.Errors.Add($"Строка {index}: не указан InventoryNumber.");
                continue;
            }

            var inv = invRaw.Trim();
            var key = InventoryNumberGuard.Normalize(inv);
            if (key.Length == 0 || !seenInFile.Add(key))
            {
                result.Errors.Add($"Строка {index}: инвентарный номер '{inv}' повторяется в файле.");
                continue;
            }

            owners.TryGetValue(key, out var owner);
            Device? existingDevice = null;

            if (owner?.StartsWith("device:", StringComparison.Ordinal) == true)
            {
                var id = OwnerId(owner);
                existingDevice = await db.Devices.FirstOrDefaultAsync(d => d.Id == id);
            }
            else if (owner is not null)
            {
                result.Errors.Add($"Строка {index}: инвентарный номер '{inv}' уже используется компьютером.");
                continue;
            }

            if (existingDevice is null)
            {
                var device = new Device { CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
                if (!TryApplyDevice(device, row, owners, index, result.Errors)) continue;
                db.Devices.Add(device);
                result.Created++;
            }
            else if (upsert)
            {
                if (!TryApplyDevice(existingDevice, row, owners, index, result.Errors)) continue;
                existingDevice.UpdatedAt = DateTime.UtcNow;
                result.Updated++;
            }
            else
            {
                result.Skipped++;
            }
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch (InventoryNumberConflictException ex)
        {
            return Conflict(new { message = ex.Message, result });
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException { SqliteErrorCode: 19 })
        {
            return Conflict(new { message = "Конфликт уникальности при импорте. Проверьте дубли инвентарных номеров (включая совпадения между компьютерами и устройствами).", result });
        }

        return Ok(result);
    }

    private async Task<Dictionary<string, string>> LoadOwnersByKeyAsync()
    {
        var keys = await InventoryNumberGuard.LoadOwnedKeysAsync(db);
        return keys
            .GroupBy(item => item.Key, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First().Owner, StringComparer.Ordinal);
    }

    private static int OwnerId(string owner) =>
        int.Parse(owner[(owner.IndexOf(':') + 1)..], CultureInfo.InvariantCulture);

    private static bool TryApplyComputer(Computer c, Dictionary<string, string> row, int index, List<string> errors)
    {
        var inv = Get(row, "InventoryNumber")?.Trim();
        if (string.IsNullOrWhiteSpace(inv)) { errors.Add($"Строка {index}: пустой InventoryNumber."); return false; }
        c.InventoryNumber = inv;
        c.Model = Clean(Get(row, "Model"));
        c.Processor = Clean(Get(row, "Processor"));
        c.GraphicsCard = Clean(Get(row, "GraphicsCard"));
        c.RamGb = ParseInt(Get(row, "RamGb"));
        c.Storage = Clean(Get(row, "Storage"));
        c.Motherboard = Clean(Get(row, "Motherboard"));
        c.OperatingSystem = Clean(Get(row, "OperatingSystem"));
        c.Location = Clean(Get(row, "Location"));
        c.AssignedTo = Clean(Get(row, "AssignedTo"));
        c.CommissionedOn = ParseDate(Get(row, "CommissionedOn"));
        c.DecommissionedOn = ParseDate(Get(row, "DecommissionedOn"));
        c.DecommissionReason = Clean(Get(row, "DecommissionReason"));
        c.Notes = Clean(Get(row, "Notes"));
        var statusStr = Get(row, "Status");
        if (!TryParseStatus(statusStr, out var status))
        {
            errors.Add($"Строка {index}: некорректный статус '{statusStr}'.");
            return false;
        }
        c.Status = status;
        return true;
    }

    private bool TryApplyDevice(
        Device d,
        Dictionary<string, string> row,
        Dictionary<string, string> owners,
        int index,
        List<string> errors)
    {
        var inv = Get(row, "InventoryNumber")?.Trim();
        if (string.IsNullOrWhiteSpace(inv)) { errors.Add($"Строка {index}: пустой InventoryNumber."); return false; }
        d.InventoryNumber = inv;

        var statusStr = Get(row, "Status");
        if (!TryParseStatus(statusStr, out var status))
        {
            errors.Add($"Строка {index}: некорректный статус '{statusStr}'.");
            return false;
        }
        d.Status = status;

        var typeStr = Get(row, "Type");
        if (!TryParseDeviceType(typeStr, out var type))
        {
            errors.Add($"Строка {index}: некорректный тип устройства '{typeStr}'.");
            return false;
        }
        d.Type = type;

        d.Manufacturer = Clean(Get(row, "Manufacturer"));
        d.Model = Clean(Get(row, "Model"));
        d.SerialNumber = Clean(Get(row, "SerialNumber"));
        d.DecommissionedOn = ParseDate(Get(row, "DecommissionedOn"));
        d.DecommissionReason = Clean(Get(row, "DecommissionReason"));
        d.Notes = Clean(Get(row, "Notes"));

        var compInv = Clean(Get(row, "ComputerInventoryNumber"));
        if (compInv is null)
        {
            d.ComputerId = null;
        }
        else
        {
            var compKey = InventoryNumberGuard.Normalize(compInv);
            if (!owners.TryGetValue(compKey, out var owner) ||
                !owner.StartsWith("computer:", StringComparison.Ordinal))
            {
                errors.Add($"Строка {index}: компьютер с инвентарным номером '{compInv}' не найден.");
                return false;
            }
            d.ComputerId = OwnerId(owner);
        }

        return true;
    }

    private static bool TryParseStatus(string? value, out EquipmentStatus status)
    {
        if (string.IsNullOrWhiteSpace(value)) { status = EquipmentStatus.InUse; return true; }
        return Enum.TryParse(value.Trim(), ignoreCase: true, out status);
    }

    private static bool TryParseDeviceType(string? value, out DeviceType type)
    {
        if (string.IsNullOrWhiteSpace(value)) { type = DeviceType.Other; return true; }
        return Enum.TryParse(value.Trim(), ignoreCase: true, out type);
    }

    private static string? Get(Dictionary<string, string> row, string key)
    {
        if (row.TryGetValue(key, out var v)) return v;
        var match = row.Keys.FirstOrDefault(k => string.Equals(k, key, StringComparison.OrdinalIgnoreCase));
        return match is null ? null : row[match];
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static int? ParseInt(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        return int.TryParse(v.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n : null;
    }

    private static DateOnly? ParseDate(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        if (DateOnly.TryParse(v.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)) return d;
        if (DateOnly.TryParse(v.Trim(), out d)) return d;
        return null;
    }

    private static async Task<List<Dictionary<string, string>>> ReadCsvAsync(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var content = await reader.ReadToEndAsync();
        if (content.Length > 0 && content[0] == '\uFEFF') content = content[1..];
        var records = ParseCsv(content);
        if (records.Count == 0) return [];
        var headers = records[0].Select(h => h.Trim()).ToArray();
        var list = new List<Dictionary<string, string>>();
        for (int i = 1; i < records.Count; i++)
        {
            var row = records[i];
            if (row.Count == 1 && string.IsNullOrWhiteSpace(row[0])) continue;
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int j = 0; j < headers.Length; j++)
            {
                dict[headers[j]] = j < row.Count ? row[j] : "";
            }
            list.Add(dict);
        }
        return list;
    }

    private static List<List<string>> ParseCsv(string content)
    {
        var rows = new List<List<string>>();
        var row = new List<string>();
        var field = new StringBuilder();
        bool inQuotes = false;
        for (int i = 0; i < content.Length; i++)
        {
            var ch = content[i];
            if (inQuotes)
            {
                if (ch == '"' && i + 1 < content.Length && content[i + 1] == '"')
                {
                    field.Append('"');
                    i++;
                }
                else if (ch == '"')
                {
                    inQuotes = false;
                }
                else
                {
                    field.Append(ch);
                }
            }
            else
            {
                if (ch == '"') inQuotes = true;
                else if (ch == ',') { row.Add(field.ToString()); field.Clear(); }
                else if (ch == '\r') { }
                else if (ch == '\n') { row.Add(field.ToString()); field.Clear(); rows.Add(row); row = []; }
                else field.Append(ch);
            }
        }
        if (field.Length > 0 || row.Count > 0) { row.Add(field.ToString()); rows.Add(row); }
        return rows;
    }

    private static void WriteCsvRow(StringBuilder sb, IEnumerable<string?> values)
    {
        bool first = true;
        foreach (var v in values)
        {
            if (!first) sb.Append(',');
            first = false;
            var s = v ?? "";
            if (s.IndexOfAny([',', '"', '\n', '\r']) >= 0)
            {
                sb.Append('"').Append(s.Replace("\"", "\"\"")).Append('"');
            }
            else
            {
                sb.Append(s);
            }
        }
        sb.Append("\r\n");
    }

    private static IActionResult CsvFile(StringBuilder sb, string prefix)
    {
        var utf8Bom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        var bytes = utf8Bom.GetBytes(sb.ToString());
        var name = $"{prefix}-{DateTime.Now:yyyyMMdd-HHmmss}.csv";
        return new FileContentResult(bytes, "text/csv; charset=utf-8")
        {
            FileDownloadName = name
        };
    }

    public class ImportResult
    {
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = [];
    }
}

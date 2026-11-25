using LibraryInventory.Api.Data;
using LibraryInventory.Api.Dtos;
using LibraryInventory.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LibraryInventory.Api.Controllers;

[ApiController]
[Route("api/devices")]
public class DevicesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DeviceDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? computerId,
        [FromQuery] DeviceType? type,
        [FromQuery] EquipmentStatus? status,
        [FromQuery] bool? unassigned)
    {
        var query = db.Devices
            .AsNoTracking()
            .Include(d => d.Computer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(d =>
                EF.Functions.Like(d.InventoryNumber, pattern) ||
                (d.Manufacturer != null && EF.Functions.Like(d.Manufacturer, pattern)) ||
                (d.Model != null && EF.Functions.Like(d.Model, pattern)) ||
                (d.SerialNumber != null && EF.Functions.Like(d.SerialNumber, pattern)) ||
                (d.DecommissionReason != null && EF.Functions.Like(d.DecommissionReason, pattern)) ||
                (d.Notes != null && EF.Functions.Like(d.Notes, pattern)) ||
                (d.Computer != null && EF.Functions.Like(d.Computer.InventoryNumber, pattern)));
        }

        if (computerId.HasValue)
        {
            query = query.Where(d => d.ComputerId == computerId.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(d => d.Type == type.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(d => d.Status == status.Value);
        }

        if (unassigned == true)
        {
            query = query.Where(d => d.ComputerId == null);
        }

        var devices = await query
            .OrderBy(d => d.Type)
            .ThenBy(d => d.InventoryNumber)
            .ToListAsync();

        return Ok(devices.Select(d => d.ToDto()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DeviceDto>> GetById(int id)
    {
        var device = await FindDeviceAsync(id);
        return device is null ? NotFound() : Ok(device.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<DeviceDto>> Create(DeviceInput input)
    {
        var number = input.InventoryNumber.Trim();

        if (await InventoryNumberGuard.IsTakenAsync(db, number))
        {
            return DuplicateInventoryNumber();
        }

        if (!await ComputerExistsAsync(input.ComputerId))
        {
            return ComputerNotFound();
        }

        var device = new Device
        {
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        Apply(device, input);

        db.Devices.Add(device);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (InventoryNumberConflictException)
        {
            return DuplicateInventoryNumber();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return DuplicateInventoryNumber();
        }

        var created = await FindDeviceAsync(device.Id);
        return CreatedAtAction(nameof(GetById), new { id = device.Id }, created!.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DeviceDto>> Update(int id, DeviceInput input)
    {
        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == id);

        if (device is null)
        {
            return NotFound();
        }

        var number = input.InventoryNumber.Trim();

        if (await InventoryNumberGuard.IsTakenAsync(db, number, deviceId: id))
        {
            return DuplicateInventoryNumber();
        }

        if (!await ComputerExistsAsync(input.ComputerId))
        {
            return ComputerNotFound();
        }

        Apply(device, input);
        device.UpdatedAt = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (InventoryNumberConflictException)
        {
            return DuplicateInventoryNumber();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return DuplicateInventoryNumber();
        }

        var updated = await FindDeviceAsync(device.Id);
        return Ok(updated!.ToDto());
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == id);

        if (device is null)
        {
            return NotFound();
        }

        db.Devices.Remove(device);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private Task<Device?> FindDeviceAsync(int id) =>
        db.Devices
            .AsNoTracking()
            .Include(d => d.Computer)
            .FirstOrDefaultAsync(d => d.Id == id);

    private async Task<bool> ComputerExistsAsync(int? computerId) =>
        !computerId.HasValue || await db.Computers.AnyAsync(c => c.Id == computerId.Value);

    private ActionResult DuplicateInventoryNumber()
    {
        ModelState.AddModelError(nameof(DeviceInput.InventoryNumber),
            "Такой инвентарный номер уже используется (компьютером или устройством). Инвентарный номер должен быть уникальным.");
        return ValidationProblem(ModelState);
    }

    private ActionResult ComputerNotFound()
    {
        ModelState.AddModelError(nameof(DeviceInput.ComputerId), "Указанный компьютер не найден.");
        return ValidationProblem(ModelState);
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex) =>
        ex.InnerException is SqliteException { SqliteErrorCode: 19 };

    private static void Apply(Device device, DeviceInput input)
    {
        device.InventoryNumber = input.InventoryNumber.Trim();
        device.Type = input.Type;
        device.Manufacturer = Clean(input.Manufacturer);
        device.Model = Clean(input.Model);
        device.SerialNumber = Clean(input.SerialNumber);
        device.ComputerId = input.ComputerId;
        device.Status = input.Status;
        device.DecommissionedOn = input.DecommissionedOn;
        device.DecommissionReason = Clean(input.DecommissionReason);
        device.Notes = Clean(input.Notes);
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

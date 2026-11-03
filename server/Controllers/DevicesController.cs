using LibraryInventory.Api.Data;
using LibraryInventory.Api.Dtos;
using LibraryInventory.Api.Models;
using Microsoft.AspNetCore.Mvc;
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
        [FromQuery] bool? unassigned)
    {
        var query = db.Devices
            .AsNoTracking()
            .Include(d => d.Computer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(d =>
                d.InventoryNumber.ToLower().Contains(term) ||
                (d.Manufacturer != null && d.Manufacturer.ToLower().Contains(term)) ||
                (d.Model != null && d.Model.ToLower().Contains(term)) ||
                (d.SerialNumber != null && d.SerialNumber.ToLower().Contains(term)) ||
                (d.Computer != null && d.Computer.InventoryNumber.ToLower().Contains(term)));
        }

        if (computerId.HasValue)
        {
            query = query.Where(d => d.ComputerId == computerId.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(d => d.Type == type.Value);
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

        if (await InventoryNumberExistsAsync(number))
        {
            ModelState.AddModelError(nameof(input.InventoryNumber), "Этот инвентарный номер уже используется");
            return ValidationProblem(ModelState);
        }

        if (!await ComputerExistsAsync(input.ComputerId))
        {
            ModelState.AddModelError(nameof(input.ComputerId), "Выбранный компьютер не найден");
            return ValidationProblem(ModelState);
        }

        var device = new Device
        {
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        Apply(device, input);

        db.Devices.Add(device);
        await db.SaveChangesAsync();

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

        if (await db.Computers.AnyAsync(c => c.InventoryNumber == number) ||
            await db.Devices.AnyAsync(d => d.Id != id && d.InventoryNumber == number))
        {
            ModelState.AddModelError(nameof(input.InventoryNumber), "Этот инвентарный номер уже используется");
            return ValidationProblem(ModelState);
        }

        if (!await ComputerExistsAsync(input.ComputerId))
        {
            ModelState.AddModelError(nameof(input.ComputerId), "Выбранный компьютер не найден");
            return ValidationProblem(ModelState);
        }

        Apply(device, input);
        device.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

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

    private async Task<bool> InventoryNumberExistsAsync(string number) =>
        await db.Computers.AnyAsync(c => c.InventoryNumber == number) ||
        await db.Devices.AnyAsync(d => d.InventoryNumber == number);

    private static void Apply(Device device, DeviceInput input)
    {
        device.InventoryNumber = input.InventoryNumber.Trim();
        device.Type = input.Type;
        device.Manufacturer = Clean(input.Manufacturer);
        device.Model = Clean(input.Model);
        device.SerialNumber = Clean(input.SerialNumber);
        device.ComputerId = input.ComputerId;
        device.Notes = Clean(input.Notes);
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

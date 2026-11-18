using LibraryInventory.Api.Data;
using LibraryInventory.Api.Dtos;
using LibraryInventory.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LibraryInventory.Api.Controllers;

[ApiController]
[Route("api/computers")]
public class ComputersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ComputerDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] EquipmentStatus? status)
    {
        var query = db.Computers
            .AsNoTracking()
            .Include(c => c.Devices)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(c =>
                EF.Functions.Like(c.InventoryNumber, pattern) ||
                (c.Model != null && EF.Functions.Like(c.Model, pattern)) ||
                (c.Processor != null && EF.Functions.Like(c.Processor, pattern)) ||
                (c.GraphicsCard != null && EF.Functions.Like(c.GraphicsCard, pattern)) ||
                (c.Storage != null && EF.Functions.Like(c.Storage, pattern)) ||
                (c.Motherboard != null && EF.Functions.Like(c.Motherboard, pattern)) ||
                (c.OperatingSystem != null && EF.Functions.Like(c.OperatingSystem, pattern)) ||
                (c.Location != null && EF.Functions.Like(c.Location, pattern)) ||
                (c.AssignedTo != null && EF.Functions.Like(c.AssignedTo, pattern)) ||
                (c.DecommissionReason != null && EF.Functions.Like(c.DecommissionReason, pattern)) ||
                (c.Notes != null && EF.Functions.Like(c.Notes, pattern)) ||
                c.Devices.Any(d =>
                    EF.Functions.Like(d.InventoryNumber, pattern) ||
                    (d.Manufacturer != null && EF.Functions.Like(d.Manufacturer, pattern)) ||
                    (d.Model != null && EF.Functions.Like(d.Model, pattern))));
        }

        if (status.HasValue)
        {
            query = query.Where(c => c.Status == status.Value);
        }

        var computers = await query
            .OrderBy(c => c.InventoryNumber)
            .ToListAsync();

        return Ok(computers.Select(c => c.ToDto()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ComputerDto>> GetById(int id)
    {
        var computer = await db.Computers
            .AsNoTracking()
            .Include(c => c.Devices)
            .FirstOrDefaultAsync(c => c.Id == id);

        return computer is null ? NotFound() : Ok(computer.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<ComputerDto>> Create(ComputerInput input)
    {
        var number = input.InventoryNumber.Trim();

        if (await InventoryNumberTakenAsync(number))
        {
            return DuplicateInventoryNumber();
        }

        var computer = new Computer
        {
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        Apply(computer, input);

        db.Computers.Add(computer);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return DuplicateInventoryNumber();
        }

        var created = await db.Computers
            .AsNoTracking()
            .Include(c => c.Devices)
            .FirstAsync(c => c.Id == computer.Id);

        return CreatedAtAction(nameof(GetById), new { id = computer.Id }, created.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ComputerDto>> Update(int id, ComputerInput input)
    {
        var computer = await db.Computers
            .Include(c => c.Devices)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (computer is null)
        {
            return NotFound();
        }

        var number = input.InventoryNumber.Trim();

        if (await db.Computers.AnyAsync(c => c.Id != id && EF.Functions.Collate(c.InventoryNumber, "NOCASE") == number) ||
            await db.Devices.AnyAsync(d => EF.Functions.Collate(d.InventoryNumber, "NOCASE") == number))
        {
            return DuplicateInventoryNumber();
        }

        Apply(computer, input);
        computer.UpdatedAt = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return DuplicateInventoryNumber();
        }

        return Ok(computer.ToDto());
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var computer = await db.Computers.FirstOrDefaultAsync(c => c.Id == id);

        if (computer is null)
        {
            return NotFound();
        }

        db.Computers.Remove(computer);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> InventoryNumberTakenAsync(string number) =>
        await db.Computers.AnyAsync(c => EF.Functions.Collate(c.InventoryNumber, "NOCASE") == number) ||
        await db.Devices.AnyAsync(d => EF.Functions.Collate(d.InventoryNumber, "NOCASE") == number);

    private ActionResult DuplicateInventoryNumber()
    {
        ModelState.AddModelError(nameof(ComputerInput.InventoryNumber),
            "Такой инвентарный номер уже используется (компьютером или устройством). Инвентарный номер должен быть уникальным.");
        return ValidationProblem(ModelState);
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex) =>
        ex.InnerException is SqliteException { SqliteErrorCode: 19 };

    private static void Apply(Computer computer, ComputerInput input)
    {
        computer.InventoryNumber = input.InventoryNumber.Trim();
        computer.Model = Clean(input.Model);
        computer.Processor = Clean(input.Processor);
        computer.GraphicsCard = Clean(input.GraphicsCard);
        computer.RamGb = input.RamGb;
        computer.Storage = Clean(input.Storage);
        computer.Motherboard = Clean(input.Motherboard);
        computer.OperatingSystem = Clean(input.OperatingSystem);
        computer.Location = Clean(input.Location);
        computer.AssignedTo = Clean(input.AssignedTo);
        computer.CommissionedOn = input.CommissionedOn;
        computer.Status = input.Status;
        computer.DecommissionedOn = input.DecommissionedOn;
        computer.DecommissionReason = Clean(input.DecommissionReason);
        computer.Notes = Clean(input.Notes);
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

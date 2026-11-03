using LibraryInventory.Api.Data;
using LibraryInventory.Api.Dtos;
using LibraryInventory.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LibraryInventory.Api.Controllers;

[ApiController]
[Route("api/computers")]
public class ComputersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ComputerDto>>> GetAll([FromQuery] string? search)
    {
        var query = db.Computers
            .AsNoTracking()
            .Include(c => c.Devices)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.InventoryNumber.ToLower().Contains(term) ||
                (c.Model != null && c.Model.ToLower().Contains(term)) ||
                (c.Processor != null && c.Processor.ToLower().Contains(term)) ||
                (c.GraphicsCard != null && c.GraphicsCard.ToLower().Contains(term)) ||
                (c.OperatingSystem != null && c.OperatingSystem.ToLower().Contains(term)) ||
                (c.Location != null && c.Location.ToLower().Contains(term)) ||
                (c.AssignedTo != null && c.AssignedTo.ToLower().Contains(term)) ||
                c.Devices.Any(d => d.InventoryNumber.ToLower().Contains(term)));
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

        if (await InventoryNumberExistsAsync(number))
        {
            ModelState.AddModelError(nameof(input.InventoryNumber), "Этот инвентарный номер уже используется");
            return ValidationProblem(ModelState);
        }

        var computer = new Computer
        {
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        Apply(computer, input);

        db.Computers.Add(computer);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = computer.Id }, computer.ToDto());
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

        if (await db.Computers.AnyAsync(c => c.Id != id && c.InventoryNumber == number) ||
            await db.Devices.AnyAsync(d => d.InventoryNumber == number))
        {
            ModelState.AddModelError(nameof(input.InventoryNumber), "Этот инвентарный номер уже используется");
            return ValidationProblem(ModelState);
        }

        Apply(computer, input);
        computer.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(computer.ToDto());
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var computer = await db.Computers
            .Include(c => c.Devices)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (computer is null)
        {
            return NotFound();
        }

        foreach (var device in computer.Devices)
        {
            device.ComputerId = null;
        }

        db.Computers.Remove(computer);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> InventoryNumberExistsAsync(string number) =>
        await db.Computers.AnyAsync(c => c.InventoryNumber == number) ||
        await db.Devices.AnyAsync(d => d.InventoryNumber == number);

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
        computer.Notes = Clean(input.Notes);
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

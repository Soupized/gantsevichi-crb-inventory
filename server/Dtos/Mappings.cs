using LibraryInventory.Api.Models;

namespace LibraryInventory.Api.Dtos;

public static class Mappings
{
    public static DeviceDto ToDto(this Device device, string? computerInventoryNumber = null) => new(
        device.Id,
        device.InventoryNumber,
        device.Type,
        device.Manufacturer,
        device.Model,
        device.SerialNumber,
        device.ComputerId,
        computerInventoryNumber ?? device.Computer?.InventoryNumber,
        device.Status,
        device.DecommissionedOn,
        device.DecommissionReason,
        device.Notes,
        device.CreatedAt,
        device.UpdatedAt);

    public static ComputerDto ToDto(this Computer computer) => new(
        computer.Id,
        computer.InventoryNumber,
        computer.Model,
        computer.Processor,
        computer.GraphicsCard,
        computer.RamGb,
        computer.Storage,
        computer.Motherboard,
        computer.OperatingSystem,
        computer.Location,
        computer.AssignedTo,
        computer.CommissionedOn,
        computer.Status,
        computer.DecommissionedOn,
        computer.DecommissionReason,
        computer.Notes,
        computer.CreatedAt,
        computer.UpdatedAt,
        computer.Devices
            .OrderBy(d => d.Type)
            .ThenBy(d => d.InventoryNumber)
            .Select(d => d.ToDto(computer.InventoryNumber))
            .ToList());
}

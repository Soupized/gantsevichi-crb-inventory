namespace LibraryInventory.Api.Models;

public class Device
{
    public int Id { get; set; }
    public string InventoryNumber { get; set; } = string.Empty;
    public string InventoryNumberKey { get; set; } = string.Empty;
    public DeviceType Type { get; set; } = DeviceType.Other;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public int? ComputerId { get; set; }
    public Computer? Computer { get; set; }
    public EquipmentStatus Status { get; set; } = EquipmentStatus.InUse;
    public DateOnly? DecommissionedOn { get; set; }
    public string? DecommissionReason { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

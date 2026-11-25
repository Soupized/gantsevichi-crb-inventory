namespace LibraryInventory.Api.Models;

public class Computer
{
    public int Id { get; set; }
    public string InventoryNumber { get; set; } = string.Empty;
    public string InventoryNumberKey { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? Processor { get; set; }
    public string? GraphicsCard { get; set; }
    public int? RamGb { get; set; }
    public string? Storage { get; set; }
    public string? Motherboard { get; set; }
    public string? OperatingSystem { get; set; }
    public string? Location { get; set; }
    public string? AssignedTo { get; set; }
    public DateOnly? CommissionedOn { get; set; }
    public EquipmentStatus Status { get; set; } = EquipmentStatus.InUse;
    public DateOnly? DecommissionedOn { get; set; }
    public string? DecommissionReason { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<Device> Devices { get; set; } = new();
}

using System.ComponentModel.DataAnnotations;
using LibraryInventory.Api.Models;

namespace LibraryInventory.Api.Dtos;

public class DeviceInput
{
    [Required(ErrorMessage = "Укажите инвентарный номер")]
    [StringLength(50, ErrorMessage = "Инвентарный номер не может превышать 50 символов")]
    public string InventoryNumber { get; set; } = string.Empty;

    [EnumDataType(typeof(DeviceType), ErrorMessage = "Некорректный тип устройства")]
    public DeviceType Type { get; set; } = DeviceType.Other;

    [StringLength(150, ErrorMessage = "Производитель не может превышать 150 символов")]
    public string? Manufacturer { get; set; }

    [StringLength(150, ErrorMessage = "Модель не может превышать 150 символов")]
    public string? Model { get; set; }

    [StringLength(150, ErrorMessage = "Серийный номер не может превышать 150 символов")]
    public string? SerialNumber { get; set; }

    public int? ComputerId { get; set; }

    [EnumDataType(typeof(EquipmentStatus), ErrorMessage = "Некорректный статус")]
    public EquipmentStatus Status { get; set; } = EquipmentStatus.InUse;

    public DateOnly? DecommissionedOn { get; set; }

    [StringLength(500, ErrorMessage = "Причина списания/вывода слишком длинная")]
    public string? DecommissionReason { get; set; }

    [StringLength(1000, ErrorMessage = "Примечание не может превышать 1000 символов")]
    public string? Notes { get; set; }
}

public record DeviceDto(
    int Id,
    string InventoryNumber,
    DeviceType Type,
    string? Manufacturer,
    string? Model,
    string? SerialNumber,
    int? ComputerId,
    string? ComputerInventoryNumber,
    EquipmentStatus Status,
    DateOnly? DecommissionedOn,
    string? DecommissionReason,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

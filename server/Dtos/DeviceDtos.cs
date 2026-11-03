using System.ComponentModel.DataAnnotations;
using LibraryInventory.Api.Models;

namespace LibraryInventory.Api.Dtos;

public class DeviceInput
{
    [Required(ErrorMessage = "Укажите инвентарный номер")]
    [StringLength(50, ErrorMessage = "Инвентарный номер не должен превышать 50 символов")]
    public string InventoryNumber { get; set; } = string.Empty;

    [EnumDataType(typeof(DeviceType), ErrorMessage = "Неизвестный тип устройства")]
    public DeviceType Type { get; set; } = DeviceType.Other;

    [StringLength(150, ErrorMessage = "Производитель не должен превышать 150 символов")]
    public string? Manufacturer { get; set; }

    [StringLength(150, ErrorMessage = "Модель не должна превышать 150 символов")]
    public string? Model { get; set; }

    [StringLength(150, ErrorMessage = "Серийный номер не должен превышать 150 символов")]
    public string? SerialNumber { get; set; }

    public int? ComputerId { get; set; }

    [StringLength(1000, ErrorMessage = "Примечание не должно превышать 1000 символов")]
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
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

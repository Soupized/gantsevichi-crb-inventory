using System.ComponentModel.DataAnnotations;
using LibraryInventory.Api.Models;

namespace LibraryInventory.Api.Dtos;

public class ComputerInput
{
    [Required(ErrorMessage = "Укажите инвентарный номер")]
    [StringLength(50, ErrorMessage = "Инвентарный номер не может превышать 50 символов")]
    public string InventoryNumber { get; set; } = string.Empty;

    [StringLength(150, ErrorMessage = "Модель не может превышать 150 символов")]
    public string? Model { get; set; }

    [StringLength(200, ErrorMessage = "Название процессора слишком длинное")]
    public string? Processor { get; set; }

    [StringLength(200, ErrorMessage = "Название видеокарты слишком длинное")]
    public string? GraphicsCard { get; set; }

    [Range(0, 4096, ErrorMessage = "Объём ОЗУ должен быть от 0 до 4096 ГБ")]
    public int? RamGb { get; set; }

    [StringLength(200, ErrorMessage = "Описание накопителя слишком длинное")]
    public string? Storage { get; set; }

    [StringLength(200, ErrorMessage = "Название материнской платы слишком длинное")]
    public string? Motherboard { get; set; }

    [StringLength(150, ErrorMessage = "Название ОС слишком длинное")]
    public string? OperatingSystem { get; set; }

    [StringLength(150, ErrorMessage = "Расположение слишком длинное")]
    public string? Location { get; set; }

    [StringLength(150, ErrorMessage = "Имя ответственного слишком длинное")]
    public string? AssignedTo { get; set; }

    public DateOnly? CommissionedOn { get; set; }

    [EnumDataType(typeof(EquipmentStatus), ErrorMessage = "Некорректный статус")]
    public EquipmentStatus Status { get; set; } = EquipmentStatus.InUse;

    public DateOnly? DecommissionedOn { get; set; }

    [StringLength(500, ErrorMessage = "Причина списания/вывода слишком длинная")]
    public string? DecommissionReason { get; set; }

    [StringLength(1000, ErrorMessage = "Примечание не может превышать 1000 символов")]
    public string? Notes { get; set; }
}

public record ComputerDto(
    int Id,
    string InventoryNumber,
    string? Model,
    string? Processor,
    string? GraphicsCard,
    int? RamGb,
    string? Storage,
    string? Motherboard,
    string? OperatingSystem,
    string? Location,
    string? AssignedTo,
    DateOnly? CommissionedOn,
    EquipmentStatus Status,
    DateOnly? DecommissionedOn,
    string? DecommissionReason,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<DeviceDto> Devices);

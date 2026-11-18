export const DEVICE_TYPES = [
  { value: "Mouse", label: "Мышь" },
  { value: "Keyboard", label: "Клавиатура" },
  { value: "Monitor", label: "Монитор" },
  { value: "Printer", label: "Принтер" },
  { value: "Scanner", label: "Сканер" },
  { value: "Ups", label: "ИБП" },
  { value: "Other", label: "Другое" }
];

export const EQUIPMENT_STATUSES = [
  { value: "InUse", label: "В эксплуатации" },
  { value: "InRepair", label: "В ремонте" },
  { value: "InStock", label: "На складе" },
  { value: "WrittenOff", label: "Списан" }
];

const DEVICE_LABELS = Object.fromEntries(
  DEVICE_TYPES.map((type) => [type.value, type.label])
);

const STATUS_LABELS = Object.fromEntries(
  EQUIPMENT_STATUSES.map((s) => [s.value, s.label])
);

export function deviceLabel(type) {
  return DEVICE_LABELS[type] ?? type ?? "Другое";
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? "—";
}

export function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return String(value);
  return `${day}.${month}.${year}`;
}

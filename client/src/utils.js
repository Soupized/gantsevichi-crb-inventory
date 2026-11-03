export const DEVICE_TYPES = [
  { value: "Mouse", label: "Мышь" },
  { value: "Keyboard", label: "Клавиатура" },
  { value: "Monitor", label: "Монитор" },
  { value: "Printer", label: "Принтер" },
  { value: "Scanner", label: "Сканер" },
  { value: "Ups", label: "ИБП" },
  { value: "Other", label: "Другое" }
];

const DEVICE_LABELS = Object.fromEntries(
  DEVICE_TYPES.map((type) => [type.value, type.label])
);

export function deviceLabel(type) {
  return DEVICE_LABELS[type] ?? type ?? "Другое";
}

export function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

export function matchesSearch(query, values) {
  const term = query.trim().toLowerCase();
  if (!term) return true;

  return values.some((value) => {
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(term);
  });
}

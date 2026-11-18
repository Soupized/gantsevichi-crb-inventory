export const DEVICE_TYPES = [
  { value: "Mouse", label: "????" },
  { value: "Keyboard", label: "??????????" },
  { value: "Monitor", label: "???????" },
  { value: "Printer", label: "???????" },
  { value: "Scanner", label: "??????" },
  { value: "Ups", label: "???" },
  { value: "Other", label: "??????" }
];

export const EQUIPMENT_STATUSES = [
  { value: "InUse", label: "? ????????????" },
  { value: "InRepair", label: "? ???????" },
  { value: "InStock", label: "?? ??????" },
  { value: "WrittenOff", label: "??????" }
];

const DEVICE_LABELS = Object.fromEntries(
  DEVICE_TYPES.map((type) => [type.value, type.label])
);

const STATUS_LABELS = Object.fromEntries(
  EQUIPMENT_STATUSES.map((s) => [s.value, s.label])
);

export function deviceLabel(type) {
  return DEVICE_LABELS[type] ?? type ?? "??????";
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? "?";
}

export function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return String(value);
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

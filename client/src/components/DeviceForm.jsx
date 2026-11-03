import { useState } from "react";
import { DEVICE_TYPES } from "../utils.js";

function toFormValues(device, presetComputerId) {
  const computerId =
    device?.computerId != null
      ? String(device.computerId)
      : presetComputerId
        ? String(presetComputerId)
        : "";

  return {
    inventoryNumber: device?.inventoryNumber ?? "",
    type: device?.type ?? "Mouse",
    manufacturer: device?.manufacturer ?? "",
    model: device?.model ?? "",
    serialNumber: device?.serialNumber ?? "",
    computerId,
    notes: device?.notes ?? ""
  };
}

export default function DeviceForm({
  initial,
  computers,
  presetComputerId,
  onSubmit,
  onCancel
}) {
  const [form, setForm] = useState(() => toFormValues(initial, presetComputerId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const sortedComputers = [...computers].sort((a, b) =>
    a.inventoryNumber.localeCompare(b.inventoryNumber, "ru")
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.inventoryNumber.trim()) {
      setError("Укажите инвентарный номер устройства.");
      return;
    }

    const payload = {
      inventoryNumber: form.inventoryNumber.trim(),
      type: form.type,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      computerId: form.computerId ? Number(form.computerId) : null,
      notes: form.notes.trim() || null
    };

    setBusy(true);

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <section className="form-section">
        <h3>Устройство</h3>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="device-inventory">
              Инвентарный номер <span className="req">*</span>
            </label>
            <input
              id="device-inventory"
              value={form.inventoryNumber}
              onChange={update("inventoryNumber")}
              maxLength={50}
              required
              autoFocus
              placeholder="Например, МОН-0012"
            />
          </div>

          <div className="form-field">
            <label htmlFor="device-type">Тип устройства</label>
            <select id="device-type" value={form.type} onChange={update("type")}>
              {DEVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="device-manufacturer">Производитель</label>
            <input
              id="device-manufacturer"
              value={form.manufacturer}
              onChange={update("manufacturer")}
              maxLength={150}
              placeholder="Например, Logitech"
            />
          </div>

          <div className="form-field">
            <label htmlFor="device-model">Модель</label>
            <input
              id="device-model"
              value={form.model}
              onChange={update("model")}
              maxLength={150}
              placeholder="Например, M185"
            />
          </div>

          <div className="form-field">
            <label htmlFor="device-serial">Серийный номер</label>
            <input
              id="device-serial"
              value={form.serialNumber}
              onChange={update("serialNumber")}
              maxLength={150}
              placeholder="Необязательно"
            />
          </div>

          <div className="form-field">
            <label htmlFor="device-computer">Компьютер</label>
            <select
              id="device-computer"
              value={form.computerId}
              onChange={update("computerId")}
              disabled={sortedComputers.length === 0}
            >
              <option value="">Без привязки</option>
              {sortedComputers.map((computer) => (
                <option key={computer.id} value={computer.id}>
                  № {computer.inventoryNumber}
                  {computer.model ? ` — ${computer.model}` : ""}
                </option>
              ))}
            </select>
            {sortedComputers.length === 0 && (
              <span className="form-hint">
                Компьютеры ещё не добавлены — устройство можно сохранить без привязки.
              </span>
            )}
          </div>

          <div className="form-field full">
            <label htmlFor="device-notes">Примечание</label>
            <textarea
              id="device-notes"
              value={form.notes}
              onChange={update("notes")}
              maxLength={1000}
              placeholder="Необязательная информация об устройстве"
            />
          </div>
        </div>
      </section>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy
            ? "Сохранение…"
            : initial
              ? "Сохранить изменения"
              : "Добавить устройство"}
        </button>
      </div>
    </form>
  );
}

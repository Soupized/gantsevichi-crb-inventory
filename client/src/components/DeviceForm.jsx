import { useState } from "react";
import { DEVICE_TYPES, EQUIPMENT_STATUSES } from "../utils.js";

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
    status: device?.status ?? "InUse",
    decommissionedOn: device?.decommissionedOn ?? "",
    decommissionReason: device?.decommissionReason ?? "",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const payload = {
      inventoryNumber: form.inventoryNumber.trim(),
      type: form.type,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      computerId: form.computerId ? Number(form.computerId) : null,
      status: form.status || "InUse",
      decommissionedOn: form.decommissionedOn || null,
      decommissionReason: form.decommissionReason.trim() || null,
      notes: form.notes.trim() || null
    };

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
          <label className="form-field">
            <span>Тип <span className="req">*</span></span>
            <select required value={form.type} onChange={update("type")}>
              {DEVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Статус</span>
            <select value={form.status} onChange={update("status")}>
              {EQUIPMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Инвентарный номер <span className="req">*</span></span>
            <input
              required
              value={form.inventoryNumber}
              onChange={update("inventoryNumber")}
              placeholder="Например, МОН-014"
              autoFocus
            />
            <span className="form-hint">Уникален для всех компьютеров и устройств</span>
          </label>

          <label className="form-field">
            <span>Производитель</span>
            <input
              value={form.manufacturer}
              onChange={update("manufacturer")}
              placeholder="AOC, Logitech, HP..."
            />
          </label>

          <label className="form-field">
            <span>Модель</span>
            <input
              value={form.model}
              onChange={update("model")}
              placeholder="Модель устройства"
            />
          </label>

          <label className="form-field">
            <span>Серийный номер</span>
            <input
              value={form.serialNumber}
              onChange={update("serialNumber")}
              placeholder="При наличии"
            />
          </label>

          <label className="form-field">
            <span>Дата списания / вывода</span>
            <input
              type="date"
              value={form.decommissionedOn}
              onChange={update("decommissionedOn")}
            />
          </label>

          <label className="form-field full">
            <span>Причина списания / вывода</span>
            <input
              value={form.decommissionReason}
              onChange={update("decommissionReason")}
              placeholder="Неисправность, моральный износ, передача..."
            />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h3>Привязка</h3>
        <div className="form-grid">
          <label className="form-field full">
            <span>Компьютер</span>
            <select value={form.computerId} onChange={update("computerId")}>
              <option value="">Без привязки (на складе)</option>
              {computers.map((computer) => (
                <option key={computer.id} value={computer.id}>
                  № {computer.inventoryNumber}
                  {computer.model ? ` — ${computer.model}` : ""}
                </option>
              ))}
            </select>
            <span className="form-hint">
              Оставьте «Без привязки», если устройство пока не подключено к компьютеру.
            </span>
          </label>

          <label className="form-field full">
            <span>Примечание</span>
            <textarea
              value={form.notes}
              onChange={update("notes")}
              placeholder="Состояние, особенности, комплектность..."
            />
          </label>
        </div>
      </section>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Сохранение..." : initial ? "Сохранить изменения" : "Добавить устройство"}
        </button>
      </div>
    </form>
  );
}

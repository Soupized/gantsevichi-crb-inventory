import { useState } from "react";
import { EQUIPMENT_STATUSES } from "../utils.js";

function toFormValues(computer) {
  return {
    inventoryNumber: computer?.inventoryNumber ?? "",
    model: computer?.model ?? "",
    processor: computer?.processor ?? "",
    graphicsCard: computer?.graphicsCard ?? "",
    ramGb: computer?.ramGb ?? "",
    storage: computer?.storage ?? "",
    motherboard: computer?.motherboard ?? "",
    operatingSystem: computer?.operatingSystem ?? "",
    location: computer?.location ?? "",
    assignedTo: computer?.assignedTo ?? "",
    commissionedOn: computer?.commissionedOn ?? "",
    status: computer?.status ?? "InUse",
    decommissionedOn: computer?.decommissionedOn ?? "",
    decommissionReason: computer?.decommissionReason ?? "",
    notes: computer?.notes ?? ""
  };
}

export default function ComputerForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toFormValues(initial));
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
      model: form.model.trim() || null,
      processor: form.processor.trim() || null,
      graphicsCard: form.graphicsCard.trim() || null,
      ramGb: form.ramGb === "" ? null : Number(form.ramGb),
      storage: form.storage.trim() || null,
      motherboard: form.motherboard.trim() || null,
      operatingSystem: form.operatingSystem.trim() || null,
      location: form.location.trim() || null,
      assignedTo: form.assignedTo.trim() || null,
      commissionedOn: form.commissionedOn || null,
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
        <h3>Основные данные</h3>
        <div className="form-grid">
          <label className="form-field">
            <span>Инвентарный номер <span className="req">*</span></span>
            <input
              required
              value={form.inventoryNumber}
              onChange={update("inventoryNumber")}
              placeholder="Например, ПК-001"
              autoFocus
            />
            <span className="form-hint">Уникален для всех компьютеров и устройств</span>
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
            <span>Модель / сборка</span>
            <input
              value={form.model}
              onChange={update("model")}
              placeholder="Название компьютера"
            />
          </label>

          <label className="form-field">
            <span>Операционная система</span>
            <input
              value={form.operatingSystem}
              onChange={update("operatingSystem")}
              placeholder="Windows 11, Astra Linux..."
            />
          </label>

          <label className="form-field">
            <span>Расположение</span>
            <input
              value={form.location}
              onChange={update("location")}
              placeholder="Кабинет, читальный зал..."
            />
          </label>

          <label className="form-field">
            <span>Ответственный</span>
            <input
              value={form.assignedTo}
              onChange={update("assignedTo")}
              placeholder="ФИО сотрудника"
            />
          </label>

          <label className="form-field">
            <span>Дата ввода в эксплуатацию</span>
            <input
              type="date"
              value={form.commissionedOn}
              onChange={update("commissionedOn")}
            />
          </label>

          <label className="form-field">
            <span>Дата списания / вывода</span>
            <input
              type="date"
              value={form.decommissionedOn}
              onChange={update("decommissionedOn")}
            />
            <span className="form-hint">Для списанных, на складе или в ремонте (при необходимости)</span>
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
        <h3>Комплектующие</h3>
        <div className="form-grid">
          <label className="form-field">
            <span>Процессор</span>
            <input
              value={form.processor}
              onChange={update("processor")}
              placeholder="Intel Core i5, AMD Ryzen..."
            />
          </label>

          <label className="form-field">
            <span>Видеокарта</span>
            <input
              value={form.graphicsCard}
              onChange={update("graphicsCard")}
              placeholder="Встроенная, NVIDIA, AMD..."
            />
          </label>

          <label className="form-field">
            <span>Оперативная память (ГБ)</span>
            <input
              type="number"
              min="0"
              max="4096"
              value={form.ramGb}
              onChange={update("ramGb")}
              placeholder="8"
            />
          </label>

          <label className="form-field">
            <span>Накопитель</span>
            <input
              value={form.storage}
              onChange={update("storage")}
              placeholder="SSD 512 ГБ, HDD 1 ТБ..."
            />
          </label>

          <label className="form-field full">
            <span>Материнская плата</span>
            <input
              value={form.motherboard}
              onChange={update("motherboard")}
              placeholder="Модель материнской платы"
            />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h3>Примечание</h3>
        <label className="form-field full">
          <textarea
            value={form.notes}
            onChange={update("notes")}
            placeholder="Любая дополнительная информация"
          />
        </label>
      </section>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Сохранение..." : initial ? "Сохранить изменения" : "Добавить компьютер"}
        </button>
      </div>
    </form>
  );
}

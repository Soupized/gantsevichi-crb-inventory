import { useState } from "react";

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
    setError("");

    if (!form.inventoryNumber.trim()) {
      setError("Укажите инвентарный номер компьютера.");
      return;
    }

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
        <h3>Основные сведения</h3>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="computer-inventory">
              Инвентарный номер <span className="req">*</span>
            </label>
            <input
              id="computer-inventory"
              value={form.inventoryNumber}
              onChange={update("inventoryNumber")}
              maxLength={50}
              required
              autoFocus
              placeholder="Например, ПК-0001"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-model">Модель</label>
            <input
              id="computer-model"
              value={form.model}
              onChange={update("model")}
              maxLength={150}
              placeholder="Например, Lenovo ThinkCentre"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-location">Кабинет / отдел</label>
            <input
              id="computer-location"
              value={form.location}
              onChange={update("location")}
              maxLength={150}
              placeholder="Например, читальный зал"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-assigned">Ответственный</label>
            <input
              id="computer-assigned"
              value={form.assignedTo}
              onChange={update("assignedTo")}
              maxLength={150}
              placeholder="ФИО сотрудника"
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h3>Комплектующие</h3>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="computer-cpu">Процессор</label>
            <input
              id="computer-cpu"
              value={form.processor}
              onChange={update("processor")}
              maxLength={200}
              placeholder="Например, Intel Core i5-12400"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-gpu">Видеокарта</label>
            <input
              id="computer-gpu"
              value={form.graphicsCard}
              onChange={update("graphicsCard")}
              maxLength={200}
              placeholder="Например, Intel UHD Graphics 730"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-ram">Объём ОЗУ, ГБ</label>
            <input
              id="computer-ram"
              type="number"
              min="0"
              max="4096"
              step="1"
              value={form.ramGb}
              onChange={update("ramGb")}
              placeholder="16"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-storage">Накопитель</label>
            <input
              id="computer-storage"
              value={form.storage}
              onChange={update("storage")}
              maxLength={200}
              placeholder="Например, SSD 512 ГБ"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-motherboard">Материнская плата</label>
            <input
              id="computer-motherboard"
              value={form.motherboard}
              onChange={update("motherboard")}
              maxLength={200}
              placeholder="Например, ASUS H610M"
            />
          </div>

          <div className="form-field">
            <label htmlFor="computer-os">Операционная система</label>
            <input
              id="computer-os"
              value={form.operatingSystem}
              onChange={update("operatingSystem")}
              maxLength={150}
              placeholder="Например, Windows 11 Pro"
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h3>Дополнительно</h3>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="computer-date">Дата ввода в эксплуатацию</label>
            <input
              id="computer-date"
              type="date"
              value={form.commissionedOn}
              onChange={update("commissionedOn")}
            />
          </div>

          <div className="form-field full">
            <label htmlFor="computer-notes">Примечание</label>
            <textarea
              id="computer-notes"
              value={form.notes}
              onChange={update("notes")}
              maxLength={1000}
              placeholder="Необязательная информация о компьютере"
            />
          </div>
        </div>
      </section>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Сохранение…" : initial ? "Сохранить изменения" : "Добавить компьютер"}
        </button>
      </div>
    </form>
  );
}

import { deviceLabel, formatDate, statusLabel } from "../utils.js";
import { PencilIcon, PlusIcon, TrashIcon } from "./Icons.jsx";

export default function ComputerCard({ computer, onEdit, onDelete, onAddDevice }) {
  const devices = computer.devices ?? [];

  const specs = [
    ["Процессор", computer.processor],
    ["Видеокарта", computer.graphicsCard],
    ["ОЗУ", computer.ramGb ? `${computer.ramGb} ГБ` : null],
    ["Накопитель", computer.storage],
    ["Материнская плата", computer.motherboard],
    ["Операционная система", computer.operatingSystem]
  ];

  return (
    <article className="computer-card">
      <div className="card-head">
        <div className="card-title">
          <div className="card-title-row">
            <span className="inv-badge">№ {computer.inventoryNumber}</span>
            <span className={`status-badge status-${(computer.status || "InUse").toLowerCase()}`}>
              {statusLabel(computer.status)}
            </span>
          </div>
          <h3>{computer.model || "Компьютер"}</h3>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            title="Редактировать компьютер"
            aria-label="Редактировать компьютер"
            onClick={() => onEdit(computer)}
          >
            <PencilIcon />
          </button>
          <button
            className="icon-btn danger"
            title="Удалить компьютер"
            aria-label="Удалить компьютер"
            onClick={() => onDelete(computer)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <dl className="specs">
        {specs.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {(computer.location || computer.assignedTo || computer.commissionedOn || computer.decommissionedOn) && (
        <div className="meta-row">
          {computer.location && (
            <span>Кабинет: <strong>{computer.location}</strong></span>
          )}
          {computer.assignedTo && (
            <span>Ответственный: <strong>{computer.assignedTo}</strong></span>
          )}
          {computer.commissionedOn && (
            <span>Ввод: <strong>{formatDate(computer.commissionedOn)}</strong></span>
          )}
          {computer.decommissionedOn && (
            <span>Списание/вывод: <strong>{formatDate(computer.decommissionedOn)}</strong></span>
          )}
        </div>
      )}

      {computer.decommissionReason && (
        <p className="card-notes"><strong>Причина:</strong> {computer.decommissionReason}</p>
      )}
      {computer.notes && <p className="card-notes">{computer.notes}</p>}

      <div className="devices-block">
        <div className="devices-head">
          <span>Периферия: {devices.length}</span>
          <button className="link-btn" onClick={() => onAddDevice(computer)}>
            <PlusIcon />
            Добавить
          </button>
        </div>

        {devices.length > 0 ? (
          <div className="chips">
            {devices.map((device) => (
              <span
                key={device.id}
                className={`chip chip-${device.type.toLowerCase()}`}
                title={[
                  `${deviceLabel(device.type)} № ${device.inventoryNumber}`,
                  statusLabel(device.status),
                  device.manufacturer,
                  device.model
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                <span className="chip-type">{deviceLabel(device.type)}</span>
                <span>№ {device.inventoryNumber}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="devices-empty">Периферия не привязана</p>
        )}
      </div>
    </article>
  );
}

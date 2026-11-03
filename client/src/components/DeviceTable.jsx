import { deviceLabel } from "../utils.js";
import { PencilIcon, TrashIcon } from "./Icons.jsx";

export default function DeviceTable({ devices, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="device-table">
        <thead>
          <tr>
            <th>Тип</th>
            <th>Инвентарный №</th>
            <th>Модель</th>
            <th>Серийный №</th>
            <th>Привязано к компьютеру</th>
            <th className="actions-col">Действия</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td>
                <span className={`type-badge type-${device.type.toLowerCase()}`}>
                  {deviceLabel(device.type)}
                </span>
              </td>
              <td>
                <strong>{device.inventoryNumber}</strong>
              </td>
              <td>
                {[device.manufacturer, device.model].filter(Boolean).join(" ") || "—"}
              </td>
              <td className="muted">{device.serialNumber || "—"}</td>
              <td>
                {device.computerInventoryNumber ? (
                  <span className="linked-pc">№ {device.computerInventoryNumber}</span>
                ) : (
                  <span className="muted">Без привязки</span>
                )}
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className="icon-btn"
                    title="Редактировать устройство"
                    aria-label="Редактировать устройство"
                    onClick={() => onEdit(device)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Удалить устройство"
                    aria-label="Удалить устройство"
                    onClick={() => onDelete(device)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

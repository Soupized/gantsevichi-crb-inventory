import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { DEVICE_TYPES, matchesSearch } from "./utils.js";
import ComputerCard from "./components/ComputerCard.jsx";
import DeviceTable from "./components/DeviceTable.jsx";
import ComputerForm from "./components/ComputerForm.jsx";
import DeviceForm from "./components/DeviceForm.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import EmptyState from "./components/EmptyState.jsx";
import Modal from "./components/Modal.jsx";
import {
  AlertIcon,
  CheckIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon
} from "./components/Icons.jsx";

export default function App() {
  const [computers, setComputers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("computers");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [computerFilter, setComputerFilter] = useState("all");
  const [computerModal, setComputerModal] = useState(null);
  const [deviceModal, setDeviceModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState("");

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const [computersData, devicesData] = await Promise.all([
        api.getComputers(),
        api.getDevices()
      ]);
      setComputers(computersData);
      setDevices(devicesData);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredComputers = useMemo(
    () =>
      computers.filter((computer) =>
        matchesSearch(query, [
          computer.inventoryNumber,
          computer.model,
          computer.processor,
          computer.graphicsCard,
          computer.ramGb ? `${computer.ramGb} ГБ` : null,
          computer.storage,
          computer.motherboard,
          computer.operatingSystem,
          computer.location,
          computer.assignedTo,
          ...(computer.devices ?? []).flatMap((device) => [
            device.inventoryNumber,
            device.manufacturer,
            device.model
          ])
        ])
      ),
    [computers, query]
  );

  const filteredDevices = useMemo(
    () =>
      devices.filter((device) => {
        if (typeFilter !== "all" && device.type !== typeFilter) return false;

        if (computerFilter === "unassigned" && device.computerId) return false;

        if (
          computerFilter !== "all" &&
          computerFilter !== "unassigned" &&
          String(device.computerId) !== computerFilter
        ) {
          return false;
        }

        return matchesSearch(query, [
          device.inventoryNumber,
          device.manufacturer,
          device.model,
          device.serialNumber,
          device.computerInventoryNumber,
          device.notes
        ]);
      }),
    [devices, query, typeFilter, computerFilter]
  );

  const unassignedCount = devices.filter((device) => !device.computerId).length;
  const monitorCount = devices.filter((device) => device.type === "Monitor").length;

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setQuery("");
  };

  const openCreateComputer = () =>
    setComputerModal({ mode: "create", computer: null });

  const openEditComputer = (computer) =>
    setComputerModal({ mode: "edit", computer });

  const openCreateDevice = (computerId = "") =>
    setDeviceModal({
      mode: "create",
      device: null,
      presetComputerId: computerId ? String(computerId) : ""
    });

  const openEditDevice = (device) =>
    setDeviceModal({
      mode: "edit",
      device,
      presetComputerId: ""
    });

  const handleSaveComputer = async (payload) => {
    const isEditing = computerModal?.mode === "edit";

    if (isEditing) {
      await api.updateComputer(computerModal.computer.id, payload);
    } else {
      await api.createComputer(payload);
    }

    setComputerModal(null);
    await loadAll({ silent: true });
    setToast(isEditing ? "Данные компьютера обновлены" : "Компьютер добавлен");
  };

  const handleSaveDevice = async (payload) => {
    const isEditing = deviceModal?.mode === "edit";

    if (isEditing) {
      await api.updateDevice(deviceModal.device.id, payload);
    } else {
      await api.createDevice(payload);
    }

    setDeviceModal(null);
    await loadAll({ silent: true });
    setToast(isEditing ? "Данные устройства обновлены" : "Устройство добавлено");
  };

  const handleDeleteComputer = (computer) => {
    setConfirm({
      title: "Удалить компьютер?",
      message: `Компьютер № ${computer.inventoryNumber} будет удалён из учёта. Привязанная периферия останется в списке без привязки к компьютеру.`,
      confirmLabel: "Удалить компьютер",
      onConfirm: async () => {
        await api.deleteComputer(computer.id);
        await loadAll({ silent: true });
        setToast("Компьютер удалён");
      }
    });
  };

  const handleDeleteDevice = (device) => {
    setConfirm({
      title: "Удалить устройство?",
      message: `Устройство № ${device.inventoryNumber} будет удалено из учёта.`,
      confirmLabel: "Удалить устройство",
      onConfirm: async () => {
        await api.deleteDevice(device.id);
        await loadAll({ silent: true });
        setToast("Устройство удалено");
      }
    });
  };

  const searchPlaceholder =
    tab === "computers"
      ? "Поиск по номеру, модели, кабинету…"
      : "Поиск по номеру, модели, компьютеру…";

  const hasDeviceFilters =
    query.trim() !== "" || typeFilter !== "all" || computerFilter !== "all";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="logo">ГЦРБ</div>
          <div>
            <p className="eyebrow">Ганцевичская центральная районная библиотека</p>
            <h1>Учёт компьютерной техники</h1>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-light"
            onClick={tab === "computers" ? openCreateComputer : () => openCreateDevice()}
          >
            <PlusIcon />
            {tab === "computers" ? "Добавить компьютер" : "Добавить устройство"}
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Сводка по технике">
        <div className="stat-card">
          <span className="stat-label">Компьютеры</span>
          <span className="stat-value">{computers.length}</span>
          <span className="stat-note">в учёте организации</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Периферия</span>
          <span className="stat-value">{devices.length}</span>
          <span className="stat-note">мыши, клавиатуры, мониторы</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Мониторы</span>
          <span className="stat-value">{monitorCount}</span>
          <span className="stat-note">всего устройств этого типа</span>
        </div>
        <div className={`stat-card ${unassignedCount > 0 ? "stat-warn" : ""}`}>
          <span className="stat-label">Без привязки</span>
          <span className="stat-value">{unassignedCount}</span>
          <span className="stat-note">устройств не закреплено</span>
        </div>
      </section>

      <main>
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Разделы учёта">
            <button
              role="tab"
              aria-selected={tab === "computers"}
              className={`tab ${tab === "computers" ? "active" : ""}`}
              onClick={() => switchTab("computers")}
            >
              Компьютеры
              <span className="tab-count">{computers.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "devices"}
              className={`tab ${tab === "devices" ? "active" : ""}`}
              onClick={() => switchTab("devices")}
            >
              Периферия
              <span className="tab-count">{devices.length}</span>
            </button>
          </div>

          <div className="toolbar-right">
            <div className="search-box">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Поиск"
              />
            </div>

            {tab === "devices" && (
              <>
                <select
                  className="filter-select"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  aria-label="Фильтр по типу устройства"
                >
                  <option value="all">Все типы</option>
                  {DEVICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={computerFilter}
                  onChange={(event) => setComputerFilter(event.target.value)}
                  aria-label="Фильтр по компьютеру"
                >
                  <option value="all">Все компьютеры</option>
                  <option value="unassigned">Без привязки</option>
                  {computers.map((computer) => (
                    <option key={computer.id} value={computer.id}>
                      № {computer.inventoryNumber}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => loadAll()}
              disabled={loading}
              title="Обновить данные"
            >
              <RefreshIcon />
              Обновить
            </button>
          </div>
        </div>

        {error && (
          <div className="banner error" role="alert">
            <AlertIcon />
            <div>
              <strong>Не удалось получить данные.</strong>
              <div>{error}</div>
              <div className="banner-hint">
                Проверьте, что сервер API запущен на порту 5169.
              </div>
            </div>
            <button className="btn btn-secondary small" onClick={() => loadAll()}>
              Повторить
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <span className="spinner" />
            Загрузка данных…
          </div>
        ) : tab === "computers" ? (
          filteredComputers.length > 0 ? (
            <>
              {query.trim() && (
                <p className="results-line">
                  Найдено компьютеров: <strong>{filteredComputers.length}</strong>
                </p>
              )}
              <div className="cards-grid">
                {filteredComputers.map((computer) => (
                  <ComputerCard
                    key={computer.id}
                    computer={computer}
                    onEdit={openEditComputer}
                    onDelete={handleDeleteComputer}
                    onAddDevice={(item) => openCreateDevice(item.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title={computers.length ? "Ничего не найдено" : "Пока нет ни одного компьютера"}
              text={
                computers.length
                  ? "Попробуйте изменить поисковый запрос."
                  : "Добавьте первый компьютер, чтобы начать вести учёт техники библиотеки."
              }
              actionLabel={computers.length ? undefined : "Добавить компьютер"}
              onAction={computers.length ? undefined : openCreateComputer}
            />
          )
        ) : filteredDevices.length > 0 ? (
          <>
            {hasDeviceFilters && (
              <p className="results-line">
                Найдено устройств: <strong>{filteredDevices.length}</strong>
              </p>
            )}
            <DeviceTable
              devices={filteredDevices}
              onEdit={openEditDevice}
              onDelete={handleDeleteDevice}
            />
          </>
        ) : (
          <EmptyState
            title={devices.length ? "Ничего не найдено" : "Пока нет периферии"}
            text={
              devices.length
                ? "Измените поисковый запрос или параметры фильтров."
                : "Добавьте мыши, клавиатуры, мониторы и другие устройства с инвентарными номерами."
            }
            actionLabel={devices.length ? undefined : "Добавить устройство"}
            onAction={devices.length ? undefined : () => openCreateDevice()}
          />
        )}
      </main>

      <footer className="app-footer">
        Ганцевичская центральная районная библиотека · Учёт компьютерной техники ·{" "}
        {new Date().getFullYear()}
      </footer>

      {computerModal && (
        <Modal
          title={
            computerModal.mode === "edit"
              ? "Редактирование компьютера"
              : "Новый компьютер"
          }
          subtitle={
            computerModal.mode === "edit"
              ? `Инвентарный № ${computerModal.computer.inventoryNumber}`
              : "Заполните сведения о компьютере"
          }
          onClose={() => setComputerModal(null)}
        >
          <ComputerForm
            initial={computerModal.computer}
            onSubmit={handleSaveComputer}
            onCancel={() => setComputerModal(null)}
          />
        </Modal>
      )}

      {deviceModal && (
        <Modal
          title={
            deviceModal.mode === "edit"
              ? "Редактирование устройства"
              : "Новое устройство"
          }
          subtitle={
            deviceModal.mode === "edit"
              ? `Инвентарный № ${deviceModal.device.inventoryNumber}`
              : "Мышь, клавиатура, монитор или другое оборудование"
          }
          onClose={() => setDeviceModal(null)}
        >
          <DeviceForm
            initial={deviceModal.device}
            computers={computers}
            presetComputerId={deviceModal.presetComputerId}
            onSubmit={handleSaveDevice}
            onCancel={() => setDeviceModal(null)}
          />
        </Modal>
      )}

      {confirm && <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />}

      {toast && (
        <div className="toast" role="status">
          <CheckIcon />
          {toast}
        </div>
      )}
    </div>
  );
}

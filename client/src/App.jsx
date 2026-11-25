import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { DEVICE_TYPES, EQUIPMENT_STATUSES } from "./utils.js";
import ComputerCard from "./components/ComputerCard.jsx";
import DeviceTable from "./components/DeviceTable.jsx";
import ComputerForm from "./components/ComputerForm.jsx";
import DeviceForm from "./components/DeviceForm.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import EmptyState from "./components/EmptyState.jsx";
import Modal from "./components/Modal.jsx";
import Login from "./components/Login.jsx";
import {
  AlertIcon,
  CheckIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon
} from "./components/Icons.jsx";

export default function App() {
  const [allComputers, setAllComputers] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [computers, setComputers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("computers");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [computerFilter, setComputerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [computerModal, setComputerModal] = useState(null);
  const [deviceModal, setDeviceModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [dataModal, setDataModal] = useState(false);
  const [toast, setToast] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const restoreInputRef = useRef(null);
  const importCompRef = useRef(null);
  const importDevRef = useRef(null);
  const initialized = useRef(false);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    let active = true;
    api.getAuthStatus()
      .then((status) => {
        if (active) setAuth(status.authenticated === true);
      })
      .catch(() => {
        if (active) setAuth(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = () => {
    initialized.current = false;
    setError("");
    setAuth(true);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    initialized.current = false;
    setAllComputers([]);
    setAllDevices([]);
    setComputers([]);
    setDevices([]);
    setError("");
    setAuth(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadBase = useCallback(async () => {
    const [computersData, devicesData] = await Promise.all([
      api.getComputers(),
      api.getDevices()
    ]);
    setAllComputers(computersData);
    setAllDevices(devicesData);
    return { computersData, devicesData };
  }, []);

  const loadLists = useCallback(async () => {
    const [computersData, devicesData] = await Promise.all([
      api.getComputers({ search: debouncedQuery, status: statusFilter }),
      api.getDevices({
        search: debouncedQuery,
        status: statusFilter,
        type: typeFilter,
        computerId: computerFilter
      })
    ]);
    setComputers(computersData);
    setDevices(devicesData);
  }, [debouncedQuery, statusFilter, typeFilter, computerFilter]);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      await Promise.all([loadBase(), loadLists()]);
      setError("");
    } catch (err) {
      if (err.status === 401) setAuth(false);
      else setError(err.message);
    } finally {
      if (!silent) setLoading(false);
      initialized.current = true;
    }
  }, [loadBase, loadLists]);

  useEffect(() => {
    if (auth !== true) return;
    loadBase().catch((err) => setError(err.message));
  }, [auth, loadBase]);

  useEffect(() => {
    if (auth !== true) return;
    if (!initialized.current) {
      loadLists()
        .then(() => {
          setError("");
        })
        .catch((err) => setError(err.message))
        .finally(() => {
          setLoading(false);
          initialized.current = true;
        });
      return;
    }
    setListLoading(true);
    loadLists()
      .then(() => setError(""))
      .catch((err) => setError(err.message))
      .finally(() => setListLoading(false));
  }, [auth, loadLists]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const unassignedCount = allDevices.filter((device) => !device.computerId).length;
  const monitorCount = allDevices.filter((device) => device.type === "Monitor").length;
  const writtenOffCount =
    allComputers.filter((c) => c.status === "WrittenOff").length +
    allDevices.filter((d) => d.status === "WrittenOff").length;
  const inRepairCount =
    allComputers.filter((c) => c.status === "InRepair").length +
    allDevices.filter((d) => d.status === "InRepair").length;

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setQuery("");
  };

  const openCreateComputer = () => setComputerModal({ mode: "create", computer: null });
  const openEditComputer = (computer) => setComputerModal({ mode: "edit", computer });
  const openCreateDevice = (computerId = "") =>
    setDeviceModal({ mode: "create", device: null, presetComputerId: computerId ? String(computerId) : "" });
  const openEditDevice = (device) => setDeviceModal({ mode: "edit", device, presetComputerId: "" });

  const handleSaveComputer = async (payload) => {
    const isEditing = computerModal?.mode === "edit";
    if (isEditing) await api.updateComputer(computerModal.computer.id, payload);
    else await api.createComputer(payload);
    setComputerModal(null);
    await loadAll({ silent: true });
    setToast(isEditing ? "Компьютер обновлён" : "Компьютер добавлен");
  };

  const handleSaveDevice = async (payload) => {
    const isEditing = deviceModal?.mode === "edit";
    if (isEditing) await api.updateDevice(deviceModal.device.id, payload);
    else await api.createDevice(payload);
    setDeviceModal(null);
    await loadAll({ silent: true });
    setToast(isEditing ? "Устройство обновлено" : "Устройство добавлено");
  };

  const handleDeleteComputer = (computer) => {
    setConfirm({
      title: "Удалить компьютер?",
      message: `Компьютер № ${computer.inventoryNumber} будет удалён из учёта. Привязанная периферия останется в базе без привязки к компьютеру.`,
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

  const runAction = async (label, fn, { reload = false } = {}) => {
    setBusyAction(label);
    try {
      const res = await fn();
      if (reload) await loadAll({ silent: true });
      return res;
    } finally {
      setBusyAction("");
    }
  };

  const handleBackupDownload = async () => {
    try {
      await runAction("backup", () => api.downloadBackup());
      setToast("Резервная копия скачана (файл .db)");
    } catch (err) {
      setToast(err.message);
    }
  };

  const handleRestoreFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setConfirm({
      title: "Восстановить базу из копии?",
      message: `Текущие данные будут заменены содержимым файла «${file.name}». Рекомендуется заранее скачать текущую резервную копию.`,
      confirmLabel: "Восстановить",
      onConfirm: async () => {
        const res = await runAction("restore", () => api.restoreBackup(file), { reload: true });
        setToast(res?.message || "База данных восстановлена");
      }
    });
  };

  const handleExport = async (kind) => {
    try {
      if (kind === "computers") await runAction("export", () => api.exportComputersCsv());
      else await runAction("export", () => api.exportDevicesCsv());
      setToast("CSV-файл выгружен");
    } catch (err) {
      setToast(err.message);
    }
  };

  const handleImport = async (kind, file) => {
    if (!file) return;
    try {
      const fn = kind === "computers" ? api.importComputersCsv : api.importDevicesCsv;
      const result = await runAction("import", () => fn(file, "upsert"), { reload: true });
      const parts = [`добавлено: ${result.created ?? 0}`, `обновлено: ${result.updated ?? 0}`];
      if (result.skipped) parts.push(`пропущено: ${result.skipped}`);
      if (result.errors?.length) parts.push(`ошибок: ${result.errors.length}`);
      setToast(`Импорт завершён (${parts.join(", ")})`);
      if (result.errors?.length) {
        console.warn("Ошибки импорта CSV:", result.errors);
      }
    } catch (err) {
      setToast(err.message);
    }
  };

  if (auth === null) {
    return (
      <div className="loading-state" role="status">
        <span className="spinner" />
        Проверка доступа…
      </div>
    );
  }

  if (auth === false) {
    return <Login onSuccess={handleLogin} />;
  }

  const searchPlaceholder =
    tab === "computers"
      ? "Поиск по номеру, модели, кабинету..."
      : "Поиск по номеру, модели, компьютеру...";

  const hasDeviceFilters =
    query.trim() !== "" || typeFilter !== "all" || computerFilter !== "all" || statusFilter !== "all";
  const hasComputerFilters = query.trim() !== "" || statusFilter !== "all";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="logo">ГЦРБ</div>
          <div>
            <p className="eyebrow">Ганцевичская центральная районная библиотека</p>
            <h1>Учёт компьютеров и техники</h1>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary btn-header" onClick={handleLogout}>
            Выйти
          </button>
          <button className="btn btn-secondary btn-header" onClick={() => setDataModal(true)}>
            Данные
          </button>
          <button
            className="btn btn-light"
            onClick={tab === "computers" ? openCreateComputer : () => openCreateDevice()}
          >
            <PlusIcon />
            {tab === "computers" ? "Добавить компьютер" : "Добавить устройство"}
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Сводка по учёту">
        <div className="stat-card">
          <span className="stat-label">Компьютеры</span>
          <span className="stat-value">{allComputers.length}</span>
          <span className="stat-note">в базе учёта</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Периферия</span>
          <span className="stat-value">{allDevices.length}</span>
          <span className="stat-note">мыши, клавиатуры, мониторы и др.</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Мониторы</span>
          <span className="stat-value">{monitorCount}</span>
          <span className="stat-note">отдельно от компьютеров</span>
        </div>
        <div className={`stat-card ${unassignedCount > 0 ? "stat-warn" : ""}`}>
          <span className="stat-label">Без привязки</span>
          <span className="stat-value">{unassignedCount}</span>
          <span className="stat-note">устройства не назначены</span>
        </div>
        <div className={`stat-card ${inRepairCount > 0 ? "stat-warn" : ""}`}>
          <span className="stat-label">В ремонте</span>
          <span className="stat-value">{inRepairCount}</span>
          <span className="stat-note">компьютеры и устройства</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Списано</span>
          <span className="stat-value">{writtenOffCount}</span>
          <span className="stat-note">выведено из эксплуатации</span>
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
              <span className="tab-count">{allComputers.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "devices"}
              className={`tab ${tab === "devices" ? "active" : ""}`}
              onClick={() => switchTab("devices")}
            >
              Периферия
              <span className="tab-count">{allDevices.length}</span>
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

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Фильтр по статусу"
            >
              <option value="all">Все статусы</option>
              {EQUIPMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

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
                    <option key={type.value} value={type.value}>{type.label}</option>
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
                  {allComputers.map((computer) => (
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
              disabled={loading || listLoading}
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
              <strong>Не удалось загрузить данные.</strong>
              <div>{error}</div>
              <div className="banner-hint">Убедитесь, что сервер приложения запущен и доступен.</div>
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
          computers.length > 0 ? (
            <>
              {hasComputerFilters && (
                <p className="results-line">
                  Найдено компьютеров: <strong>{computers.length}</strong>
                  {listLoading ? " (обновление…)" : ""}
                </p>
              )}
              <div className="cards-grid">
                {computers.map((computer) => (
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
              title={allComputers.length ? "Ничего не найдено" : "Пока нет ни одного компьютера"}
              text={
                allComputers.length
                  ? "Попробуйте изменить поиск или фильтры."
                  : "Добавьте первый компьютер, чтобы начать учёт техники библиотеки."
              }
              actionLabel={allComputers.length ? undefined : "Добавить компьютер"}
              onAction={allComputers.length ? undefined : openCreateComputer}
            />
          )
        ) : devices.length > 0 ? (
          <>
            {hasDeviceFilters && (
              <p className="results-line">
                Найдено устройств: <strong>{devices.length}</strong>
                {listLoading ? " (обновление…)" : ""}
              </p>
            )}
            <DeviceTable
              devices={devices}
              onEdit={openEditDevice}
              onDelete={handleDeleteDevice}
            />
          </>
        ) : (
          <EmptyState
            title={allDevices.length ? "Ничего не найдено" : "Пока нет периферии"}
            text={
              allDevices.length
                ? "Измените поисковый запрос или фильтры."
                : "Добавьте мыши, клавиатуры, мониторы и другую периферию в базу учёта."
            }
            actionLabel={allDevices.length ? undefined : "Добавить устройство"}
            onAction={allDevices.length ? undefined : () => openCreateDevice()}
          />
        )}
      </main>

      <footer className="app-footer">
        Ганцевичская центральная районная библиотека · учёт техники · {new Date().getFullYear()}
      </footer>

      {computerModal && (
        <Modal
          title={computerModal.mode === "edit" ? "Редактирование компьютера" : "Новый компьютер"}
          subtitle={
            computerModal.mode === "edit"
              ? `Инвентарный № ${computerModal.computer.inventoryNumber}`
              : "Заполните данные о компьютере"
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
          title={deviceModal.mode === "edit" ? "Редактирование устройства" : "Новое устройство"}
          subtitle={
            deviceModal.mode === "edit"
              ? `Инвентарный № ${deviceModal.device.inventoryNumber}`
              : "Мышь, клавиатура, монитор или другое оборудование"
          }
          onClose={() => setDeviceModal(null)}
        >
          <DeviceForm
            initial={deviceModal.device}
            computers={allComputers}
            presetComputerId={deviceModal.presetComputerId}
            onSubmit={handleSaveDevice}
            onCancel={() => setDeviceModal(null)}
          />
        </Modal>
      )}

      {dataModal && (
        <Modal title="Данные и резервные копии" subtitle="Экспорт, импорт (CSV) и бэкап базы (SQLite .db)" onClose={() => setDataModal(false)} size="wide">
          <div className="data-tools">
            <section className="data-section">
              <h3>Резервная копия (SQLite)</h3>
              <p className="form-hint">Полная копия базы данных в формате .db — универсальный формат SQLite. Рекомендуется делать перед обновлениями и импортом.</p>
              <div className="data-actions">
                <button className="btn btn-primary" onClick={handleBackupDownload} disabled={!!busyAction}>
                  Скачать бэкап (.db)
                </button>
                <button className="btn btn-secondary" onClick={() => restoreInputRef.current?.click()} disabled={!!busyAction}>
                  Восстановить из .db…
                </button>
                <input ref={restoreInputRef} type="file" accept=".db,.sqlite,.sqlite3,application/x-sqlite3" style={{ display: "none" }} onChange={handleRestoreFile} />
              </div>
            </section>

            <section className="data-section">
              <h3>Экспорт в CSV</h3>
              <p className="form-hint">CSV (UTF-8) — открывается в Excel, LibreOffice, Google Sheets. Удобно для отчётов и печати.</p>
              <div className="data-actions">
                <button className="btn btn-secondary" onClick={() => handleExport("computers")} disabled={!!busyAction}>
                  Экспорт компьютеров (.csv)
                </button>
                <button className="btn btn-secondary" onClick={() => handleExport("devices")} disabled={!!busyAction}>
                  Экспорт периферии (.csv)
                </button>
              </div>
            </section>

            <section className="data-section">
              <h3>Импорт из CSV</h3>
              <p className="form-hint">Импорт добавляет новые записи и обновляет существующие по инвентарному номеру с учётом регистра кириллицы и пробелов. Инвентарный номер должен быть уникальным для всех компьютеров и устройств. Формат колонок — как в экспортированных CSV. Для периферии привязка к компьютеру задаётся колонкой ComputerInventoryNumber.</p>
              <div className="data-actions">
                <button className="btn btn-secondary" onClick={() => importCompRef.current?.click()} disabled={!!busyAction}>
                  Импорт компьютеров (.csv)…
                </button>
                <button className="btn btn-secondary" onClick={() => importDevRef.current?.click()} disabled={!!busyAction}>
                  Импорт периферии (.csv)…
                </button>
                <input ref={importCompRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleImport("computers", f); }} />
                <input ref={importDevRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleImport("devices", f); }} />
              </div>
              <details className="import-help">
                <summary>Подсказка по колонкам CSV</summary>
                <p><strong>Компьютеры:</strong> InventoryNumber, Status (InUse/InRepair/InStock/WrittenOff), Model, Processor, GraphicsCard, RamGb, Storage, Motherboard, OperatingSystem, Location, AssignedTo, CommissionedOn, DecommissionedOn, DecommissionReason, Notes</p>
                <p><strong>Периферия:</strong> InventoryNumber, Status, Type (Mouse/Keyboard/Monitor/Printer/Scanner/Ups/Other), Manufacturer, Model, SerialNumber, ComputerInventoryNumber, DecommissionedOn, DecommissionReason, Notes</p>
                <p>Даты в формате YYYY-MM-DD. Кодировка UTF-8.</p>
              </details>
            </section>
          </div>
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { DEVICE_TYPES, EQUIPMENT_STATUSES, matchesSearch, statusLabel } from "./utils.js";
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
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredComputers = useMemo(
    () =>
      computers.filter((computer) => {
        if (statusFilter !== "all" && computer.status !== statusFilter) return false;
        return matchesSearch(query, [
          computer.inventoryNumber,
          computer.model,
          computer.processor,
          computer.graphicsCard,
          computer.ramGb ? `${computer.ramGb} ??` : null,
          computer.storage,
          computer.motherboard,
          computer.operatingSystem,
          computer.location,
          computer.assignedTo,
          statusLabel(computer.status),
          computer.decommissionReason,
          ...(computer.devices ?? []).flatMap((device) => [
            device.inventoryNumber,
            device.manufacturer,
            device.model
          ])
        ]);
      }),
    [computers, query, statusFilter]
  );

  const filteredDevices = useMemo(
    () =>
      devices.filter((device) => {
        if (typeFilter !== "all" && device.type !== typeFilter) return false;
        if (statusFilter !== "all" && device.status !== statusFilter) return false;
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
          statusLabel(device.status),
          device.decommissionReason,
          device.notes
        ]);
      }),
    [devices, query, typeFilter, computerFilter, statusFilter]
  );

  const unassignedCount = devices.filter((device) => !device.computerId).length;
  const monitorCount = devices.filter((device) => device.type === "Monitor").length;
  const writtenOffCount =
    computers.filter((c) => c.status === "WrittenOff").length +
    devices.filter((d) => d.status === "WrittenOff").length;
  const inRepairCount =
    computers.filter((c) => c.status === "InRepair").length +
    devices.filter((d) => d.status === "InRepair").length;

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
    setToast(isEditing ? "????????? ????????" : "????????? ????????");
  };

  const handleSaveDevice = async (payload) => {
    const isEditing = deviceModal?.mode === "edit";
    if (isEditing) await api.updateDevice(deviceModal.device.id, payload);
    else await api.createDevice(payload);
    setDeviceModal(null);
    await loadAll({ silent: true });
    setToast(isEditing ? "?????????? ?????????" : "?????????? ?????????");
  };

  const handleDeleteComputer = (computer) => {
    setConfirm({
      title: "??????? ??????????",
      message: `????????? ? ${computer.inventoryNumber} ????? ?????? ?? ?????. ??????????? ????????? ????????? ? ???? ??? ???????? ? ??????????.`,
      confirmLabel: "??????? ?????????",
      onConfirm: async () => {
        await api.deleteComputer(computer.id);
        await loadAll({ silent: true });
        setToast("????????? ??????");
      }
    });
  };

  const handleDeleteDevice = (device) => {
    setConfirm({
      title: "??????? ???????????",
      message: `?????????? ? ${device.inventoryNumber} ????? ??????? ?? ?????.`,
      confirmLabel: "??????? ??????????",
      onConfirm: async () => {
        await api.deleteDevice(device.id);
        await loadAll({ silent: true });
        setToast("?????????? ???????");
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
      setToast("????????? ????? ??????? (???? .db)");
    } catch (err) {
      setToast(err.message);
    }
  };

  const handleRestoreFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setConfirm({
      title: "???????????? ???? ?? ??????",
      message: `??????? ?????? ????? ???????? ?????????? ????? ?${file.name}?. ????????????? ??????? ??????? ??????? ????????? ?????.`,
      confirmLabel: "????????????",
      onConfirm: async () => {
        const res = await runAction("restore", () => api.restoreBackup(file), { reload: true });
        setToast(res?.message || "???? ?????? ?????????????");
      }
    });
  };

  const handleExport = async (kind) => {
    try {
      if (kind === "computers") await runAction("export", () => api.exportComputersCsv());
      else await runAction("export", () => api.exportDevicesCsv());
      setToast("CSV-???? ????????");
    } catch (err) {
      setToast(err.message);
    }
  };

  const handleImport = async (kind, file) => {
    if (!file) return;
    try {
      const fn = kind === "computers" ? api.importComputersCsv : api.importDevicesCsv;
      const result = await runAction("import", () => fn(file, "upsert"), { reload: true });
      const parts = [`?????????: ${result.created ?? 0}`, `?????????: ${result.updated ?? 0}`];
      if (result.skipped) parts.push(`?????????: ${result.skipped}`);
      if (result.errors?.length) parts.push(`??????: ${result.errors.length}`);
      setToast(`?????? ???????? (${parts.join(", ")})`);
      if (result.errors?.length) {
        console.warn("?????? ??????? CSV:", result.errors);
      }
    } catch (err) {
      setToast(err.message);
    }
  };

  const searchPlaceholder =
    tab === "computers"
      ? "????? ?? ??????, ??????, ????????..."
      : "????? ?? ??????, ??????, ??????????...";

  const hasDeviceFilters =
    query.trim() !== "" || typeFilter !== "all" || computerFilter !== "all" || statusFilter !== "all";
  const hasComputerFilters = query.trim() !== "" || statusFilter !== "all";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="logo">????</div>
          <div>
            <p className="eyebrow">???????????? ??????????? ???????? ??????????</p>
            <h1>???? ??????????? ? ???????</h1>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary btn-header" onClick={() => setDataModal(true)}>
            ??????
          </button>
          <button
            className="btn btn-light"
            onClick={tab === "computers" ? openCreateComputer : () => openCreateDevice()}
          >
            <PlusIcon />
            {tab === "computers" ? "???????? ?????????" : "???????? ??????????"}
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="?????? ?? ?????">
        <div className="stat-card">
          <span className="stat-label">??????????</span>
          <span className="stat-value">{computers.length}</span>
          <span className="stat-note">? ???? ?????</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">?????????</span>
          <span className="stat-value">{devices.length}</span>
          <span className="stat-note">????, ??????????, ???????? ? ??.</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">????????</span>
          <span className="stat-value">{monitorCount}</span>
          <span className="stat-note">???????? ?? ???????????</span>
        </div>
        <div className={`stat-card ${unassignedCount > 0 ? "stat-warn" : ""}`}>
          <span className="stat-label">??? ????????</span>
          <span className="stat-value">{unassignedCount}</span>
          <span className="stat-note">?????????? ?? ?????????</span>
        </div>
        <div className={`stat-card ${inRepairCount > 0 ? "stat-warn" : ""}`}>
          <span className="stat-label">? ???????</span>
          <span className="stat-value">{inRepairCount}</span>
          <span className="stat-note">?????????? ? ??????????</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">???????</span>
          <span className="stat-value">{writtenOffCount}</span>
          <span className="stat-note">???????? ?? ????????????</span>
        </div>
      </section>

      <main>
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="??????? ?????">
            <button
              role="tab"
              aria-selected={tab === "computers"}
              className={`tab ${tab === "computers" ? "active" : ""}`}
              onClick={() => switchTab("computers")}
            >
              ??????????
              <span className="tab-count">{computers.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "devices"}
              className={`tab ${tab === "devices" ? "active" : ""}`}
              onClick={() => switchTab("devices")}
            >
              ?????????
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
                aria-label="?????"
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="?????? ?? ???????"
            >
              <option value="all">??? ???????</option>
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
                  aria-label="?????? ?? ???? ??????????"
                >
                  <option value="all">??? ????</option>
                  {DEVICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={computerFilter}
                  onChange={(event) => setComputerFilter(event.target.value)}
                  aria-label="?????? ?? ??????????"
                >
                  <option value="all">??? ??????????</option>
                  <option value="unassigned">??? ????????</option>
                  {computers.map((computer) => (
                    <option key={computer.id} value={computer.id}>
                      ? {computer.inventoryNumber}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => loadAll()}
              disabled={loading}
              title="???????? ??????"
            >
              <RefreshIcon />
              ????????
            </button>
          </div>
        </div>

        {error && (
          <div className="banner error" role="alert">
            <AlertIcon />
            <div>
              <strong>?? ??????? ????????? ??????.</strong>
              <div>{error}</div>
              <div className="banner-hint">?????????, ??? ?????? API ??????? (???? 5169).</div>
            </div>
            <button className="btn btn-secondary small" onClick={() => loadAll()}>
              ?????????
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <span className="spinner" />
            ???????? ???????
          </div>
        ) : tab === "computers" ? (
          filteredComputers.length > 0 ? (
            <>
              {hasComputerFilters && (
                <p className="results-line">
                  ??????? ???????????: <strong>{filteredComputers.length}</strong>
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
              title={computers.length ? "?????? ?? ???????" : "???? ??? ?? ?????? ??????????"}
              text={
                computers.length
                  ? "?????????? ???????? ????? ??? ???????."
                  : "???????? ?????? ?????????, ????? ?????? ???? ??????? ??????????."
              }
              actionLabel={computers.length ? undefined : "???????? ?????????"}
              onAction={computers.length ? undefined : openCreateComputer}
            />
          )
        ) : filteredDevices.length > 0 ? (
          <>
            {hasDeviceFilters && (
              <p className="results-line">
                ??????? ?????????: <strong>{filteredDevices.length}</strong>
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
            title={devices.length ? "?????? ?? ???????" : "???? ??? ?????????"}
            text={
              devices.length
                ? "???????? ????????? ?????? ??? ???????."
                : "???????? ????, ??????????, ???????? ? ?????? ????????? ? ???? ?????."
            }
            actionLabel={devices.length ? undefined : "???????? ??????????"}
            onAction={devices.length ? undefined : () => openCreateDevice()}
          />
        )}
      </main>

      <footer className="app-footer">
        ???????????? ??????????? ???????? ?????????? ? ???? ??????? ? {new Date().getFullYear()}
      </footer>

      {computerModal && (
        <Modal
          title={computerModal.mode === "edit" ? "?????????????? ??????????" : "????? ?????????"}
          subtitle={
            computerModal.mode === "edit"
              ? `??????????? ? ${computerModal.computer.inventoryNumber}`
              : "????????? ?????? ? ??????????"
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
          title={deviceModal.mode === "edit" ? "?????????????? ??????????" : "????? ??????????"}
          subtitle={
            deviceModal.mode === "edit"
              ? `??????????? ? ${deviceModal.device.inventoryNumber}`
              : "????, ??????????, ??????? ??? ?????? ????????????"
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

      {dataModal && (
        <Modal title="?????? ? ????????? ?????" subtitle="???????, ?????? (CSV) ? ????? ???? (SQLite .db)" onClose={() => setDataModal(false)} size="wide">
          <div className="data-tools">
            <section className="data-section">
              <h3>????????? ????? (SQLite)</h3>
              <p className="form-hint">?????? ????? ???? ?????? ? ??????? .db ? ????????????? ?????? SQLite. ????????????? ?????? ????? ???????????? ? ????????.</p>
              <div className="data-actions">
                <button className="btn btn-primary" onClick={handleBackupDownload} disabled={!!busyAction}>
                  ??????? ????? (.db)
                </button>
                <button className="btn btn-secondary" onClick={() => restoreInputRef.current?.click()} disabled={!!busyAction}>
                  ???????????? ?? .db?
                </button>
                <input ref={restoreInputRef} type="file" accept=".db,.sqlite,.sqlite3,application/x-sqlite3" style={{ display: "none" }} onChange={handleRestoreFile} />
              </div>
            </section>

            <section className="data-section">
              <h3>??????? ? CSV</h3>
              <p className="form-hint">CSV (UTF-8) ? ??????????? ? Excel, LibreOffice, Google Sheets. ?????? ??? ??????? ? ??????.</p>
              <div className="data-actions">
                <button className="btn btn-secondary" onClick={() => handleExport("computers")} disabled={!!busyAction}>
                  ??????? ??????????? (.csv)
                </button>
                <button className="btn btn-secondary" onClick={() => handleExport("devices")} disabled={!!busyAction}>
                  ??????? ????????? (.csv)
                </button>
              </div>
            </section>

            <section className="data-section">
              <h3>?????? ?? CSV</h3>
              <p className="form-hint">?????? ????????? ????? ?????? ? ????????? ???????????? ?? ???????????? ??????. ?????? ??????? ? ??? ? ???????????????? CSV. ??? ????????? ???????? ? ?????????? ???????? ???????? ComputerInventoryNumber.</p>
              <div className="data-actions">
                <button className="btn btn-secondary" onClick={() => importCompRef.current?.click()} disabled={!!busyAction}>
                  ?????? ??????????? (.csv)?
                </button>
                <button className="btn btn-secondary" onClick={() => importDevRef.current?.click()} disabled={!!busyAction}>
                  ?????? ????????? (.csv)?
                </button>
                <input ref={importCompRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleImport("computers", f); }} />
                <input ref={importDevRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleImport("devices", f); }} />
              </div>
              <details className="import-help">
                <summary>????????? ?? ???????? CSV</summary>
                <p><strong>??????????:</strong> InventoryNumber, Status (InUse/InRepair/InStock/WrittenOff), Model, Processor, GraphicsCard, RamGb, Storage, Motherboard, OperatingSystem, Location, AssignedTo, CommissionedOn, DecommissionedOn, DecommissionReason, Notes</p>
                <p><strong>?????????:</strong> InventoryNumber, Status, Type (Mouse/Keyboard/Monitor/Printer/Scanner/Ups/Other), Manufacturer, Model, SerialNumber, ComputerInventoryNumber, DecommissionedOn, DecommissionReason, Notes</p>
                <p>???? ? ??????? YYYY-MM-DD. ????????? UTF-8.</p>
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

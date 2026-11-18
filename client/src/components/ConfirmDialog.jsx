import { useState } from "react";
import Modal from "./Modal.jsx";
import { AlertIcon } from "./Icons.jsx";

export default function ConfirmDialog({ config, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setBusy(true);
    setError("");

    try {
      await config.onConfirm();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={config.title} onClose={busy ? () => {} : onClose} size="confirm">
      <div className="confirm-icon">
        <AlertIcon />
      </div>
      <p className="confirm-text">{config.message}</p>

      {error && <div className="form-error">{error}</div>}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          ??????
        </button>
        <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
          {busy ? "??????????..." : config.confirmLabel || "???????????"}
        </button>
      </div>
    </Modal>
  );
}

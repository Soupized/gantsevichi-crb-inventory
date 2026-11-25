import { useState } from "react";
import { api } from "../api";
import { AlertIcon } from "./Icons.jsx";

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await api.login(password);
      setPassword("");
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">ГЦРБ</div>
        <p className="eyebrow">Ганцевичская центральная районная библиотека</p>
        <h1>Учёт компьютеров и техники</h1>
        <p className="login-hint">Введите пароль доступа к базе учёта оборудования.</p>

        {error && (
          <div className="form-error login-error" role="alert">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <label className="form-field">
          <span>Пароль</span>
          <input
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Пароль доступа"
          />
        </label>

        <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
          {busy ? "Проверка..." : "Войти"}
        </button>
      </form>
    </div>
  );
}

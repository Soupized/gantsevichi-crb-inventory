import { MonitorIcon, PlusIcon } from "./Icons.jsx";

export default function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <MonitorIcon />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          <PlusIcon />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

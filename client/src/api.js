const BASE_URL = "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function fetchOptions(options = {}) {
  return {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  };
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, fetchOptions(options));
  } catch {
    throw new ApiError("Не удалось подключиться к серверу. Проверьте, запущено ли приложение.", 0);
  }

  return parseResponse(response);
}

async function parseResponse(response) {
  if (!response.ok) {
    await throwResponseError(response);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response;
}

async function throwResponseError(response) {
  let message = `Ошибка запроса (${response.status})`;

  try {
    const data = await response.json();
    if (data?.errors) {
      message = Object.values(data.errors).flat().join(" ");
    } else if (data?.detail) {
      message = data.detail;
    } else if (data?.title) {
      message = data.title;
    } else if (data?.message) {
      message = data.message;
    }
  } catch {}

  throw new ApiError(message, response.status);
}

async function requestBlob(path) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, fetchOptions());
  } catch {
    throw new ApiError("Не удалось подключиться к серверу. Проверьте, запущено ли приложение.", 0);
  }
  if (!response.ok) {
    await throwResponseError(response);
  }
  return response.blob();
}

async function requestForm(path, formData, method = "POST") {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, fetchOptions({ method, body: formData }));
  } catch {
    throw new ApiError("Не удалось подключиться к серверу. Проверьте, запущено ли приложение.", 0);
  }
  return parseResponse(response);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  getAuthStatus: () => request("/auth/status"),

  login: (password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),

  logout: () => request("/auth/logout", { method: "POST" }),

  getComputers: (params = {}) => {
    const p = typeof params === "string" ? { search: params } : params;
    const qs = new URLSearchParams();
    if (p.search) qs.set("search", p.search);
    if (p.status && p.status !== "all") qs.set("status", p.status);
    const s = qs.toString();
    return request(`/computers${s ? `?${s}` : ""}`);
  },

  getComputer: (id) => request(`/computers/${id}`),

  createComputer: (data) =>
    request("/computers", { method: "POST", body: JSON.stringify(data) }),

  updateComputer: (id, data) =>
    request(`/computers/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteComputer: (id) => request(`/computers/${id}`, { method: "DELETE" }),

  getDevices: (params = {}) => {
    const p = typeof params === "string" ? { search: params } : params;
    const qs = new URLSearchParams();
    if (p.search) qs.set("search", p.search);
    if (p.status && p.status !== "all") qs.set("status", p.status);
    if (p.type && p.type !== "all") qs.set("type", p.type);
    if (p.computerId && p.computerId !== "all" && p.computerId !== "unassigned") {
      qs.set("computerId", p.computerId);
    }
    if (p.computerId === "unassigned" || p.unassigned) qs.set("unassigned", "true");
    const s = qs.toString();
    return request(`/devices${s ? `?${s}` : ""}`);
  },

  getDevice: (id) => request(`/devices/${id}`),

  createDevice: (data) =>
    request("/devices", { method: "POST", body: JSON.stringify(data) }),

  updateDevice: (id, data) =>
    request(`/devices/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteDevice: (id) => request(`/devices/${id}`, { method: "DELETE" }),

  downloadBackup: async () => {
    const blob = await requestBlob("/backup/download");
    const stamp = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const name = `library-backup-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.db`;
    downloadBlob(blob, name);
  },

  restoreBackup: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return requestForm("/backup/restore", fd);
  },

  exportComputersCsv: async () => {
    const blob = await requestBlob("/computers/export.csv");
    downloadBlob(blob, "computers.csv");
  },

  exportDevicesCsv: async () => {
    const blob = await requestBlob("/devices/export.csv");
    downloadBlob(blob, "devices.csv");
  },

  importComputersCsv: (file, mode = "upsert") => {
    const fd = new FormData();
    fd.append("file", file);
    return requestForm(`/computers/import.csv?mode=${encodeURIComponent(mode)}`, fd);
  },

  importDevicesCsv: (file, mode = "upsert") => {
    const fd = new FormData();
    fd.append("file", file);
    return requestForm(`/devices/import.csv?mode=${encodeURIComponent(mode)}`, fd);
  }
};

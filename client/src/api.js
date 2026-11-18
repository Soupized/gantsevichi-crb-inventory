const BASE_URL = "/api";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("?? ??????? ???????????? ? ???????. ?????????, ???????? ?? ??????????.");
  }

  return parseResponse(response);
}

async function parseResponse(response) {
  if (!response.ok) {
    let message = `?????? ??????? (${response.status})`;

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

    throw new Error(message);
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

async function requestBlob(path) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`);
  } catch {
    throw new Error("?? ??????? ???????????? ? ???????. ?????????, ???????? ?? ??????????.");
  }
  if (!response.ok) {
    let message = `?????? ??????? (${response.status})`;
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
      else if (data?.detail) message = data.detail;
    } catch {}
    throw new Error(message);
  }
  return response.blob();
}

async function requestForm(path, formData, method = "POST") {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      body: formData
    });
  } catch {
    throw new Error("?? ??????? ???????????? ? ???????. ?????????, ???????? ?? ??????????.");
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
  getComputers: (search = "") =>
    request(`/computers${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  getComputer: (id) => request(`/computers/${id}`),

  createComputer: (data) =>
    request("/computers", { method: "POST", body: JSON.stringify(data) }),

  updateComputer: (id, data) =>
    request(`/computers/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteComputer: (id) => request(`/computers/${id}`, { method: "DELETE" }),

  getDevices: (search = "") =>
    request(`/devices${search ? `?search=${encodeURIComponent(search)}` : ""}`),

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

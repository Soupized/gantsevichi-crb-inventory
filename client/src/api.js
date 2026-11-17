const BASE_URL = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
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

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
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

  deleteDevice: (id) => request(`/devices/${id}`, { method: "DELETE" })
};

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  "Accept-Language": "UZ",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const multipartHeaders = () => ({
  "Accept-Language": "UZ",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

export const api = {
  get: (path) =>
    fetch(`${BASE}${path}`, { headers: authHeaders() }),

  post: (path, body) =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),

  upload: (path, formData) =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: multipartHeaders(),
      body: formData,
    }),

  download: (path) =>
    fetch(`${BASE}${path}`, { headers: authHeaders() }),
};

export default BASE;

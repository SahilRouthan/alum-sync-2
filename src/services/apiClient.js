import { supabase } from "./supabaseClient";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

async function getAccessToken() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session.access_token;
  }
  return localStorage.getItem("alumsync_access_token") || null;
}

export async function apiRequest(path, options = {}) {
  const token = await getAccessToken();
  const headers = { ...(options.headers || {}) };

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 45000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers,
      body:
        !isFormData && options.body !== undefined && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
    });
  } catch (networkErr) {
    if (networkErr.name === "AbortError") {
      throw new Error("Request timed out while waiting for the server. Please try again.");
    }
    throw networkErr;
  } finally {
    clearTimeout(timer);
  }

  const rawText = await response.text().catch(() => "");
  let data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    const err = new Error(data.error || data.message || `Request failed (${response.status})`);
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => apiRequest(path, { method: "GET" }),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  put: (path, body) => apiRequest(path, { method: "PUT", body }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  delete: (path) => apiRequest(path, { method: "DELETE" }),
  upload: (path, formData) => apiRequest(path, { method: "POST", body: formData }),
};

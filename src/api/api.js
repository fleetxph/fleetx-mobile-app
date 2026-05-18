import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ENV_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "";

const DEFAULT_BASE_URL =
  "https://fleetx-backend-u4k6.onrender.com/api";

export const BASE_URL = String(ENV_BASE_URL || DEFAULT_BASE_URL)
  .trim()
  .replace(/\/+$/, "");
export const API_BASE_URL = BASE_URL;
export const BACKEND_ORIGIN = BASE_URL.replace(/\/api\/?$/, "");

function buildDebugUrl(config = {}) {
  const baseURL = String(config.baseURL || BASE_URL || "").replace(/\/+$/, "");
  const requestUrl = String(config.url || "").trim();

  if (!requestUrl) return baseURL;
  if (/^https?:\/\//i.test(requestUrl)) return requestUrl;

  return `${baseURL}${requestUrl.startsWith("/") ? "" : "/"}${requestUrl}`;
}

function shouldDebugRequest(config = {}) {
  if (!__DEV__) return false;
  const requestUrl = String(config.url || "");
  return requestUrl.includes("/public/vehicles") || requestUrl.includes("/client/login");
}

const PROTECTED_PREFIXES = [
  "/client/bookings",
  "/client/profile",
  "/client/verification",
  "/client/change-password",
  "/client/change-email",
  "/notifications",
];

async function getStoredItem(key) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
}

async function removeStoredItems(keys) {
  if (Platform.OS === "web") {
    keys.forEach((key) => window.localStorage.removeItem(key));
    return;
  }

  await AsyncStorage.multiRemove(keys);
}

export async function clearClientSession() {
  await removeStoredItems([
    "clientUser",
    "clientEmail",
    "clientName",
    "clientToken",
    "token",
    "profileImage",
  ]);
}

export function isUnauthorizedError(error) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || "").toLowerCase();

  return (
    status === 401 ||
    (status === 403 && message.includes("token")) ||
    message.includes("unauthorized") ||
    message.includes("expired token") ||
    message.includes("invalid or expired token")
  );
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const url = String(config.url || "");
  const shouldAttachToken = PROTECTED_PREFIXES.some((prefix) => url.startsWith(prefix));

  if (shouldDebugRequest(config)) {
    console.log("[API][request]", {
      platform: Platform.OS,
      baseURL: config.baseURL || BASE_URL,
      url: buildDebugUrl(config),
      method: String(config.method || "get").toUpperCase(),
      timeout: config.timeout || api.defaults.timeout,
    });
  }

  if (!shouldAttachToken) {
    return config;
  }

  const token = (await getStoredItem("clientToken")) || (await getStoredItem("token"));

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (shouldDebugRequest(response?.config)) {
      console.log("[API][response]", {
        url: buildDebugUrl(response?.config),
        status: response?.status,
        reachedResponse: true,
      });
    }

    return response;
  },
  async (error) => {
    if (shouldDebugRequest(error?.config)) {
      console.log("[API][error]", {
        url: buildDebugUrl(error?.config),
        message: error?.message || "Unknown error",
        code: error?.code || "",
        status: error?.response?.status || null,
        reachedResponse: Boolean(error?.response),
      });
    }

    if (isUnauthorizedError(error)) {
      await clearClientSession();
      error.isAuthExpired = true;
    }

    return Promise.reject(error);
  }
);

export default api;

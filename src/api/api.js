import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const ENV_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.REACT_APP_API_BASE_URL ||
  "";

const DEFAULT_BASE_URL =
  "https://fleetx-backend-u4k6.onrender.com/api";

export const BASE_URL = String(ENV_BASE_URL || DEFAULT_BASE_URL)
  .trim()
  .replace(/\/+$/, "");
export const API_BASE_URL = BASE_URL;
export const BACKEND_ORIGIN = BASE_URL.replace(/\/api\/?$/, "");
const DEFAULT_TIMEOUT_MESSAGE =
  "Server is starting. Please try again in a few seconds.";
const sessionExpiredListeners = new Set();

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
  "/client/push-token",
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
    "authToken",
    "profileImage",
    "sessionSavedAt",
    "expoPushToken",
    "localNotificationInbox",
    "bookingStatusSnapshot",
  ]);
}

export function subscribeToSessionExpired(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired(payload = {}) {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Keep session cleanup resilient even if a listener fails.
    }
  });
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

export function isLikelyServerStartingError(error) {
  const code = String(error?.code || "").toUpperCase();
  const status = Number(error?.response?.status || 0);
  const message = String(
    error?.response?.data?.message || error?.message || ""
  ).toLowerCase();

  return (
    code === "ECONNABORTED" ||
    message.includes("timeout") ||
    message.includes("network error") ||
    message.includes("failed to fetch") ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

export function getFriendlyApiErrorMessage(
  error,
  fallbackMessage = "Something went wrong. Please try again."
) {
  if (isLikelyServerStartingError(error)) {
    return DEFAULT_TIMEOUT_MESSAGE;
  }

  return String(error?.response?.data?.message || error?.message || fallbackMessage);
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
      const status = error?.response?.status || null;
      const tokenExists = Boolean(
        (await getStoredItem("clientToken")) ||
          (await getStoredItem("token")) ||
          (await getStoredItem("authToken"))
      );

      if (tokenExists) {
        await clearClientSession();
        error.isAuthExpired = true;
        if (__DEV__) {
          console.log("[Session][expired]", {
            status,
            cleared: true,
          });
        }
        notifySessionExpired({ status, cleared: true });
      }
    }

    return Promise.reject(error);
  }
);

export async function warmUpBackend() {
  try {
    await api.get("/health", {
      timeout: 6000,
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    if (__DEV__) {
      console.log("[API][warmup:warning]", {
        message: error?.message || "Unknown warm-up error",
        code: error?.code || "",
      });
    }
  }
}

export default api;

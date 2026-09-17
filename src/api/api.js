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
const RESILIENT_GET_TIMEOUT_MS = 35000;
const GET_RETRY_DELAY_MS = 750;
const NETWORK_DEBUG_ENABLED =
  String(process.env.EXPO_PUBLIC_NETWORK_DEBUG || "").trim().toLowerCase() ===
  "true";
const sessionExpiredListeners = new Set();
let warmUpPromise = null;

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

const PREVIEW_DIAGNOSTIC_PATHS = new Set([
  "/health",
  "/public/vehicles",
  "/public/campaigns/active",
  "/client/login",
  "/client/profile",
  "/client/bookings",
  "/notifications",
]);

function shouldLogNetworkRequest(config = {}) {
  if (shouldDebugRequest(config)) return true;
  const requestPath = String(config.url || "").split("?")[0].replace(/\/+$/, "");
  return NETWORK_DEBUG_ENABLED && PREVIEW_DIAGNOSTIC_PATHS.has(requestPath);
}

function isGetRequest(config = {}) {
  return String(config.method || "get").toLowerCase() === "get";
}

function getElapsedMs(config = {}) {
  const startedAt = Number(config._fleetxNetworkStartedAt || 0);
  return startedAt > 0 ? Math.max(0, Date.now() - startedAt) : null;
}

function isRetryableGetNetworkError(error) {
  if (error?.response || !isGetRequest(error?.config)) return false;
  if (Number(error?.config?._fleetxNetworkRetryCount || 0) >= 1) return false;

  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "ECONNABORTED" ||
    code === "ERR_NETWORK" ||
    message.includes("timeout") ||
    message.includes("network error") ||
    message.includes("failed to fetch")
  );
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
    "lastSyncedExpoPushToken",
    "lastPushSyncState",
    "lastPushTokenGenerationState",
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

  if (isGetRequest(config) && Number(config.timeout || 0) <= api.defaults.timeout) {
    config.timeout = RESILIENT_GET_TIMEOUT_MS;
  }
  config._fleetxNetworkStartedAt = Date.now();

  if (shouldLogNetworkRequest(config)) {
    console.log("[API][request]", {
      platform: Platform.OS,
      method: String(config.method || "get").toUpperCase(),
      url: buildDebugUrl(config),
      timeout: config.timeout || api.defaults.timeout,
      attempt: Number(config._fleetxNetworkRetryCount || 0) + 1,
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
    if (shouldLogNetworkRequest(response?.config)) {
      console.log("[API][response]", {
        platform: Platform.OS,
        method: String(response?.config?.method || "get").toUpperCase(),
        url: buildDebugUrl(response?.config),
        timeout: response?.config?.timeout || api.defaults.timeout,
        elapsedMs: getElapsedMs(response?.config),
        status: response?.status,
        reachedResponse: true,
      });
    }

    return response;
  },
  async (error) => {
    if (shouldLogNetworkRequest(error?.config)) {
      console.log("[API][error]", {
        platform: Platform.OS,
        method: String(error?.config?.method || "get").toUpperCase(),
        url: buildDebugUrl(error?.config),
        timeout: error?.config?.timeout || api.defaults.timeout,
        elapsedMs: getElapsedMs(error?.config),
        code: error?.code || "",
        status: error?.response?.status || null,
        reachedResponse: Boolean(error?.response),
      });
    }

    if (isRetryableGetNetworkError(error)) {
      const retryConfig = error.config;
      retryConfig._fleetxNetworkRetryCount = 1;
      if (shouldLogNetworkRequest(retryConfig)) {
        console.log("[API][retry]", {
          platform: Platform.OS,
          method: "GET",
          url: buildDebugUrl(retryConfig),
          timeout: retryConfig.timeout || RESILIENT_GET_TIMEOUT_MS,
          nextAttempt: 2,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAY_MS));
      return api.request(retryConfig);
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

export function warmUpBackend() {
  if (warmUpPromise) return warmUpPromise;

  warmUpPromise = (async () => {
    try {
      await api.get("/health", {
        timeout: RESILIENT_GET_TIMEOUT_MS,
        headers: { "Cache-Control": "no-cache" },
      });
    } catch (error) {
      if (__DEV__ || NETWORK_DEBUG_ENABLED) {
        console.log("[API][warmup:warning]", {
          platform: Platform.OS,
          method: "GET",
          url: `${BASE_URL}/health`,
          timeout: RESILIENT_GET_TIMEOUT_MS,
          code: error?.code || "",
          status: error?.response?.status || null,
          reachedResponse: Boolean(error?.response),
        });
      }
    } finally {
      warmUpPromise = null;
    }
  })();

  return warmUpPromise;
}

export default api;

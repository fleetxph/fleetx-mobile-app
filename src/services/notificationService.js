import { Platform, Vibration } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getBookingStatusMeta } from "../utils/bookingStatusDisplay";
import { registerPushToken, removePushToken } from "../api/clientApi";
import { BASE_URL } from "../api/api";

const PUSH_TOKEN_KEY = "expoPushToken";
const LAST_SYNCED_PUSH_TOKEN_KEY = "lastSyncedExpoPushToken";
const LAST_PUSH_SYNC_STATE_KEY = "lastPushSyncState";
const LAST_PUSH_TOKEN_GENERATION_STATE_KEY = "lastPushTokenGenerationState";
const PUSH_DEVICE_ID_KEY = "expoPushDeviceId";
const PERMISSION_STATUS_KEY = "notificationPermissionStatus";
const PERMISSION_ASKED_KEY = "notificationPermissionAsked";
const LOCAL_NOTIFICATION_INBOX_KEY = "localNotificationInbox";
const BOOKING_STATUS_SNAPSHOT_KEY = "bookingStatusSnapshot";
const LAST_REMOTE_NOTIFICATION_RESPONSE_KEY = "lastRemoteNotificationResponse";
const MAX_LOCAL_NOTIFICATION_ITEMS = 50;
const DEFAULT_VIBRATION_PATTERN = Platform.OS === "android" ? [0, 180] : 180;

let notificationsConfigured = false;
let notificationResponseSubscription = null;

function logPushDiagnostic(event, details = {}) {
  console.info(`[PushNotifications][${event}]`, details);
}

function getExpoProjectIdState() {
  const appConfigProjectId = Constants?.expoConfig?.extra?.eas?.projectId || "";
  if (appConfigProjectId) {
    return { projectId: appConfigProjectId, source: "expoConfig.extra.eas.projectId" };
  }

  const easConfigProjectId = Constants?.easConfig?.projectId || "";
  if (easConfigProjectId) {
    return { projectId: easConfigProjectId, source: "easConfig.projectId" };
  }

  return { projectId: "", source: "missing" };
}

function getSafeTokenGenerationError(error, fallback = "Expo push token generation failed.") {
  const rawMessage = String(error?.message || error || fallback).trim() || fallback;
  return rawMessage
    .replace(/(?:ExponentPushToken|ExpoPushToken)\[[^\]]+\]/g, "[push token hidden]")
    .slice(0, 300);
}

async function setLastPushTokenGenerationState(state = {}) {
  await setStoredJson(LAST_PUSH_TOKEN_GENERATION_STATE_KEY, {
    attemptTime: new Date().toISOString(),
    success: false,
    error: "",
    ...state,
  });
}

function normalizeLower(value) {
  return String(value || "").trim().toLowerCase();
}

async function getStoredItem(key) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key) || "";
  }

  return (await AsyncStorage.getItem(key)) || "";
}

async function setStoredItem(key, value) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

async function removeStoredItem(key) {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }

  await AsyncStorage.removeItem(key);
}

async function getStoredJson(key, fallbackValue) {
  const rawValue = await getStoredItem(key);

  if (!rawValue) return fallbackValue;

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
}

async function setStoredJson(key, value) {
  await setStoredItem(key, JSON.stringify(value));
}

function createLocalNotificationItem({ title = "", body = "", data = {} } = {}) {
  const bookingId = String(data?.bookingId || data?.id || "").trim();
  const bookingReference = String(data?.bookingReference || "").trim();
  const resolvedTitle = String(title || "").trim() || "FleetX Booking Update";
  const resolvedBody = String(body || "").trim();

  return {
    _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    source: "local",
    title: resolvedTitle,
    message: resolvedBody,
    body: resolvedBody,
    createdAt: new Date().toISOString(),
    isRead: false,
    read: false,
    bookingId,
    bookingReference,
    data,
  };
}

async function appendLocalNotificationItem(payload = {}) {
  const nextItem = createLocalNotificationItem(payload);
  const currentItems = await getStoredNotificationInbox();
  const nextItems = [nextItem, ...currentItems].slice(0, MAX_LOCAL_NOTIFICATION_ITEMS);
  await setStoredJson(LOCAL_NOTIFICATION_INBOX_KEY, nextItems);
  return nextItem;
}

function getBookingId(booking = {}) {
  return String(booking?._id || booking?.id || booking?.bookingId || "").trim();
}

function getBookingReference(booking = {}) {
  return String(
    booking?.bookingReference || booking?.bookingCode || booking?.referenceNo || getBookingId(booking)
  ).trim();
}

function getStatusSignals(booking = {}) {
  return [
    booking?.status,
    booking?.bookingStatus,
    booking?.paymentStatus,
    booking?.invoiceStatus,
    booking?.contractStatus,
  ]
    .map(normalizeLower)
    .filter(Boolean);
}

function includesAny(values = [], candidates = []) {
  return candidates.some((candidate) => values.includes(normalizeLower(candidate)));
}

function isActiveStatusKey(statusKey = "") {
  return ![
    "completed",
    "cancelled",
    "rejected",
    "expired",
    "archived",
    "closed",
  ].includes(normalizeLower(statusKey));
}

function buildBookingSnapshotEntry(booking = {}) {
  const bookingId = getBookingId(booking);
  const statusMeta = getBookingStatusMeta(booking);
  const signals = getStatusSignals(booking);

  return {
    bookingId,
    bookingReference: getBookingReference(booking),
    statusKey: normalizeLower(statusMeta?.key),
    paymentStatus: normalizeLower(booking?.paymentStatus),
    invoiceStatus: normalizeLower(booking?.invoiceStatus),
    signals,
    isActive: isActiveStatusKey(statusMeta?.key),
    updatedAt: new Date().toISOString(),
  };
}

function buildStatusChangeNotification(previousEntry, nextEntry) {
  const previousStatusKey = normalizeLower(previousEntry?.statusKey);
  const nextStatusKey = normalizeLower(nextEntry?.statusKey);
  const previousSignals = Array.isArray(previousEntry?.signals) ? previousEntry.signals : [];
  const nextSignals = Array.isArray(nextEntry?.signals) ? nextEntry.signals : [];

  if (
    previousStatusKey === "submitted" &&
    (nextStatusKey === "awaiting_payment" ||
      includesAny(nextSignals, ["approved", "invoice_issued", "awaiting_payment"]))
  ) {
    return {
      title: "Booking approved",
      body: "Your booking was approved and your invoice is ready.",
    };
  }

  if (
    (previousStatusKey === "awaiting_payment" || includesAny(previousSignals, ["awaiting_payment"])) &&
    (nextStatusKey === "under_review" ||
      includesAny(nextSignals, ["under_review", "payment_submitted", "submitted"]))
  ) {
    return {
      title: "Payment proof submitted",
      body: "Your payment proof is being reviewed.",
    };
  }

  if (
    (previousStatusKey === "under_review" || includesAny(previousSignals, ["under_review"])) &&
    (nextStatusKey === "confirmed" ||
      includesAny(nextSignals, ["confirmed", "payment_verified", "verified"]))
  ) {
    return {
      title: "Booking confirmed",
      body: "Your payment has been verified and your booking is confirmed.",
    };
  }

  if (
    previousEntry?.isActive &&
    (nextStatusKey === "cancelled" ||
      nextStatusKey === "rejected" ||
      includesAny(nextSignals, ["cancelled", "rejected"]))
  ) {
    return {
      title: "Booking update",
      body: "Your booking status has changed. Please review the details.",
    };
  }

  return null;
}

export async function configureNotifications() {
  if (notificationsConfigured) return true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "FleetX Updates",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 180, 250],
        sound: "default",
        lightColor: "#F47C20",
      });
    }

    if (!notificationResponseSubscription) {
      notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response?.notification?.request?.content?.data || {};
          setStoredJson(LAST_REMOTE_NOTIFICATION_RESPONSE_KEY, {
            data,
            receivedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      );
    }

    const initialResponse = await Notifications.getLastNotificationResponseAsync();
    if (initialResponse?.notification?.request?.content?.data) {
      await setStoredJson(LAST_REMOTE_NOTIFICATION_RESPONSE_KEY, {
        data: initialResponse.notification.request.content.data,
        receivedAt: new Date().toISOString(),
      });
    }

    notificationsConfigured = true;
    return true;
  } catch (error) {
    logPushDiagnostic("configure", {
      success: false,
      message: error?.message || "Unknown error",
    });
    return false;
  }
}

export async function requestNotificationPermissions() {
  if (Platform.OS === "web") {
    if (__DEV__) {
      console.log("[PushNotifications][permission]", {
        status: "unsupported",
        granted: false,
      });
    }

    return { status: "unsupported", granted: false, canAskAgain: false };
  }

  await configureNotifications();

  const alreadyAsked = (await getStoredItem(PERMISSION_ASKED_KEY)) === "true";
  let permissionResponse = await Notifications.getPermissionsAsync();

  if (!permissionResponse.granted && !alreadyAsked) {
    permissionResponse = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  }

  const status = String(permissionResponse?.status || "undetermined");
  const granted = Boolean(permissionResponse?.granted);

  await Promise.all([
    setStoredItem(PERMISSION_STATUS_KEY, status),
    setStoredItem(PERMISSION_ASKED_KEY, "true"),
  ]);

  logPushDiagnostic("permission", {
    status,
    granted,
    settingsRequired: alreadyAsked && !granted,
  });

  if (alreadyAsked && !granted) {
    logPushDiagnostic("permission:action-required", {
      reason: "notifications_disabled_in_app_settings",
    });
  }

  return {
    status,
    granted,
    canAskAgain: Boolean(permissionResponse?.canAskAgain),
  };
}

export async function getStoredNotificationPermissionState() {
  const status = await getStoredItem(PERMISSION_STATUS_KEY);
  return normalizeLower(status) || "undetermined";
}

async function getExpoPushTokenResult() {
  if (Platform.OS === "web") {
    const error = "Expo push tokens are unavailable on web.";
    await setLastPushTokenGenerationState({ error });
    return { token: "", error, projectIdSource: "not_checked" };
  }

  if (!Device.isDevice) {
    const error = "Expo push tokens require a real Android device.";
    logPushDiagnostic("token", {
      isDevice: false,
      hasToken: false,
      reason: "physical_device_required",
    });
    await setLastPushTokenGenerationState({ error });
    return { token: "", error, projectIdSource: "not_checked" };
  }

  const { projectId, source: projectIdSource } = getExpoProjectIdState();

  if (!projectId) {
    const error = "EAS project ID is missing.";
    logPushDiagnostic("token", {
      isDevice: true,
      hasToken: false,
      reason: "missing_project_id",
    });
    await setLastPushTokenGenerationState({ error, projectIdSource });
    return { token: "", error, projectIdSource };
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = String(tokenResponse?.data || "").trim();
    const error = token ? "" : "Expo returned an empty push token.";

    logPushDiagnostic("token", {
      isDevice: true,
      hasProjectId: true,
      projectIdSource,
      hasToken: Boolean(token),
      reason: token ? "generated" : "empty_token",
    });
    await setLastPushTokenGenerationState({ success: Boolean(token), error, projectIdSource });
    return { token, error, projectIdSource };
  } catch (error) {
    const safeError = getSafeTokenGenerationError(error);
    logPushDiagnostic("token", {
      isDevice: true,
      hasProjectId: true,
      projectIdSource,
      hasToken: false,
      reason: safeError,
    });
    await setLastPushTokenGenerationState({ error: safeError, projectIdSource });
    return { token: "", error: safeError, projectIdSource };
  }
}

export async function getExpoPushToken() {
  const result = await getExpoPushTokenResult();
  return result.token;
}

export async function savePushTokenLocally(token) {
  if (!token) return false;
  await setStoredItem(PUSH_TOKEN_KEY, token);

  if (__DEV__) {
    console.log("[PushNotifications][token]", {
      hasToken: true,
      saved: true,
    });
  }

  return true;
}

export async function getStoredPushToken() {
  return getStoredItem(PUSH_TOKEN_KEY);
}

export async function clearStoredPushToken() {
  await removeStoredItem(PUSH_TOKEN_KEY);
}

async function getPushDeviceId() {
  const storedId = await getStoredItem(PUSH_DEVICE_ID_KEY);
  if (storedId) return storedId;

  const generatedId = `fleetx-${Platform.OS}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  await setStoredItem(PUSH_DEVICE_ID_KEY, generatedId);
  return generatedId;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function shouldRetryPushSync(error) {
  const code = String(error?.code || "").toUpperCase();
  const status = Number(error?.response?.status || 0);
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "ECONNABORTED" ||
    message.includes("timeout") ||
    message.includes("network error") ||
    [502, 503, 504].includes(status)
  );
}

async function setLastPushSyncState(state = {}) {
  await setStoredJson(LAST_PUSH_SYNC_STATE_KEY, {
    attemptTime: new Date().toISOString(),
    success: false,
    backendReached: false,
    status: null,
    message: "",
    ...state,
  });
}

export async function maybeSyncPushTokenToBackend(token) {
  const hasToken = Boolean(String(token || "").trim());
  if (!hasToken) {
    logPushDiagnostic("sync", {
      attempted: false,
      success: false,
      reason: "no_token",
    });
    const result = {
      attempted: false,
      success: false,
      hasToken,
      backendReached: false,
      status: null,
      message: "No Expo push token is available.",
    };
    await setLastPushSyncState(result);
    return result;
  }

  const deviceId = await getPushDeviceId();
  const lastSyncedToken = await getStoredItem(LAST_SYNCED_PUSH_TOKEN_KEY);
  let success = false;
  let backendReached = false;
  let status = null;
  let message = "";

  for (let attempt = 0; attempt < 2 && !success; attempt += 1) {
    await setLastPushSyncState({
      attempted: true,
      success: false,
      message: "Syncing token to backend.",
    });
    logPushDiagnostic("sync", {
      attempted: true,
      attempt: attempt + 1,
      hasToken: true,
      previouslyConfirmedForThisToken: lastSyncedToken === token,
    });
    try {
      const response = await registerPushToken(token, Platform.OS, deviceId);
      await setStoredItem(LAST_SYNCED_PUSH_TOKEN_KEY, token);
      backendReached = true;
      status = 200;
      message = response?.message || "Push token registered successfully.";
      success = true;
    } catch (error) {
      const retryable = shouldRetryPushSync(error);
      backendReached = Boolean(error?.response);
      status = error?.response?.status || null;
      message =
        error?.response?.data?.message ||
        (error?.code === "ECONNABORTED"
          ? "Request timed out while contacting the backend."
          : error?.message || "Push token registration failed.");
      logPushDiagnostic("sync:error", {
        attempt: attempt + 1,
        status,
        code: error?.code || "",
        retryable,
        message,
      });

      if (!retryable) break;
      if (attempt === 0) await wait(3000);
    }
  }

  const result = { attempted: true, success, hasToken, backendReached, status, message };
  await setLastPushSyncState(result);

  logPushDiagnostic("sync:complete", {
    attempted: result.attempted,
    success: result.success,
  });

  return result;
}

export async function unregisterPushNotificationsForSession() {
  const token = await getStoredPushToken();
  if (token) {
    try {
      await removePushToken(token);
    } catch (error) {
      if (__DEV__) {
        console.log("[PushNotifications][remove]", {
          success: false,
          message: error?.message || "Unknown error",
        });
      }
    }
  }

  await clearStoredPushToken();
  await removeStoredItem(LAST_SYNCED_PUSH_TOKEN_KEY);
  await removeStoredItem(LAST_PUSH_SYNC_STATE_KEY);
  await removeStoredItem(LAST_PUSH_TOKEN_GENERATION_STATE_KEY);
}

export async function initializePushNotificationsForSession() {
  logPushDiagnostic("init", { started: true });
  const authToken = (await getStoredItem("clientToken")) || (await getStoredItem("token"));
  logPushDiagnostic("auth", {
    tokenAvailable: Boolean(authToken),
  });

  if (!authToken) {
    logPushDiagnostic("init", {
      completed: true,
      success: false,
      reason: "auth_token_unavailable",
    });
    return {
      granted: false,
      token: "",
    };
  }

  await configureNotifications();
  const permission = await requestNotificationPermissions();

  if (!permission?.granted) {
    logPushDiagnostic("init", {
      completed: true,
      success: false,
      reason: "permission_denied",
    });
    return {
      granted: false,
      token: "",
    };
  }

  const generatedToken = await getExpoPushToken();
  const storedToken = await getStoredPushToken();
  const token = generatedToken || storedToken;

  if (!token) {
    logPushDiagnostic("init", {
      completed: true,
      success: false,
      reason: "token_unavailable",
    });
    return {
      granted: true,
      token: "",
    };
  }

  if (generatedToken) {
    await savePushTokenLocally(generatedToken);
  } else {
    logPushDiagnostic("token", {
      hasToken: true,
      source: "stored_token_resync_fallback",
    });
  }

  const syncResult = await maybeSyncPushTokenToBackend(token);
  logPushDiagnostic("init", {
    completed: true,
    success: syncResult.success,
    hasToken: true,
  });

  return {
    granted: true,
    token,
  };
}

export async function getPushRegistrationDiagnosticState() {
  const [permissionStatus, authToken, storedToken, lastSyncedToken, lastSync, lastGeneration] =
    await Promise.all([
      getStoredNotificationPermissionState(),
      getStoredItem("clientToken").then((value) => value || getStoredItem("token")),
      getStoredPushToken(),
      getStoredItem(LAST_SYNCED_PUSH_TOKEN_KEY),
      getStoredJson(LAST_PUSH_SYNC_STATE_KEY, null),
      getStoredJson(LAST_PUSH_TOKEN_GENERATION_STATE_KEY, null),
    ]);
  const projectState = getExpoProjectIdState();

  return {
    permissionStatus,
    isPhysicalDevice: Boolean(Device.isDevice),
    hasProjectId: Boolean(projectState.projectId),
    projectIdSource: projectState.source,
    hasStoredToken: Boolean(storedToken),
    apiUrl: BASE_URL,
    hasAuthToken: Boolean(authToken),
    lastSyncAttemptTime: lastSync?.attemptTime || "",
    lastSyncSuccess: Boolean(lastSync?.success),
    lastSyncBackendReached: Boolean(lastSync?.backendReached),
    lastSyncStatus: lastSync?.status || null,
    lastSyncMessage: String(lastSync?.message || ""),
    backendSyncConfirmed: Boolean(storedToken && lastSyncedToken === storedToken),
    tokenGenerationAttemptTime: lastGeneration?.attemptTime || "",
    tokenGenerationError: String(lastGeneration?.error || ""),
  };
}

export async function generatePushTokenForDebug() {
  const authToken = (await getStoredItem("clientToken")) || (await getStoredItem("token"));
  const { projectId } = getExpoProjectIdState();
  const baseResult = { success: false, token: "", tokenGenerated: false, message: "" };

  if (!authToken) {
    return { ...baseResult, message: "Please log in again." };
  }
  if (!Device.isDevice) {
    return { ...baseResult, message: "Expo push tokens require a real Android device." };
  }
  if (!projectId) {
    return { ...baseResult, message: "EAS project ID is missing." };
  }

  await configureNotifications();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission?.granted) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }

  await Promise.all([
    setStoredItem(PERMISSION_STATUS_KEY, String(permission?.status || "undetermined")),
    setStoredItem(PERMISSION_ASKED_KEY, "true"),
  ]);
  if (!permission?.granted) {
    return {
      ...baseResult,
      message: "Notifications are disabled. Enable them in Android app settings.",
    };
  }

  const tokenResult = await getExpoPushTokenResult();
  if (!tokenResult.token) {
    return {
      ...baseResult,
      message: tokenResult.error || "No Expo push token could be generated on this device.",
    };
  }

  await savePushTokenLocally(tokenResult.token);
  return {
    success: true,
    token: tokenResult.token,
    tokenGenerated: true,
    message: "Expo push token generated.",
  };
}

export async function syncPushTokenForDebug(tokenValue = "") {
  const authToken = (await getStoredItem("clientToken")) || (await getStoredItem("token"));
  if (!authToken) {
    return {
      success: false,
      backendReached: false,
      status: null,
      message: "Please log in again.",
    };
  }

  const token = String(tokenValue || "").trim() || (await getStoredPushToken());
  if (!token) {
    return {
      success: false,
      backendReached: false,
      status: null,
      message: "Generate an Expo push token first.",
    };
  }

  const sync = await maybeSyncPushTokenToBackend(token);
  return {
    success: Boolean(sync.success),
    backendReached: Boolean(sync.backendReached),
    status: sync.status,
    message: sync.message || (sync.success ? "Push token registered." : "Registration failed."),
  };
}

export async function testPushRegistration() {
  const authToken = (await getStoredItem("clientToken")) || (await getStoredItem("token"));
  const { projectId } = getExpoProjectIdState();
  const baseResult = {
    tokenGenerated: false,
    tokenAvailable: false,
    usedStoredToken: false,
    backendReached: false,
    status: null,
    success: false,
    message: "",
  };

  logPushDiagnostic("test", { started: true, tokenAvailable: Boolean(authToken) });
  if (!authToken) {
    const result = { ...baseResult, message: "Please log in again." };
    await setLastPushSyncState({ attempted: false, message: result.message });
    return result;
  }
  if (!Device.isDevice) {
    const result = { ...baseResult, message: "Push tokens require a real device." };
    await setLastPushSyncState({ attempted: false, message: result.message });
    return result;
  }
  if (!projectId) {
    const result = { ...baseResult, message: "EAS project configuration is missing." };
    await setLastPushSyncState({ attempted: false, message: result.message });
    return result;
  }

  await configureNotifications();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission?.granted) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }

  await Promise.all([
    setStoredItem(PERMISSION_STATUS_KEY, String(permission?.status || "undetermined")),
    setStoredItem(PERMISSION_ASKED_KEY, "true"),
  ]);
  if (!permission?.granted) {
    const result = {
      ...baseResult,
      message: "Notifications are disabled. Enable them in Android app settings.",
    };
    await setLastPushSyncState({ attempted: false, message: result.message });
    return result;
  }

  const generatedToken = await getExpoPushToken();
  const storedToken = await getStoredPushToken();
  const token = generatedToken || storedToken;
  if (!token) {
    const result = {
      ...baseResult,
      message: "No Expo push token could be generated on this device.",
    };
    await setLastPushSyncState({ attempted: false, message: result.message });
    return result;
  }
  if (generatedToken) await savePushTokenLocally(generatedToken);

  const sync = await maybeSyncPushTokenToBackend(token);
  const result = {
    tokenGenerated: Boolean(generatedToken),
    tokenAvailable: Boolean(token),
    usedStoredToken: Boolean(!generatedToken && storedToken),
    backendReached: Boolean(sync.backendReached),
    status: sync.status,
    success: Boolean(sync.success),
    message: sync.message || (sync.success ? "Push token registered." : "Registration failed."),
  };
  logPushDiagnostic("test", result);
  return result;
}

export async function getStoredNotificationInbox() {
  const items = await getStoredJson(LOCAL_NOTIFICATION_INBOX_KEY, []);
  return Array.isArray(items) ? items : [];
}

export async function getUnreadLocalNotificationCount() {
  const items = await getStoredNotificationInbox();
  return items.filter((item) => !item?.isRead && !item?.read && !item?.readAt).length;
}

export async function markLocalNotificationRead(notificationId) {
  const items = await getStoredNotificationInbox();
  const nextItems = items.map((item) =>
    item?._id === notificationId
      ? {
          ...item,
          isRead: true,
          read: true,
          readAt: item?.readAt || new Date().toISOString(),
        }
      : item
  );

  await setStoredJson(LOCAL_NOTIFICATION_INBOX_KEY, nextItems);
}

export async function markAllLocalNotificationsRead() {
  const items = await getStoredNotificationInbox();
  const readAt = new Date().toISOString();
  const nextItems = items.map((item) => ({
    ...item,
    isRead: true,
    read: true,
    readAt: item?.readAt || readAt,
  }));

  await setStoredJson(LOCAL_NOTIFICATION_INBOX_KEY, nextItems);
}

export async function scheduleLocalNotification({ title, body, data = {} } = {}) {
  const inboxItem = await appendLocalNotificationItem({ title, body, data });

  if (Platform.OS === "web") {
    return inboxItem;
  }

  try {
    const permissionResponse = await Notifications.getPermissionsAsync();

    if (!permissionResponse?.granted) {
      return inboxItem;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: "default",
        color: "#F47C20",
      },
      trigger: null,
    });
  } catch (error) {
    if (__DEV__) {
      console.log("[PushNotifications][local]", {
        success: false,
        message: error?.message || "Unknown error",
      });
    }
  }

  return inboxItem;
}

export async function notifyWithVibration({ title, body, data = {} } = {}) {
  try {
    Vibration.vibrate(DEFAULT_VIBRATION_PATTERN);
  } catch {
    // Keep notifications resilient even if vibration is unavailable.
  }

  return scheduleLocalNotification({ title, body, data });
}

export async function getStoredBookingStatusSnapshot() {
  const snapshot = await getStoredJson(BOOKING_STATUS_SNAPSHOT_KEY, {});
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
}

export async function syncStoredBookingStatusSnapshot(bookings = []) {
  const currentSnapshot = await getStoredBookingStatusSnapshot();
  const nextSnapshot = { ...currentSnapshot };

  bookings.forEach((booking) => {
    const entry = buildBookingSnapshotEntry(booking);
    if (!entry.bookingId) return;
    nextSnapshot[entry.bookingId] = entry;
  });

  await setStoredJson(BOOKING_STATUS_SNAPSHOT_KEY, nextSnapshot);
  return nextSnapshot;
}

export async function detectBookingStatusChanges(bookings = []) {
  const currentSnapshot = await getStoredBookingStatusSnapshot();
  const nextSnapshot = { ...currentSnapshot };
  let changedCount = 0;
  let notifiedCount = 0;

  for (const booking of bookings) {
    const nextEntry = buildBookingSnapshotEntry(booking);
    if (!nextEntry.bookingId) continue;

    const previousEntry = currentSnapshot[nextEntry.bookingId];
    const statusChanged =
      normalizeLower(previousEntry?.statusKey) !== nextEntry.statusKey ||
      normalizeLower(previousEntry?.paymentStatus) !== nextEntry.paymentStatus ||
      normalizeLower(previousEntry?.invoiceStatus) !== nextEntry.invoiceStatus;

    if (previousEntry && statusChanged) {
      changedCount += 1;
      const notificationPayload = buildStatusChangeNotification(previousEntry, nextEntry);

      if (notificationPayload) {
        await notifyWithVibration({
          ...notificationPayload,
          data: {
            bookingId: nextEntry.bookingId,
            bookingReference: nextEntry.bookingReference,
            statusKey: nextEntry.statusKey,
            notificationType: "booking_status_change",
          },
        });
        notifiedCount += 1;
      }
    }

    nextSnapshot[nextEntry.bookingId] = nextEntry;
  }

  await setStoredJson(BOOKING_STATUS_SNAPSHOT_KEY, nextSnapshot);

  if (__DEV__) {
    console.log("[BookingStatusWatcher]", {
      checkedCount: Array.isArray(bookings) ? bookings.length : 0,
      changedCount,
      notifiedCount,
    });
  }

  return {
    checkedCount: Array.isArray(bookings) ? bookings.length : 0,
    changedCount,
    notifiedCount,
  };
}

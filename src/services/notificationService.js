import { Platform, Vibration } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getBookingStatusMeta } from "../utils/bookingStatusDisplay";

const PUSH_TOKEN_KEY = "expoPushToken";
const PERMISSION_STATUS_KEY = "notificationPermissionStatus";
const PERMISSION_ASKED_KEY = "notificationPermissionAsked";
const LOCAL_NOTIFICATION_INBOX_KEY = "localNotificationInbox";
const BOOKING_STATUS_SNAPSHOT_KEY = "bookingStatusSnapshot";
const MAX_LOCAL_NOTIFICATION_ITEMS = 50;
const DEFAULT_VIBRATION_PATTERN = Platform.OS === "android" ? [0, 180] : 180;

let notificationsConfigured = false;

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

    notificationsConfigured = true;
    return true;
  } catch (error) {
    if (__DEV__) {
      console.log("[PushNotifications][configure]", {
        success: false,
        message: error?.message || "Unknown error",
      });
    }
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

  if (__DEV__) {
    console.log("[PushNotifications][permission]", {
      status,
      granted,
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

export async function getExpoPushToken() {
  if (Platform.OS === "web") {
    if (__DEV__) {
      console.log("[PushNotifications][token]", {
        isDevice: false,
        hasToken: false,
        reason: "web_unsupported",
      });
    }

    return "";
  }

  if (!Device.isDevice) {
    if (__DEV__) {
      console.log("[PushNotifications][token]", {
        isDevice: false,
        hasToken: false,
        reason: "simulator_or_emulator",
      });
    }

    return "";
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || "";

  try {
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = String(tokenResponse?.data || "").trim();

    if (__DEV__) {
      console.log("[PushNotifications][token]", {
        isDevice: true,
        hasToken: Boolean(token),
        reason: token ? "ok" : projectId ? "empty_token" : "missing_project_id",
      });
    }

    return token;
  } catch (error) {
    if (__DEV__) {
      console.log("[PushNotifications][token]", {
        isDevice: true,
        hasToken: false,
        reason: error?.message || "token_error",
      });
    }

    return "";
  }
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

export async function maybeSyncPushTokenToBackend(token) {
  const hasToken = Boolean(String(token || "").trim());

  // TODO: Sync the Expo push token to the backend when a mobile endpoint is added.
  const result = {
    attempted: false,
    success: false,
    endpointFound: false,
    hasToken,
  };

  if (__DEV__) {
    console.log("[PushNotifications][sync]", {
      attempted: result.attempted,
      success: result.success,
      endpointFound: result.endpointFound,
    });
  }

  return result;
}

export async function initializePushNotificationsForSession() {
  await configureNotifications();
  const permission = await requestNotificationPermissions();

  if (!permission?.granted) {
    return {
      granted: false,
      token: "",
    };
  }

  const token = await getExpoPushToken();

  if (!token) {
    return {
      granted: true,
      token: "",
    };
  }

  await savePushTokenLocally(token);
  await maybeSyncPushTokenToBackend(token);

  return {
    granted: true,
    token,
  };
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

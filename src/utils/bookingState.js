import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const PENDING_GUEST_BOOKING_KEY = "pendingGuestBooking";

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

export function getBookingIntentMeta(intent) {
  if (!intent || typeof intent !== "object") {
    return {
      hasSelectedVehicle: false,
      hasDraft: false,
    };
  }

  return {
    hasSelectedVehicle: Boolean(
      intent?.selectedVehicle || intent?.vehicle || intent?.vehicleId
    ),
    hasDraft: Boolean(
      intent?.bookingDraft ||
        intent?.tripData ||
        intent?.currentStep ||
        intent?.pickupDate ||
        intent?.returnDate ||
        intent?.pricingPreview
    ),
  };
}

export async function getStoredBookingIntent(key = PENDING_GUEST_BOOKING_KEY) {
  const rawValue = await getStoredItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export async function saveStoredBookingIntent(intent, key = PENDING_GUEST_BOOKING_KEY) {
  await setStoredItem(key, JSON.stringify(intent || {}));
}

export async function clearStoredBookingIntent({
  reason = "",
  key = PENDING_GUEST_BOOKING_KEY,
  skipLog = false,
} = {}) {
  const intent = await getStoredBookingIntent(key);
  const meta = getBookingIntentMeta(intent);

  await removeStoredItem(key);

  if (__DEV__ && !skipLog) {
    console.log("[BookingState][reset]", {
      reason: reason || "unspecified",
      clearedSelectedVehicle: meta.hasSelectedVehicle,
      clearedDraft: meta.hasDraft,
    });
  }

  return meta;
}

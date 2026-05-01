import { Alert, Linking, Platform, Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { BASE_URL } from "../api/api";

const TOKEN_KEYS = ["clientToken", "token", "authToken"];

async function getStoredItem(key) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
}

async function getStoredToken() {
  for (const key of TOKEN_KEYS) {
    const value = await getStoredItem(key);
    if (value) return value;
  }
  return "";
}

function isProtectedBackendUrl(url) {
  if (!url) return false;
  const value = String(url);
  const base = BASE_URL.replace(/\/+$/, "");
  return value.startsWith(base) || value.includes("/api/client/bookings/");
}

function getFileName(type, bookingReference) {
  const safeReference = String(bookingReference || "document").replace(/[^a-z0-9-_]/gi, "_");
  return `fleetdrive-${type}-${safeReference}.pdf`;
}

function sanitizeFileName(value) {
  return String(value || "document")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 80);
}

async function openPublicUrl(url, title) {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert("Could not open document", `${title} could not be opened on this device.`);
    return;
  }

  await Linking.openURL(url);
}

async function openProtectedPdfOnWeb({ url, bookingReference, type, title }) {
  const token = await getStoredToken();
  if (!token) {
    Alert.alert("Login required", "Please sign in again to view this document.");
    return;
  }

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
    });
  } catch {
    Alert.alert("Download failed", "The document could not be downloaded right now.");
    return;
  }

  if (response.status === 401 || response.status === 403) {
    Alert.alert("Session expired", "Please sign in again to view this document.");
    return;
  }

  if (!response.ok) {
    Alert.alert("Download failed", "The document could not be downloaded right now.");
    return;
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.download = getFileName(type, bookingReference);
  link.click();
  window.URL.revokeObjectURL(objectUrl);
}

export async function openProtectedPdf({
  url,
  bookingReference,
  documentReference,
  type = "document",
  title = "Document",
}) {
  try {
    if (!url) {
      Alert.alert("Not available", `${title} is not available yet.`);
      return;
    }

    if (!isProtectedBackendUrl(url)) {
      await openPublicUrl(url, title);
      return;
    }

    if (Platform.OS === "web") {
      await openProtectedPdfOnWeb({ url, bookingReference: documentReference || bookingReference, type, title });
      return;
    }

    const token = await getStoredToken();
    if (!token) {
      Alert.alert("Login required", "Please sign in again to view this document.");
      return;
    }

    const safeType = sanitizeFileName(type);
    const safeRef = sanitizeFileName(documentReference || bookingReference || Date.now());
    const fileUri = `${FileSystem.cacheDirectory}fleetdrive-${safeType}-${safeRef}.pdf`;
    const result = await FileSystem.downloadAsync(url, fileUri, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
    });

    if (result.status === 401 || result.status === 403) {
      Alert.alert("Session expired", "Please sign in again to view this document.");
      return;
    }

    if (result.status < 200 || result.status >= 300) {
      Alert.alert("Download failed", "The document could not be downloaded right now.");
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert(
        "Downloaded",
        "The PDF was downloaded, but sharing/opening is not available on this device."
      );
      return;
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Open ${title}`,
      UTI: "com.adobe.pdf",
    });
  } catch (error) {
    console.log("PDF open/download error:", error?.message || error);
    Alert.alert("Download failed", "Unable to open the PDF. Please try again.");
  }
}

export async function shareDocumentLink({ url, bookingReference, documentReference, type, title }) {
  if (!url) {
    Alert.alert("Not available", `${title} is not available yet.`);
    return;
  }

  if (isProtectedBackendUrl(url)) {
    await openProtectedPdf({ url, bookingReference, documentReference, type, title });
    return;
  }

  try {
    await Share.share({
      title,
      message: `${title} for booking ${bookingReference || "FleetDrive"}: ${url}`,
      url,
    });
  } catch {
    Alert.alert("Share failed", `Could not share ${title.toLowerCase()}.`);
  }
}

export { TOKEN_KEYS };

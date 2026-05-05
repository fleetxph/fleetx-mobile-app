import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { BACKEND_ORIGIN, BASE_URL, clearClientSession } from "../api/api";

const TOKEN_KEYS = ["clientToken", "token", "authToken"];

class PdfActionError extends Error {
  constructor(message, code = "PDF_ERROR") {
    super(message);
    this.name = "PdfActionError";
    this.code = code;
  }
}

async function getStoredItem(key) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
}

function sanitizeFilename(value) {
  const safeName = String(value || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);

  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

function normalizeHeaderValue(headers, key) {
  if (!headers) return "";

  const matchedKey = Object.keys(headers).find(
    (headerKey) => String(headerKey).toLowerCase() === key.toLowerCase()
  );

  return matchedKey ? String(headers[matchedKey] || "") : "";
}

function isLikelyPdfContentType(contentType) {
  const normalized = String(contentType || "").toLowerCase();

  return (
    normalized.includes("application/pdf") ||
    normalized.includes("application/octet-stream") ||
    normalized.includes("binary/pdf")
  );
}

function resolveLocalhostUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);

    if (!["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
      return parsed.toString();
    }

    const backendUrl = new URL(BACKEND_ORIGIN);
    parsed.protocol = backendUrl.protocol;
    parsed.hostname = backendUrl.hostname;
    parsed.port = backendUrl.port;
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export async function getAuthHeaders() {
  let token = "";

  for (const key of TOKEN_KEYS) {
    const value = await getStoredItem(key);
    if (value) {
      token = value;
      break;
    }
  }

  return {
    headers: {
      Accept: "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    tokenExists: Boolean(token),
  };
}

export function resolvePdfUrl(pathOrUrl) {
  if (!pathOrUrl) return "";

  const rawValue = String(pathOrUrl).trim();
  if (!rawValue) return "";

  if (/^[a-z]:\\/i.test(rawValue) || rawValue.startsWith("\\\\")) {
    return "";
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return resolveLocalhostUrl(rawValue);
  }

  const backendOrigin = BACKEND_ORIGIN.replace(/\/+$/, "");
  const apiBaseUrl = BASE_URL.replace(/\/+$/, "");
  const normalizedValue = rawValue.replace(/\\/g, "/");

  if (normalizedValue.startsWith("/api/")) {
    return `${backendOrigin}${normalizedValue}`;
  }

  if (normalizedValue.startsWith("api/")) {
    return `${backendOrigin}/${normalizedValue}`;
  }

  if (
    normalizedValue.startsWith("/client/") ||
    normalizedValue.startsWith("/public/") ||
    normalizedValue.startsWith("client/") ||
    normalizedValue.startsWith("public/")
  ) {
    const safePath = normalizedValue.replace(/^\/+/, "");
    return `${apiBaseUrl}/${safePath}`;
  }

  if (normalizedValue.startsWith("/")) {
    return `${backendOrigin}${normalizedValue}`;
  }

  if (/\.pdf($|\?)/i.test(normalizedValue) && !normalizedValue.includes("/")) {
    return `${backendOrigin}/uploads/${normalizedValue.replace(/^\/+/, "")}`;
  }

  return `${apiBaseUrl}/${normalizedValue.replace(/^\/+/, "")}`;
}

async function validateDownloadedPdf({ uri, headers }) {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  const contentType = normalizeHeaderValue(headers, "content-type");

  console.log("PDF file info:", {
    uri,
    exists: info.exists,
    size: info.size,
    contentType,
  });

  if (!info.exists || !info.size) {
    throw new PdfActionError(
      "Unable to prepare the PDF. Please check your connection and try again.",
      "EMPTY_FILE"
    );
  }

  if (contentType && !isLikelyPdfContentType(contentType)) {
    throw new PdfActionError(
      "Unable to prepare the PDF. Please check your connection and try again.",
      "INVALID_CONTENT_TYPE"
    );
  }

  return info;
}

export async function downloadPdfToCache({
  source,
  fileName,
  title = "PDF",
}) {
  const resolvedUrl = resolvePdfUrl(source);

  if (!resolvedUrl) {
    throw new PdfActionError(
      "PDF is not available yet. Please try again later.",
      "MISSING_SOURCE"
    );
  }

  const { headers, tokenExists } = await getAuthHeaders();
  const targetFileName = sanitizeFilename(fileName || title);
  const cacheDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;

  if (!cacheDirectory) {
    throw new PdfActionError(
      "Unable to prepare the PDF. Please check your connection and try again.",
      "MISSING_CACHE_DIR"
    );
  }

  const targetUri = `${cacheDirectory}${targetFileName}`;

  console.log("Preparing PDF download:", {
    resolvedUrl,
    tokenExists,
    targetUri,
  });

  let result;
  try {
    result = await FileSystem.downloadAsync(resolvedUrl, targetUri, { headers });
  } catch (error) {
    console.log("PDF download request failed:", error?.message || error);
    throw new PdfActionError(
      "Unable to prepare the PDF. Please check your connection and try again.",
      "NETWORK_ERROR"
    );
  }

  console.log("PDF download result:", {
    resolvedUrl,
    status: result?.status,
    headers: result?.headers,
    tokenExists,
  });

  if (result?.status === 401 || result?.status === 403) {
    await clearClientSession();
    throw new PdfActionError(
      "Please log in again to access this document.",
      "AUTH_REQUIRED"
    );
  }

  if (!result?.status || result.status < 200 || result.status >= 300) {
    throw new PdfActionError(
      "Unable to prepare the PDF. Please check your connection and try again.",
      "DOWNLOAD_FAILED"
    );
  }

  await validateDownloadedPdf(result);

  return {
    localUri: result.uri,
    resolvedUrl,
    fileName: targetFileName,
  };
}

async function shareLocalPdf(localUri, dialogTitle) {
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(localUri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle,
    });
    return;
  }

  const supported = await Linking.canOpenURL(localUri);
  if (supported) {
    await Linking.openURL(localUri);
    return;
  }

  throw new PdfActionError(
    "Unable to prepare the PDF. Please check your connection and try again.",
    "OPEN_UNAVAILABLE"
  );
}

export async function openPdf(options) {
  const { localUri } = await downloadPdfToCache(options);
  await shareLocalPdf(localUri, "Open PDF");
  return localUri;
}

export async function downloadPdf(options) {
  const { localUri } = await downloadPdfToCache(options);
  await shareLocalPdf(localUri, "Save or Open PDF");
  return localUri;
}

export async function sharePdf(options) {
  const { localUri } = await downloadPdfToCache(options);
  await shareLocalPdf(localUri, "Share PDF");
  return localUri;
}

export function showPdfError(error, fallbackMessage) {
  const message =
    error instanceof PdfActionError
      ? error.message
      : fallbackMessage || "Unable to prepare the PDF. Please check your connection and try again.";

  Alert.alert("PDF Error", message);
}

export { PdfActionError, TOKEN_KEYS };

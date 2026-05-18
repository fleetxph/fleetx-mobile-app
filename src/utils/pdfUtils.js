import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { BACKEND_ORIGIN, BASE_URL, clearClientSession } from "../api/api";

const TOKEN_KEYS = ["clientToken", "token", "authToken"];

class PdfActionError extends Error {
  constructor(message, code = "PDF_ERROR", details = {}) {
    super(message);
    this.name = "PdfActionError";
    this.code = code;
    this.status = details.status || null;
    this.type = details.type || null;
    this.backendMessage = details.backendMessage || "";
  }
}

function logPdfDiagnostic(label, payload) {
  if (!__DEV__) return;
  console.log(label, payload);
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

function resolveModernDirectoryValue(candidate) {
  if (!candidate) return "";
  if (typeof candidate === "string") return candidate;
  if (typeof candidate?.uri === "string") return candidate.uri;
  return "";
}

function getFileSystemMode() {
  const modernPaths = FileSystem?.Paths || {};
  const modernCacheDirectory =
    resolveModernDirectoryValue(modernPaths?.cache) ||
    resolveModernDirectoryValue(FileSystem?.cacheDirectory);
  const modernDocumentDirectory =
    resolveModernDirectoryValue(modernPaths?.document) ||
    resolveModernDirectoryValue(FileSystem?.documentDirectory);
  const legacyCacheDirectory = String(LegacyFileSystem?.cacheDirectory || "");
  const legacyDocumentDirectory = String(LegacyFileSystem?.documentDirectory || "");

  let selectedMode = "fallback";
  if (
    typeof LegacyFileSystem?.downloadAsync === "function" &&
    (legacyCacheDirectory || legacyDocumentDirectory)
  ) {
    selectedMode = "legacy";
  } else if (modernCacheDirectory || modernDocumentDirectory) {
    selectedMode = "modern";
  }

  logPdfDiagnostic("[PDF][fs-api]", {
    hasModernPathsCache: Boolean(modernCacheDirectory),
    hasModernPathsDocument: Boolean(modernDocumentDirectory),
    hasLegacyCacheDirectory: Boolean(legacyCacheDirectory),
    hasLegacyDocumentDirectory: Boolean(legacyDocumentDirectory),
    selectedMode,
  });

  return {
    selectedMode,
    modernCacheDirectory,
    modernDocumentDirectory,
    legacyCacheDirectory,
    legacyDocumentDirectory,
  };
}

async function getPdfDownloadDirectory() {
  const fsMode = getFileSystemMode();
  const baseDirectory =
    fsMode.selectedMode === "legacy"
      ? fsMode.legacyCacheDirectory || fsMode.legacyDocumentDirectory
      : fsMode.modernCacheDirectory || fsMode.modernDocumentDirectory;

  if (!baseDirectory) {
    throw new PdfActionError(
      "Unable to access device storage for the PDF.",
      "NO_FILE_SYSTEM_DIRECTORY"
    );
  }

  const normalizedBaseDirectory = baseDirectory.endsWith("/")
    ? baseDirectory
    : `${baseDirectory}/`;
  const selectedDirectory = `${normalizedBaseDirectory}fleetx-pdfs/`;

  logPdfDiagnostic("[PDF][directory]", {
    hasCacheDirectory: Boolean(fsMode.legacyCacheDirectory || fsMode.modernCacheDirectory),
    hasDocumentDirectory: Boolean(fsMode.legacyDocumentDirectory || fsMode.modernDocumentDirectory),
    selectedDirectory,
    selectedMode: fsMode.selectedMode,
  });

  const activeMakeDirectory =
    fsMode.selectedMode === "legacy"
      ? LegacyFileSystem?.makeDirectoryAsync
      : LegacyFileSystem?.makeDirectoryAsync || FileSystem?.makeDirectoryAsync;

  if (typeof activeMakeDirectory !== "function") {
    throw new PdfActionError(
      "Unable to access device storage for the PDF.",
      "NO_FILE_SYSTEM_DIRECTORY"
    );
  }

  await activeMakeDirectory(selectedDirectory, { intermediates: true });
  return {
    selectedDirectory,
    selectedMode: fsMode.selectedMode,
  };
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

function isJsonContentType(contentType) {
  return String(contentType || "").toLowerCase().includes("application/json");
}

function parseJsonSafely(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractBackendMessage(payload) {
  if (!payload) return "";

  if (typeof payload === "string") {
    const parsed = parseJsonSafely(payload);
    if (parsed && parsed !== payload) {
      return extractBackendMessage(parsed);
    }

    const trimmed = payload.trim();
    return trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") ? "" : trimmed;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = extractBackendMessage(item);
      if (message) return message;
    }
    return "";
  }

  if (typeof payload === "object") {
    const candidates = [
      payload.message,
      payload.error,
      payload.detail,
      payload.reason,
      payload.title,
      payload.description,
      payload?.data?.message,
      payload?.data?.error,
      payload?.data?.detail,
      payload?.response?.data?.message,
    ];

    for (const candidate of candidates) {
      const message = extractBackendMessage(candidate);
      if (message) return message;
    }

    if (payload.errors) {
      const errorMessage = extractBackendMessage(payload.errors);
      if (errorMessage) return errorMessage;
    }
  }

  return "";
}

function decodeBytesToText(bytes) {
  if (!bytes?.length) return "";

  if (typeof TextDecoder === "function") {
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return "";
    }
  }

  let value = "";
  for (let index = 0; index < bytes.length; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }

  return value;
}

function isPdfSignature(bytes) {
  if (!bytes || bytes.length < 5) return false;

  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function isContractNotAcceptedMessage(message) {
  return /rental contract is not accepted yet|contract is not accepted yet/i.test(
    String(message || "")
  );
}

async function inspectPdfResponse({ resolvedUrl, headers, type }) {
  let response;

  try {
    response = await fetch(resolvedUrl, {
      method: "GET",
      headers,
    });
  } catch (error) {
    logPdfDiagnostic("[PDF][error]", {
      type,
      code: "NETWORK_ERROR",
      status: null,
      message: error?.message || "Unable to fetch document",
    });
    throw new PdfActionError(
      "Unable to download the PDF. Please check your connection and try again.",
      "NETWORK_ERROR",
      { type }
    );
  }

  const status = Number(response?.status || 0);
  const contentType = String(response?.headers?.get?.("content-type") || "");
  let isPdf = isLikelyPdfContentType(contentType);
  const isJson = isJsonContentType(contentType);
  let backendMessage = "";

  if (!isPdf || isJson || !response.ok) {
    try {
      const bodyBytes = new Uint8Array(await response.arrayBuffer());
      isPdf = isPdf || isPdfSignature(bodyBytes);

      if (!isPdf || isJson || !response.ok) {
        const bodyText = decodeBytesToText(bodyBytes);
        const parsedBody = parseJsonSafely(bodyText);
        backendMessage = extractBackendMessage(parsedBody || bodyText);
      }
    } catch {
      backendMessage = "";
    }
  }

  logPdfDiagnostic("[PDF][download:response]", {
    type,
    status,
    contentType,
    isPdf,
    isJson,
    backendMessage,
  });

  if (status === 401 || status === 403) {
    await clearClientSession();
    throw new PdfActionError(
      backendMessage || "Your session expired. Please log in again.",
      "AUTH_REQUIRED",
      { status, type, backendMessage }
    );
  }

  if (!response.ok) {
    let message = backendMessage || "Unable to open document. Please try again.";

    if (!backendMessage && status === 404) {
      message = "This document is not available yet.";
    } else if (!backendMessage && status >= 500) {
      message = "FleetX could not prepare this PDF right now. Please try again later.";
    }

    const errorCode =
      type === "contract" && isContractNotAcceptedMessage(message)
        ? "CONTRACT_NOT_ACCEPTED"
        : "DOWNLOAD_FAILED";

    throw new PdfActionError(message, errorCode, {
      status,
      type,
      backendMessage,
    });
  }

  if (isJson) {
    const errorCode =
      type === "contract" && isContractNotAcceptedMessage(backendMessage)
        ? "CONTRACT_NOT_ACCEPTED"
        : "NON_PDF_RESPONSE";

    throw new PdfActionError(
      backendMessage || "The server returned a non-PDF response.",
      errorCode,
      { status, type, backendMessage }
    );
  }

  if (!isPdf) {
    throw new PdfActionError(
      backendMessage || "The server returned a non-PDF response.",
      "INVALID_CONTENT_TYPE",
      { status, type, backendMessage }
    );
  }

  return {
    status,
    contentType,
    isPdf,
    isJson,
    backendMessage,
  };
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
      Accept: "application/pdf, application/json",
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
  const getInfoAsync =
    LegacyFileSystem?.getInfoAsync || FileSystem?.getInfoAsync;
  const info = await getInfoAsync(uri, { size: true });
  const contentType = normalizeHeaderValue(headers, "content-type");

  logPdfDiagnostic("[PDF][file]", {
    uri,
    exists: info.exists,
    size: info.size,
    contentType,
  });

  if (!info.exists || !info.size) {
    throw new PdfActionError(
      "Unable to open document. Please try again.",
      "EMPTY_FILE"
    );
  }

  if (contentType && !isLikelyPdfContentType(contentType)) {
    logPdfDiagnostic("[PDF][invalid-content-type]", {
      uri,
      contentType,
      size: info.size || 0,
    });
    throw new PdfActionError(
      "The server returned a non-PDF response.",
      "INVALID_CONTENT_TYPE"
    );
  }

  return info;
}

export async function downloadPdfToCache({
  source,
  fileName,
  title = "PDF",
  type = "pdf",
  bookingIdSource = "",
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
  const { selectedDirectory, selectedMode } = await getPdfDownloadDirectory();
  const targetUri = `${selectedDirectory}${targetFileName}`;

  logPdfDiagnostic("[PDF][download:start]", {
    type,
    endpoint: resolvedUrl,
    bookingIdSource,
    hasToken: tokenExists,
    urlBuilt: Boolean(resolvedUrl),
    selectedMode,
  });

  await inspectPdfResponse({
    resolvedUrl,
    headers,
    type,
  });

  let result;
  try {
    const downloadAsync =
      LegacyFileSystem?.downloadAsync || FileSystem?.downloadAsync;

    if (typeof downloadAsync !== "function") {
      throw new PdfActionError(
        "Unable to access device storage for the PDF.",
        "NO_FILE_SYSTEM_DIRECTORY"
      );
    }

    result = await downloadAsync(resolvedUrl, targetUri, { headers });
  } catch (error) {
    if (error instanceof PdfActionError) {
      throw error;
    }
    logPdfDiagnostic("[PDF][download:network-error]", {
      type,
      resolvedUrl,
      tokenExists,
      message: error?.message || String(error || ""),
    });
    throw new PdfActionError(
      "Unable to download the PDF. Please check your connection and try again.",
      "NETWORK_ERROR"
    );
  }

  if (result?.status === 401 || result?.status === 403) {
    await clearClientSession();
    throw new PdfActionError(
      "Your session expired. Please log in again.",
      "AUTH_REQUIRED",
      { status: result?.status, type }
    );
  }

  if (result?.status === 404) {
    throw new PdfActionError(
      "This document is not available yet.",
      "NOT_FOUND",
      { status: result?.status, type }
    );
  }

  if (result?.status >= 500) {
    throw new PdfActionError(
      "FleetX could not prepare this PDF right now. Please try again later.",
      "SERVER_ERROR",
      { status: result?.status, type }
    );
  }

  if (result?.status < 200 || result?.status >= 300) {
    throw new PdfActionError(
      "Unable to open document. Please try again.",
      "DOWNLOAD_FAILED",
      { status: result?.status, type }
    );
  }

  if (!targetFileName.toLowerCase().endsWith(".pdf")) {
    throw new PdfActionError(
      "Unable to open document. Please try again.",
      "INVALID_FILENAME",
      { type }
    );
  }

  await validateDownloadedPdf(result);

  const getInfoAsync =
    LegacyFileSystem?.getInfoAsync || FileSystem?.getInfoAsync;
  const fileInfo = await getInfoAsync(result.uri, { size: true });

  logPdfDiagnostic("[PDF][download:success]", {
    type,
    mode: selectedMode,
    fileUriExists: true,
    fileSize: fileInfo?.size || 0,
  });

  return {
    localUri: result.uri,
    resolvedUrl,
    fileName: targetFileName,
    selectedMode,
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

  const canOpenLocalFile = await Linking.canOpenURL(localUri);
  if (canOpenLocalFile) {
    await Linking.openURL(localUri);
    return;
  }

  throw new PdfActionError(
    "PDF sharing is not available on this device.",
    "SHARING_UNAVAILABLE"
  );
}

export async function openPdf(options) {
  try {
    const { localUri } = await downloadPdfToCache(options);
    await shareLocalPdf(localUri, "Open PDF");
    return localUri;
  } catch (error) {
    const { tokenExists } = await getAuthHeaders();
    const resolvedUrl = resolvePdfUrl(options?.source);

    if (error?.code === "NO_FILE_SYSTEM_DIRECTORY") {
      if (resolvedUrl && !tokenExists) {
        logPdfDiagnostic("[PDF][fallback]", {
          reason: error.code,
          usedLinking: true,
        });
        await Linking.openURL(resolvedUrl);
        return resolvedUrl;
      }

      logPdfDiagnostic("[PDF][fallback]", {
        reason: error?.code || "unknown",
        usedLinking: false,
      });
      throw new PdfActionError(
        "PDF download requires secure access. Please try again or open it from the web portal.",
        "SECURE_ACCESS_REQUIRED",
        { type: options?.type }
      );
    }

    throw error;
  }
}

export async function downloadAndSharePdf(options) {
  return openPdf(options);
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
      : fallbackMessage || "Unable to open document. Please try again.";

  logPdfDiagnostic("[PDF][error]", {
    type: error?.type || null,
    code: error?.code || null,
    status: error?.status || null,
    message,
  });

  Alert.alert("PDF Error", message);
}

export { PdfActionError, TOKEN_KEYS };

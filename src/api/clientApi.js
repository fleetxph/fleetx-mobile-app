import api, { BASE_URL } from "./api";

const ROUTE_VALIDATION_TIMEOUT_MS = 7000;

export async function loginClient(payload) {
  const url = `${BASE_URL}/client/login`;

  if (__DEV__) {
    console.log("[AuthAPI][login:start]", {
      url,
      method: "POST",
      hasEmail: Boolean(payload?.email || payload?.login),
      hasPassword: Boolean(payload?.password),
    });
  }

  try {
    const response = await api.post("/client/login", payload);
    return response.data;
  } catch (error) {
    if (__DEV__) {
      console.log("[AuthAPI][login:error]", {
        url,
        reachedResponse: Boolean(error?.response),
        status: error?.response?.status || null,
        code: error?.code || null,
        message: error?.message || "Unknown error",
        responseData: error?.response?.data || null,
      });
    }

    throw error;
  }
}

export async function registerClient(payload) {
  const response = await api.post("/client/register", payload);
  return response.data;
}

export async function requestClientOtp(payload) {
  const response = await api.post("/client/request-otp", payload);
  return response.data;
}

export async function verifyClientOtp(payload) {
  const response = await api.post("/client/verify-otp", payload);
  return response.data;
}

export async function requestPasswordResetCode(payload) {
  const response = await api.post("/client/forgot-password/request-code", payload);
  return response.data;
}

export async function verifyPasswordResetCode(payload) {
  const response = await api.post("/client/forgot-password/verify-code", payload);
  return response.data;
}

export async function resetPassword(payload) {
  const response = await api.post("/client/forgot-password/reset", payload);
  return response.data;
}

export async function changeClientPassword(payload) {
  const response = await api.post("/client/change-password", payload);
  return response.data;
}

export async function getClientProfile() {
  const response = await api.get("/client/profile");
  return response.data;
}

export async function updateClientProfile(payload) {
  const response = await api.patch("/client/profile", payload);
  return response.data;
}

export async function updateClientProfilePhoto(payload) {
  const response = await api.patch("/client/profile/photo", payload);
  return response.data;
}

export async function getVehicles(params = {}) {
  const requestParams = {
    page: 1,
    limit: 1000,
    ...params,
  };
  const query = Object.fromEntries(
    Object.entries(requestParams).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      return String(value).trim() !== "" && String(value).trim().toLowerCase() !== "all";
    })
  );

  const response = await api.get("/public/vehicles", { params: query });
  return response.data;
}

export async function getVehicleById(vehicleId) {
  const response = await api.get(`/public/vehicles/${vehicleId}`);
  return response.data;
}

export async function getVehicleBookings(vehicleId) {
  const response = await api.get(`/public/bookings/vehicle/${vehicleId}`);
  return response.data;
}

export async function getPublicPaymentMethods() {
  const response = await api.get("/public/payment-methods");
  return response.data;
}

export async function createBooking(payload) {
  const response = await api.post("/client/bookings", payload);
  return response.data;
}

export async function estimateRouteMinimumDuration(payload) {
  try {
    const response = await api.post("/client/bookings/route-minimum-duration", payload, {
      timeout: ROUTE_VALIDATION_TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    const normalizedMessage = String(error?.message || "").toLowerCase();
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      normalizedMessage.includes("timeout") ||
      normalizedMessage.includes("timed out");

    error.isRouteValidationTimeout = isTimeout;
    throw error;
  }
}

export async function saveClientBookingDraft(payload) {
  const response = await api.post("/client/bookings/draft", payload);
  return response.data;
}

export async function updateClientBookingDraft(bookingId, payload) {
  const response = await api.patch(`/client/bookings/${bookingId}`, payload);
  return response.data;
}

export async function resumeClientBooking(bookingId) {
  const response = await api.get(`/client/bookings/${bookingId}/resume`);
  return response.data;
}

export async function submitClientBookingDraft(bookingId, payload = {}) {
  const response = await api.post(`/client/bookings/${bookingId}/submit`, payload);
  return response.data;
}

export async function cancelClientBooking(bookingId, payload = {}) {
  const response = await api.patch(`/client/bookings/${bookingId}/cancel`, payload);
  return response.data;
}

export async function getClientBookings() {
  const response = await api.get("/client/bookings");
  return response.data;
}

export async function getVerificationStatus() {
  const response = await api.get("/client/verification/status", {
    params: { t: Date.now() },
    headers: { "Cache-Control": "no-cache" },
  });
  return response.data;
}

export async function submitVerification(payload) {
  const response = await api.post("/client/verification/submit", payload);
  return response.data;
}

export async function removeVerificationDocument(side) {
  const response = await api.patch("/client/verification/document/remove", { side });
  return response.data;
}

export async function getNotifications(limit = 20) {
  const response = await api.get("/notifications", { params: { limit } });
  return response.data;
}

export async function markNotificationRead(notificationId) {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch("/notifications/read-all");
  return response.data;
}

export async function clearNotifications() {
  const response = await api.delete("/notifications/clear");
  return response.data;
}

export async function submitPaymentProof(bookingId, payload) {
  const response = await api.post(`/client/bookings/${bookingId}/payment-proof`, payload);
  return response.data;
}

export async function getAdditionalInvoice(bookingId, options = {}) {
  const response = await api.get(`/client/bookings/${bookingId}/additional-invoice`);
  return options?.rawResponse ? response : response.data;
}

export function getAdditionalInvoicePdf(bookingId) {
  return `${BASE_URL}/client/bookings/${bookingId}/additional-invoice/pdf`;
}

export async function uploadAdditionalPaymentProof(bookingId, payload) {
  const response = await api.post(`/client/bookings/${bookingId}/additional-payment-proof`, payload);
  return response.data;
}

export async function getBookingContract(bookingId, options = {}) {
  const response = await api.get(`/client/bookings/${bookingId}/contract`);
  return options?.rawResponse ? response : response.data;
}

export async function getContractTemplate(options = {}) {
  const response = await api.get("/settings/contract-template");
  return options?.rawResponse ? response : response.data;
}

export async function acceptBookingContract(bookingId, payload = {}) {
  const response = await api.post(`/client/bookings/${bookingId}/contract/accept`, payload);
  return response.data;
}

export function getClientInvoiceUrl(bookingId, pdf = false) {
  return `${BASE_URL}/client/bookings/${bookingId}/invoice${pdf ? "/pdf" : ""}`;
}

export function getClientReceiptUrl(bookingId, pdf = false) {
  return `${BASE_URL}/client/bookings/${bookingId}/receipt${pdf ? "/pdf" : ""}`;
}

export function getBookingContractPdfUrl(bookingId) {
  return `${BASE_URL}/client/bookings/${bookingId}/contract/pdf`;
}

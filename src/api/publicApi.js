import axios from "axios";

const GOOGLE_MAPS_API_KEY = String(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
).trim();

const GOOGLE_PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place";
const GOOGLE_GEOCODE_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_OK_STATUSES = new Set(["OK"]);
const GOOGLE_EMPTY_STATUSES = new Set(["ZERO_RESULTS"]);

function ensureGoogleApiKey() {
  if (!GOOGLE_MAPS_API_KEY) {
    const error = new Error("Google Maps API key is not configured for the mobile app.");
    error.code = "GOOGLE_MAPS_KEY_MISSING";
    throw error;
  }
}

function createGoogleApiError(status, message) {
  const error = new Error(message || "Google location service request failed.");
  error.code = status || "GOOGLE_API_ERROR";
  return error;
}

function normalizeGoogleStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function assertGoogleStatus(status, errorMessage, { allowEmpty = false } = {}) {
  const normalizedStatus = normalizeGoogleStatus(status);

  if (GOOGLE_OK_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }

  if (allowEmpty && GOOGLE_EMPTY_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }

  throw createGoogleApiError(
    normalizedStatus || "GOOGLE_API_ERROR",
    errorMessage || `Google location service returned ${normalizedStatus || "an error"}.`
  );
}

function normalizeCoordinates(value = {}) {
  const lat = Number(value?.lat ?? value?.latitude);
  const lng = Number(value?.lng ?? value?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, latitude: lat, longitude: lng };
}

function normalizePrediction(prediction = {}) {
  const description = String(prediction.description || "").trim();
  const mainText = String(
    prediction.structured_formatting?.main_text || prediction.name || description
  ).trim();
  const secondaryText = String(prediction.structured_formatting?.secondary_text || "").trim();

  return {
    id: String(prediction.place_id || prediction.placeId || "").trim() || description || mainText,
    label: description || [mainText, secondaryText].filter(Boolean).join(", "),
    placeId: String(prediction.place_id || prediction.placeId || "").trim(),
    description,
    name: mainText,
    secondaryText,
    formattedAddress: description || [mainText, secondaryText].filter(Boolean).join(", "),
    latitude: null,
    longitude: null,
    raw: prediction,
  };
}

function normalizePlaceDetails(place = {}) {
  const coords = normalizeCoordinates(place?.geometry?.location || place?.coords || place);
  const formattedAddress = String(
    place.formatted_address || place.formattedAddress || place.description || place.name || ""
  ).trim();

  return {
    id: String(place.place_id || place.placeId || "").trim() || formattedAddress,
    label: formattedAddress || String(place.name || "").trim(),
    placeId: String(place.place_id || place.placeId || "").trim(),
    name: String(place.name || "").trim(),
    description: formattedAddress,
    formattedAddress,
    coords,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    address: formattedAddress,
    raw: place,
  };
}

export function hasGooglePlacesApiKey() {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export async function searchPlaces(query) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return { suggestions: [] };

  ensureGoogleApiKey();

  const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/autocomplete/json`, {
    timeout: 15000,
    params: {
      input: cleanQuery,
      key: GOOGLE_MAPS_API_KEY,
      components: "country:ph",
      language: "en",
      region: "ph",
    },
  });

  const status = normalizeGoogleStatus(response?.data?.status);
  if (GOOGLE_EMPTY_STATUSES.has(status)) {
    return { suggestions: [], status };
  }

  assertGoogleStatus(status, response?.data?.error_message, { allowEmpty: true });

  const predictions = Array.isArray(response?.data?.predictions)
    ? response.data.predictions
    : [];

  return {
    suggestions: predictions.map(normalizePrediction).filter((item) => item.description || item.name),
    status,
  };
}

export async function getPlaceDetails(placeId) {
  const cleanPlaceId = String(placeId || "").trim();
  if (!cleanPlaceId) return null;

  ensureGoogleApiKey();

  const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/details/json`, {
    timeout: 15000,
    params: {
      place_id: cleanPlaceId,
      fields: "formatted_address,geometry,name,place_id",
      key: GOOGLE_MAPS_API_KEY,
      language: "en",
      region: "ph",
    },
  });

  assertGoogleStatus(response?.data?.status, response?.data?.error_message);
  const place = response?.data?.result;
  return place ? normalizePlaceDetails(place) : null;
}

export async function geocodeAddress(address) {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress) return null;

  ensureGoogleApiKey();

  const response = await axios.get(GOOGLE_GEOCODE_BASE_URL, {
    timeout: 15000,
    params: {
      address: cleanAddress,
      key: GOOGLE_MAPS_API_KEY,
      components: "country:PH",
      language: "en",
      region: "ph",
    },
  });

  const status = normalizeGoogleStatus(response?.data?.status);
  if (GOOGLE_EMPTY_STATUSES.has(status)) return null;
  assertGoogleStatus(status, response?.data?.error_message, { allowEmpty: true });

  const result = Array.isArray(response?.data?.results) ? response.data.results[0] : null;
  if (!result) return null;

  const normalized = normalizePlaceDetails({
    ...result,
    description: result.formatted_address,
  });

  return {
    ...normalized,
    placeId: normalized.placeId || String(result.place_id || "").trim(),
  };
}

export async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  ensureGoogleApiKey();

  const response = await axios.get(GOOGLE_GEOCODE_BASE_URL, {
    timeout: 15000,
    params: {
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_API_KEY,
      language: "en",
      region: "ph",
    },
  });

  const status = normalizeGoogleStatus(response?.data?.status);
  if (GOOGLE_EMPTY_STATUSES.has(status)) return null;
  assertGoogleStatus(status, response?.data?.error_message, { allowEmpty: true });

  const result = Array.isArray(response?.data?.results) ? response.data.results[0] : null;
  if (!result) return null;

  const normalized = normalizePlaceDetails({
    ...result,
    description: result.formatted_address,
  });

  return {
    ...normalized,
    placeId: normalized.placeId || String(result.place_id || "").trim(),
  };
}

import axios from "axios";

export const GOOGLE_PLACES_CONFIG_MESSAGE =
  "Google Places is not configured. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable suggestions and address lookup.";

const GOOGLE_ENV_CANDIDATES = [
  ["EXPO_PUBLIC_GOOGLE_MAPS_API_KEY", process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY],
  ["EXPO_PUBLIC_GOOGLE_PLACES_API_KEY", process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY],
  ["GOOGLE_MAPS_API_KEY", process.env.GOOGLE_MAPS_API_KEY],
  ["GOOGLE_PLACES_API_KEY", process.env.GOOGLE_PLACES_API_KEY],
  ["REACT_APP_GOOGLE_MAPS_API_KEY", process.env.REACT_APP_GOOGLE_MAPS_API_KEY],
  ["REACT_APP_GOOGLE_PLACES_API_KEY", process.env.REACT_APP_GOOGLE_PLACES_API_KEY],
  ["VITE_GOOGLE_MAPS_API_KEY", process.env.VITE_GOOGLE_MAPS_API_KEY],
];

const resolvedGoogleEnvEntry =
  GOOGLE_ENV_CANDIDATES.find(([, value]) => String(value || "").trim()) || null;

const GOOGLE_API_KEY = String(resolvedGoogleEnvEntry?.[1] || "").trim();
const GOOGLE_API_ENV_NAME = resolvedGoogleEnvEntry?.[0] || "";

const GOOGLE_PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place";
const GOOGLE_GEOCODE_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_OK_STATUSES = new Set(["OK"]);
const GOOGLE_EMPTY_STATUSES = new Set(["ZERO_RESULTS"]);
let hasWarnedMissingGoogleKey = false;
let hasLoggedGoogleConfig = false;

function createGoogleApiError(status, message) {
  const error = new Error(message || "Google location service request failed.");
  error.code = status || "GOOGLE_API_ERROR";
  return error;
}

function getKeyPreview(key) {
  const value = String(key || "").trim();
  if (!value) return "";
  if (value.length <= 12) return `${value.slice(0, 8)}...`;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function logGoogleConfig() {
  if (!__DEV__ || hasLoggedGoogleConfig) return;
  hasLoggedGoogleConfig = true;
  console.log("[GooglePlaces][config]", {
    hasKey: Boolean(GOOGLE_API_KEY),
    keyPreview: getKeyPreview(GOOGLE_API_KEY),
    usedEnvName: GOOGLE_API_ENV_NAME,
  });
}

function logGoogleNetworkError(error) {
  if (!__DEV__) return;
  console.log("[GooglePlaces][network-error]", {
    type: error?.code || "NETWORK_ERROR",
    message: error?.message || "Unknown network error",
    name: error?.name || "Error",
  });
}

function normalizeGoogleStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function ensureGoogleApiKey() {
  logGoogleConfig();

  if (GOOGLE_API_KEY) return GOOGLE_API_KEY;

  if (__DEV__ && !hasWarnedMissingGoogleKey) {
    hasWarnedMissingGoogleKey = true;
    console.log(`[Location] ${GOOGLE_PLACES_CONFIG_MESSAGE}`);
  }

  throw createGoogleApiError("GOOGLE_MAPS_KEY_MISSING", GOOGLE_PLACES_CONFIG_MESSAGE);
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
  const latitude = Number(value?.lat ?? value?.latitude);
  const longitude = Number(value?.lng ?? value?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    lat: latitude,
    lng: longitude,
    latitude,
    longitude,
  };
}

function normalizePrediction(prediction = {}) {
  return {
    description: String(prediction.description || "").trim(),
    place_id: String(prediction.place_id || prediction.placeId || "").trim(),
    structured_formatting: prediction.structured_formatting || {},
    raw: prediction,
  };
}

function normalizePlaceDetails(result = {}) {
  const coords = normalizeCoordinates(result?.geometry?.location || result);
  const formattedAddress = String(
    result.formatted_address || result.formattedAddress || result.description || result.name || ""
  ).trim();

  return {
    formattedAddress,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    placeId: String(result.place_id || result.placeId || "").trim(),
    raw: result,
  };
}

function normalizeGeocodeResult(result = {}) {
  const normalized = normalizePlaceDetails(result);

  return {
    ...normalized,
    placeId: normalized.placeId || String(result.place_id || "").trim(),
  };
}

export function resolveGoogleMapsApiKey() {
  logGoogleConfig();
  return GOOGLE_API_KEY;
}

export function hasGoogleMapsApiKey() {
  logGoogleConfig();
  return Boolean(GOOGLE_API_KEY);
}

export async function getPlacesPredictions(input) {
  const query = String(input || "").trim();
  if (query.length < 2) return [];

  const apiKey = ensureGoogleApiKey();
  if (__DEV__) {
    console.log("[GooglePlaces][autocomplete:start]", { input: query });
  }

  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/autocomplete/json`, {
      timeout: 15000,
      params: {
        input: query,
        key: apiKey,
        components: "country:ph",
        language: "en",
      },
    });

    const status = normalizeGoogleStatus(response?.data?.status);
    const predictions = Array.isArray(response?.data?.predictions)
      ? response.data.predictions
      : [];

    if (__DEV__) {
      console.log("[GooglePlaces][autocomplete:response]", {
        httpStatus: response?.status || null,
        googleStatus: status || "",
        errorMessage: response?.data?.error_message || "",
        predictionCount: predictions.length,
      });
    }

    if (GOOGLE_EMPTY_STATUSES.has(status)) {
      return [];
    }

    assertGoogleStatus(status, response?.data?.error_message, { allowEmpty: true });

    return predictions.map(normalizePrediction).filter((item) => item.description || item.place_id);
  } catch (error) {
    if (!error?.response) {
      logGoogleNetworkError(error);
    }
    throw error;
  }
}

export async function getGooglePlaceDetails(placeId) {
  const cleanPlaceId = String(placeId || "").trim();
  if (!cleanPlaceId) return null;

  const apiKey = ensureGoogleApiKey();
  if (__DEV__) {
    console.log("[GooglePlaces][details:start]", { placeId: cleanPlaceId });
  }

  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/details/json`, {
      timeout: 15000,
      params: {
        place_id: cleanPlaceId,
        fields: "formatted_address,geometry,name",
        key: apiKey,
        language: "en",
      },
    });

    const status = normalizeGoogleStatus(response?.data?.status);
    const result = response?.data?.result || null;

    if (__DEV__) {
      console.log("[GooglePlaces][details:response]", {
        httpStatus: response?.status || null,
        googleStatus: status || "",
        errorMessage: response?.data?.error_message || "",
        hasGeometry: Boolean(result?.geometry?.location),
        formattedAddress: result?.formatted_address || "",
      });
    }

    assertGoogleStatus(status, response?.data?.error_message);
    return result ? normalizePlaceDetails(result) : null;
  } catch (error) {
    if (!error?.response) {
      logGoogleNetworkError(error);
    }
    throw error;
  }
}

export async function geocodeGoogleAddress(address) {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress) return null;

  const apiKey = ensureGoogleApiKey();
  const response = await axios.get(GOOGLE_GEOCODE_BASE_URL, {
    timeout: 15000,
    params: {
      address: cleanAddress,
      key: apiKey,
      components: "country:PH",
      language: "en",
      region: "ph",
    },
  });

  const status = normalizeGoogleStatus(response?.data?.status);
  if (GOOGLE_EMPTY_STATUSES.has(status)) {
    return null;
  }

  assertGoogleStatus(status, response?.data?.error_message, { allowEmpty: true });
  const result = Array.isArray(response?.data?.results) ? response.data.results[0] : null;
  return result ? normalizeGeocodeResult(result) : null;
}

export async function reverseGeocodeGoogleLocation(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const apiKey = ensureGoogleApiKey();
  if (__DEV__) {
    console.log("[GooglePlaces][reverse:start]", {
      latitude: lat,
      longitude: lng,
    });
  }

  try {
    const response = await axios.get(GOOGLE_GEOCODE_BASE_URL, {
      timeout: 15000,
      params: {
        latlng: `${lat},${lng}`,
        key: apiKey,
        language: "en",
      },
    });

    const status = normalizeGoogleStatus(response?.data?.status);
    const results = Array.isArray(response?.data?.results) ? response.data.results : [];

    if (__DEV__) {
      console.log("[GooglePlaces][reverse:response]", {
        httpStatus: response?.status || null,
        googleStatus: status || "",
        errorMessage: response?.data?.error_message || "",
        resultCount: results.length,
        firstAddress: results[0]?.formatted_address || "",
      });
    }

    if (GOOGLE_EMPTY_STATUSES.has(status)) {
      return null;
    }

    assertGoogleStatus(status, response?.data?.error_message, { allowEmpty: true });
    return results[0] ? normalizeGeocodeResult(results[0]) : null;
  } catch (error) {
    if (!error?.response) {
      logGoogleNetworkError(error);
    }
    throw error;
  }
}

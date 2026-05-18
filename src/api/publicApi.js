import api from "./api";
import {
  geocodeGoogleAddress,
  getGooglePlaceDetails,
  getPlacesPredictions,
  GOOGLE_PLACES_CONFIG_MESSAGE,
  hasGoogleMapsApiKey,
  resolveGoogleMapsApiKey,
  reverseGeocodeGoogleLocation,
} from "../services/googlePlaces";

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
    raw: prediction.raw || prediction,
  };
}

function normalizePlaceDetails(place = {}) {
  return {
    id: String(place.placeId || place.place_id || place.formattedAddress || "").trim(),
    label: String(place.formattedAddress || "").trim(),
    placeId: String(place.placeId || place.place_id || "").trim(),
    name: String(place.formattedAddress || "").trim(),
    description: String(place.formattedAddress || "").trim(),
    formattedAddress: String(place.formattedAddress || "").trim(),
    coords:
      place?.latitude != null && place?.longitude != null
        ? {
            lat: Number(place.latitude),
            lng: Number(place.longitude),
            latitude: Number(place.latitude),
            longitude: Number(place.longitude),
          }
        : null,
    lat: place?.latitude != null ? Number(place.latitude) : null,
    lng: place?.longitude != null ? Number(place.longitude) : null,
    latitude: place?.latitude != null ? Number(place.latitude) : null,
    longitude: place?.longitude != null ? Number(place.longitude) : null,
    address: String(place.formattedAddress || "").trim(),
    raw: place.raw || place,
  };
}

export { GOOGLE_PLACES_CONFIG_MESSAGE, resolveGoogleMapsApiKey };

export async function getActiveRestrictedAreas() {
  const response = await api.get("/restricted-areas/public");
  return response.data;
}

export function hasGooglePlacesApiKey() {
  return hasGoogleMapsApiKey();
}

export async function searchPlaces(query) {
  const suggestions = await getPlacesPredictions(query);
  return {
    suggestions: suggestions.map(normalizePrediction),
    status: suggestions.length ? "OK" : "ZERO_RESULTS",
  };
}

export async function getPlaceDetails(placeId) {
  const details = await getGooglePlaceDetails(placeId);
  return details ? normalizePlaceDetails(details) : null;
}

export async function geocodeAddress(address) {
  const result = await geocodeGoogleAddress(address);
  return result ? normalizePlaceDetails(result) : null;
}

export async function reverseGeocode(latitude, longitude) {
  const result = await reverseGeocodeGoogleLocation(latitude, longitude);
  return result ? normalizePlaceDetails(result) : null;
}

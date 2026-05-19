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
import { getVehicleImageUrl, resolveImageUrl } from "../utils/imageUrl";

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

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id) return normalizeId(value._id);
    if (value.id) return normalizeId(value.id);
    if (typeof value.toString === "function") {
      const text = value.toString();
      return text && text !== "[object Object]" ? text.trim() : "";
    }
  }
  return "";
}

function getVehicleName(vehicle = {}) {
  return (
    String(vehicle?.name || "").trim() ||
    `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim()
  );
}

function normalizePromoVehicle(vehicle = {}) {
  if (!vehicle || typeof vehicle !== "object") return null;

  const id = normalizeId(vehicle?._id || vehicle?.id || vehicle?.vehicleId);
  const imageUrl = getVehicleImageUrl(vehicle);
  const name = getVehicleName(vehicle);

  return {
    ...vehicle,
    _id: id || vehicle?._id,
    id: id || vehicle?.id,
    name,
    imageUrl: imageUrl || resolveImageUrl(vehicle?.imageUrl || vehicle?.image || ""),
  };
}

function getPromoDiscountLabel(campaign = {}, discountType, discountValue) {
  const explicitLabel = String(campaign?.discountLabel || "").trim();
  if (explicitLabel) return explicitLabel;

  if (discountType === "percentage" && discountValue > 0) {
    return `SAVE ${discountValue}%`;
  }
  if (discountType === "fixed" && discountValue > 0) {
    return `SAVE PHP ${Math.round(discountValue).toLocaleString()}`;
  }
  if (discountValue > 0) {
    return `SAVE ${discountValue}`;
  }

  return "";
}

function normalizePromoCampaign(campaign = {}) {
  const discountType = String(campaign?.discountType || campaign?.type || "none").trim().toLowerCase();
  const discountValue = Number(
    campaign?.discountValue ??
      campaign?.discount ??
      campaign?.discountPercent ??
      campaign?.value ??
      campaign?.amount ??
      0
  );
  const promoCode = String(
    campaign?.promoCode || campaign?.code || campaign?.couponCode || ""
  )
    .trim()
    .toUpperCase();
  const selectedVehicles = Array.isArray(campaign?.selectedVehicles)
    ? campaign.selectedVehicles
    : Array.isArray(campaign?.featuredVehicles)
    ? campaign.featuredVehicles
    : [];
  const selectedVehicle =
    campaign?.vehicle ||
    campaign?.featuredVehicle ||
    campaign?.selectedVehicle ||
    campaign?.promoVehicle ||
    selectedVehicles.find((item) => normalizeId(item));
  const normalizedVehicle = normalizePromoVehicle(selectedVehicle);
  const vehicleId =
    normalizeId(
      campaign?.vehicleId ||
        campaign?.featuredVehicleId ||
        campaign?.selectedVehicleId ||
        campaign?.promoVehicleId
    ) || normalizeId(normalizedVehicle);
  const resolvedImageUrl =
    resolveImageUrl(
      campaign?.imageUrl ||
        campaign?.bannerImage ||
        campaign?.vehicleImage ||
        campaign?.promoImage ||
        ""
    ) || getVehicleImageUrl(normalizedVehicle);
  const title = String(campaign?.title || campaign?.name || campaign?.campaignTitle || "").trim();
  const subtitle = String(
    campaign?.bannerText || campaign?.subtitle || campaign?.campaignType || "FLEETX PROMO"
  ).trim();
  const description = String(
    campaign?.description || campaign?.campaignDescription || campaign?.subtitle || campaign?.bannerText || ""
  ).trim();
  const startsAt = campaign?.startDate || campaign?.startsAt || campaign?.validFrom || null;
  const endsAt = campaign?.endDate || campaign?.endsAt || campaign?.validUntil || campaign?.expiresAt || null;
  const isActive =
    campaign?.isActive === true ||
    campaign?.active === true ||
    campaign?.enabled === true ||
    ["active", "published"].includes(String(campaign?.status || "").trim().toLowerCase());

  const discountLabel = getPromoDiscountLabel(campaign, discountType, discountValue);

  return {
    id: String(campaign?._id || campaign?.id || "").trim(),
    title,
    subtitle,
    description,
    promoCode,
    code: promoCode,
    discountLabel,
    discountValue,
    discountType,
    imageUrl: resolvedImageUrl,
    ctaLabel: String(campaign?.ctaText || campaign?.buttonText || "Plan My Trip").trim(),
    vehicleId,
    vehicle: normalizedVehicle,
    isActive,
    startsAt,
    endsAt,
    raw: campaign,
  };
}

function hasMeaningfulPromo(promo = {}) {
  return Boolean(
    promo?.title ||
      promo?.description ||
      promo?.promoCode ||
      promo?.discountLabel ||
      promo?.imageUrl ||
      promo?.vehicleId ||
      promo?.vehicle
  );
}

export async function getPublicVehicles(params = {}) {
  const response = await api.get("/public/vehicles", { params });
  return response.data;
}

export async function getPublicVehicleById(vehicleId) {
  if (!vehicleId) return null;
  const response = await api.get(`/public/vehicles/${vehicleId}`);
  return response?.data?.vehicle || response?.data || null;
}

async function resolvePromoVehicle(promo = {}) {
  if (!promo?.vehicleId) {
    return promo;
  }

  const currentVehicle = normalizePromoVehicle(promo.vehicle);
  const hasVehicleImage = Boolean(getVehicleImageUrl(currentVehicle));
  const hasVehicleName = Boolean(getVehicleName(currentVehicle));

  if (currentVehicle && hasVehicleImage && hasVehicleName) {
    return {
      ...promo,
      vehicle: currentVehicle,
      imageUrl: promo.imageUrl || getVehicleImageUrl(currentVehicle),
    };
  }

  try {
    const fetchedVehicle = normalizePromoVehicle(await getPublicVehicleById(promo.vehicleId));
    if (!fetchedVehicle) return promo;

    return {
      ...promo,
      vehicle: fetchedVehicle,
      imageUrl: promo.imageUrl || getVehicleImageUrl(fetchedVehicle),
    };
  } catch {
    return {
      ...promo,
      vehicle: currentVehicle,
      imageUrl: promo.imageUrl || getVehicleImageUrl(currentVehicle),
    };
  }
}

export async function getActiveRestrictedAreas() {
  const response = await api.get("/restricted-areas/public");
  return response.data;
}

export async function getPublicActiveCampaigns() {
  const response = await api.get("/public/campaigns/active");
  const campaigns = Array.isArray(response?.data?.campaigns) ? response.data.campaigns : [];
  return {
    campaigns: campaigns.map(normalizePromoCampaign),
  };
}

export async function getActivePromo() {
  const response = await getPublicActiveCampaigns();
  const promo = response?.campaigns?.[0] || null;
  if (!promo || !hasMeaningfulPromo(promo)) return null;
  return resolvePromoVehicle(promo);
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

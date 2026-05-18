import { combineDateAndTime } from "./dateValidation";

const RESTRICTED_KEYWORDS = [
  "palawan",
  "boracay",
  "cebu",
  "davao",
  "bohol",
  "mindanao",
  "visayas",
];

const VERY_FAR_KEYWORDS = ["bicol", "legazpi", "sorsogon", "naga", "albay"];
const FAR_KEYWORDS = ["baguio", "la union", "pangasinan", "ilocos"];
const MODERATE_KEYWORDS = ["tagaytay", "batangas", "subic", "clark"];
const NEAR_KEYWORDS = [
  "metro manila",
  "manila",
  "makati",
  "pasay",
  "paranaque",
  "parañaque",
  "quezon city",
  "qc",
  "muntinlupa",
  "taguig",
  "pasig",
  "mandaluyong",
  "marikina",
  "san juan",
  "las pinas",
  "las piñas",
  "navotas",
  "malabon",
  "valenzuela",
  "caloocan",
  "cavite",
  "laguna",
  "rizal",
  "bulacan",
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function includesAnyKeyword(value, keywords) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function calculateSelectedRentalDuration({
  startDate,
  startTime,
  endDate,
  endTime,
} = {}) {
  if (!startDate || !startTime || !endDate || !endTime) {
    return {
      isComplete: false,
      totalHours: 0,
      rentalDays: 0,
    };
  }

  const startDateTime = combineDateAndTime(startDate, startTime);
  const endDateTime = combineDateAndTime(endDate, endTime);

  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    return {
      isComplete: true,
      totalHours: 0,
      rentalDays: 0,
    };
  }

  const totalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
  const rentalDays = Math.max(1, Math.ceil(totalHours / 24));

  return {
    isComplete: true,
    totalHours,
    rentalDays,
  };
}

export function evaluateDestinationRules({ destination, coordinates } = {}) {
  const normalizedDestination = normalizeText(destination);

  const baseResult = {
    isAllowed: true,
    restrictionReason: "",
    distanceCategory: "unknown",
    minimumRentalDays: 1,
    warningMessage: "",
    estimatedTravelNote: "",
  };

  if (!normalizedDestination && !coordinates) {
    return baseResult;
  }

  if (includesAnyKeyword(normalizedDestination, RESTRICTED_KEYWORDS)) {
    return {
      ...baseResult,
      isAllowed: false,
      distanceCategory: "restricted",
      restrictionReason:
        "This destination may require special approval or is outside the current standard service coverage.",
      warningMessage:
        "This destination is outside the current standard service coverage. Please choose another destination or contact support.",
      estimatedTravelNote: "Special routing or approval may be required for this destination.",
    };
  }

  if (includesAnyKeyword(normalizedDestination, VERY_FAR_KEYWORDS)) {
    return {
      ...baseResult,
      distanceCategory: "very_far",
      minimumRentalDays: 2,
      warningMessage: "This destination may require at least 2 rental days due to travel distance.",
      estimatedTravelNote: "Very long-distance route. Plan a longer rental window for a safer itinerary.",
    };
  }

  if (includesAnyKeyword(normalizedDestination, FAR_KEYWORDS)) {
    return {
      ...baseResult,
      distanceCategory: "far",
      minimumRentalDays: 2,
      warningMessage: "This destination may require at least 2 rental days due to travel distance.",
      estimatedTravelNote: "Far route. Extra travel time may require a longer rental duration.",
    };
  }

  if (includesAnyKeyword(normalizedDestination, MODERATE_KEYWORDS)) {
    return {
      ...baseResult,
      distanceCategory: "moderate",
      minimumRentalDays: 1,
      estimatedTravelNote: "Moderate route. A 1-day trip is usually workable depending on schedule.",
    };
  }

  if (includesAnyKeyword(normalizedDestination, NEAR_KEYWORDS)) {
    return {
      ...baseResult,
      distanceCategory: "near",
      minimumRentalDays: 1,
      estimatedTravelNote: "Near route. Your selected trip duration looks reasonable.",
    };
  }

  return {
    ...baseResult,
    estimatedTravelNote: "",
  };
}

export function getDestinationCategoryLabel(category) {
  switch (category) {
    case "near":
      return "Near route";
    case "moderate":
      return "Moderate route";
    case "far":
      return "Far route";
    case "very_far":
      return "Very far route";
    case "restricted":
      return "Restricted route";
    default:
      return "Unknown route";
  }
}

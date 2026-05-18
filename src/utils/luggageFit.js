function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

export function normalizeNonNegativeCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

export function normalizeLuggageDetails(input = {}) {
  const luggageBags = normalizeNonNegativeCount(
    input?.luggageBags ?? input?.luggageCount ?? input?.bags ?? input?.bagCount
  );

  return {
    luggageBags,
    luggageSize: String(input?.luggageSize || input?.luggage?.size || "").trim(),
    luggageWeightKg: normalizeOptionalNumber(
      input?.luggageWeightKg ?? input?.luggage?.weightKg ?? input?.weightKg
    ),
  };
}

export function formatLuggageSummary(input = {}) {
  const { luggageBags, luggageSize, luggageWeightKg } = normalizeLuggageDetails(input);

  if (!luggageBags && !luggageSize && luggageWeightKg === "") {
    return "None specified";
  }

  const parts = [];

  if (luggageBags) {
    parts.push(`${luggageBags} ${luggageBags === 1 ? "bag" : "bags"}`);
  }

  if (luggageSize) {
    parts.push(luggageSize);
  }

  if (luggageWeightKg !== "") {
    parts.push(`${luggageWeightKg} kg`);
  }

  return parts.join(" - ") || "None specified";
}

export function getHeavyLuggageWarning(input = {}) {
  const { luggageBags, luggageWeightKg } = normalizeLuggageDetails(input);
  const numericWeight = Number(luggageWeightKg);

  if (!luggageBags || !Number.isFinite(numericWeight)) {
    return "";
  }

  if (numericWeight >= 25 || (luggageBags >= 3 && numericWeight >= 18)) {
    return "Heavy luggage may affect vehicle recommendations. Please choose a vehicle with enough cargo space.";
  }

  return "";
}

function getVehicleCapacityNumber(vehicle, keys = []) {
  for (const key of keys) {
    const value = Number(vehicle?.[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return null;
}

export function getVehicleLuggageFit(vehicle = {}, tripData = {}) {
  const passengers = Number(tripData?.passengers || tripData?.numberOfPax || tripData?.pax || 0);
  const seats = getVehicleCapacityNumber(vehicle, ["seater", "seats", "seatingCapacity", "seatCapacity"]);
  const { luggageBags, luggageWeightKg } = normalizeLuggageDetails(tripData);
  const maxLuggageBags = getVehicleCapacityNumber(vehicle, [
    "maxLuggageBags",
    "luggageCapacity",
    "bagCapacity",
  ]);
  const cargoCapacity = getVehicleCapacityNumber(vehicle, [
    "cargoCapacity",
    "luggageLimit",
    "cargoLimitKg",
  ]);

  const fitsPassengers = !passengers || !seats || seats >= passengers;
  let passengerMessage = "Passenger fit unknown";

  if (passengers && seats) {
    passengerMessage = seats >= passengers ? "Fits passenger count" : "Passenger capacity may be tight";
  } else if (passengers) {
    passengerMessage = "Passenger capacity not fully listed";
  }

  let luggageMessage = "Luggage fit unknown";
  let luggageStatus = "unknown";

  if (!luggageBags && luggageWeightKg === "") {
    luggageMessage = "No luggage preference specified";
    luggageStatus = "none";
  } else if (maxLuggageBags && luggageBags) {
    luggageStatus = luggageBags <= maxLuggageBags ? "fit" : "tight";
    luggageMessage =
      luggageBags <= maxLuggageBags
        ? `Luggage fits bag capacity (${maxLuggageBags})`
        : `May be tight for ${luggageBags} bags`;
  } else if (cargoCapacity && luggageWeightKg !== "") {
    const numericWeight = Number(luggageWeightKg);
    luggageStatus = numericWeight <= cargoCapacity ? "fit" : "tight";
    luggageMessage =
      numericWeight <= cargoCapacity
        ? `Luggage fits cargo capacity (${cargoCapacity} kg)`
        : "May be tight for heavy luggage";
  } else if (luggageBags >= 3 || Number(luggageWeightKg) >= 20) {
    luggageStatus = "caution";
    luggageMessage = "May be tight for heavy luggage";
  }

  let recommendation = "Vehicle details look workable for your trip.";

  if (fitsPassengers && (luggageStatus === "fit" || luggageStatus === "none")) {
    recommendation = "Recommended for your passengers and luggage";
  } else if (!fitsPassengers) {
    recommendation = "Passenger count may exceed this vehicle's comfort range";
  } else if (luggageStatus === "tight" || luggageStatus === "caution") {
    recommendation = luggageMessage;
  }

  return {
    seats,
    maxLuggageBags,
    cargoCapacity,
    fitsPassengers,
    passengerMessage,
    luggageMessage,
    luggageStatus,
    recommendation,
  };
}

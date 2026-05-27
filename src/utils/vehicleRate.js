export function getVehicleDailyRate(vehicle = {}) {
  const candidates = [
    vehicle?.rate24Hr,
    vehicle?.twentyFourHourRate,
    vehicle?.baseRate24,
    vehicle?.dailyRate,
    vehicle?.pricePerDay,
    vehicle?.rentalRate,
    vehicle?.ratePerDay,
    vehicle?.baseRate,
    vehicle?.pricing?.daily,
    vehicle?.pricing?.day,
    vehicle?.pricing?.ratePerDay,
    vehicle?.rates?.daily,
    vehicle?.rates?.day,
    vehicle?.rates?.twentyFourHours,
    vehicle?.price,
    vehicle?.rate,
    vehicle?.rentalPrice,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return null;
}

export function formatCurrency(value, fallback = "Rate to be confirmed") {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return fallback;
  }

  return `PHP ${Math.round(amount).toLocaleString()}`;
}

export function formatVehicleDailyRateLabel(vehicle, fallback = "Rate to be confirmed") {
  const rate = getVehicleDailyRate(vehicle);
  return rate ? `${formatCurrency(rate)}/day` : fallback;
}

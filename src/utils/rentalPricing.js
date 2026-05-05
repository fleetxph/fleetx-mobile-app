const DRIVER_RATE_12_HR = 800;
const DRIVER_RATE_24_HR = 1500;
const DRIVER_EXTRA_HOUR_RATE = 150;

function parseDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatHours(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function resolveRates({ rate12Hr, rate24Hr, extraHourRate, dailyRate, vehicleDailyRate }) {
  const resolved24 = Number(rate24Hr || dailyRate || vehicleDailyRate || 0);
  const resolved12 = Number(rate12Hr || resolved24 || 0);
  const resolvedExtra = Number(extraHourRate || (resolved24 > 0 ? resolved24 / 24 : 0));

  return {
    rate12Hr: Number.isFinite(resolved12) ? resolved12 : 0,
    rate24Hr: Number.isFinite(resolved24) ? resolved24 : 0,
    extraHourRate: Number.isFinite(resolvedExtra) ? resolvedExtra : 0,
  };
}

function fullDaysLabel(count) {
  return `${count} full ${count === 1 ? "day" : "days"}`;
}

function calculateTierPricing({
  rate12Hr,
  rate24Hr,
  extraHourRate,
  pickupDateTime,
  returnDateTime,
  prefix = "",
}) {
  const pickup = parseDateTime(pickupDateTime);
  const returned = parseDateTime(returnDateTime);
  const rates = resolveRates({ rate12Hr, rate24Hr, extraHourRate });
  const empty = {
    totalHours: 0,
    billingDurationLabel: "Select valid rental schedule",
    charge: 0,
    rows: [],
    appliedCap: false,
    extensionType: "none",
    full24Blocks: 0,
    remainingHours: 0,
  };

  if (!pickup || !returned || returned <= pickup || rates.rate24Hr <= 0) {
    return empty;
  }

  const totalHours = (returned.getTime() - pickup.getTime()) / (1000 * 60 * 60);
  let charge = 0;
  let rows = [];
  let appliedCap = false;
  let extensionType = "none";
  let billingDurationLabel = "";

  if (totalHours <= 12) {
    charge = rates.rate12Hr;
    rows = [{ label: `${prefix}12-hour rate`.trim(), amount: rates.rate12Hr }];
    billingDurationLabel = "12-hour rate";
    extensionType = "twelve_hour_minimum";
  } else if (totalHours <= 24) {
    const extraHours = totalHours - 12;
    const extraAmount = rates.extraHourRate * extraHours;
    const computed = rates.rate12Hr + extraAmount;
    appliedCap = computed >= rates.rate24Hr;
    charge = Math.min(computed, rates.rate24Hr);
    extensionType = appliedCap ? "twenty_four_hour_cap" : "initial_extra_hours";
    billingDurationLabel = appliedCap
      ? "24-hour rate"
      : `12-hour rate + ${formatHours(extraHours)} extra ${extraHours === 1 ? "hour" : "hours"}`;
    rows = appliedCap
      ? [{ label: `${prefix}24-hour rate`.trim(), amount: rates.rate24Hr }]
      : [
          { label: `${prefix}12-hour rate`.trim(), amount: rates.rate12Hr },
          {
            label: `${prefix}Extra hours`.trim(),
            detail: `PHP ${Math.round(rates.extraHourRate).toLocaleString()} x ${formatHours(extraHours)}`,
            amount: extraAmount,
          },
        ];
  } else {
    const full24Blocks = Math.floor(totalHours / 24);
    const remainingHours = totalHours - full24Blocks * 24;
    const baseAmount = full24Blocks * rates.rate24Hr;
    rows = [
      {
        label:
          full24Blocks === 1
            ? `${prefix}24-hour rate`.trim()
            : `${prefix}${fullDaysLabel(full24Blocks)}`.trim(),
        detail:
          full24Blocks > 1
            ? `PHP ${Math.round(rates.rate24Hr).toLocaleString()} x ${full24Blocks}`
            : "",
        amount: baseAmount,
      },
    ];
    charge = baseAmount;
    billingDurationLabel = full24Blocks === 1 ? "24-hour rate" : fullDaysLabel(full24Blocks);

    if (remainingHours > 0 && remainingHours <= 6) {
      const extraAmount = rates.extraHourRate * remainingHours;
      charge += extraAmount;
      extensionType = "hourly_overtime";
      billingDurationLabel += ` + ${formatHours(remainingHours)} extra ${remainingHours === 1 ? "hour" : "hours"}`;
      rows.push({
        label: `${prefix}Extra hours`.trim(),
        detail: `PHP ${Math.round(rates.extraHourRate).toLocaleString()} x ${formatHours(remainingHours)}`,
        amount: extraAmount,
      });
    } else if (remainingHours > 6 && remainingHours <= 12) {
      charge += rates.rate12Hr;
      extensionType = "twelve_hour_extension";
      billingDurationLabel += " + 12-hour extension";
      rows.push({ label: `${prefix}12-hour extension`.trim(), amount: rates.rate12Hr });
    } else if (remainingHours > 12) {
      charge += rates.rate24Hr;
      appliedCap = true;
      extensionType = "full_day_extension";
      billingDurationLabel = fullDaysLabel(full24Blocks + 1);
      rows = [
        {
          label: fullDaysLabel(full24Blocks + 1),
          detail: `PHP ${Math.round(rates.rate24Hr).toLocaleString()} x ${full24Blocks + 1}`,
          amount: (full24Blocks + 1) * rates.rate24Hr,
        },
      ];
    }

    return {
      totalHours,
      billingDurationLabel,
      charge: roundMoney(charge),
      rows: rows.map((row) => ({ ...row, amount: roundMoney(row.amount) })),
      appliedCap,
      extensionType,
      full24Blocks,
      remainingHours,
    };
  }

  return {
    totalHours,
    billingDurationLabel,
    charge: roundMoney(charge),
    rows: rows.map((row) => ({ ...row, amount: roundMoney(row.amount) })),
    appliedCap,
    extensionType,
    full24Blocks: totalHours >= 24 ? Math.floor(totalHours / 24) : 0,
    remainingHours: totalHours >= 24 ? totalHours % 24 : totalHours,
  };
}

function isWithDriverRental(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized === "with_driver" ||
    normalized === "with-driver" ||
    normalized === "with driver"
  );
}

export function calculateVehiclePricing(args = {}) {
  const pricing = calculateTierPricing({
    ...resolveRates(args),
    pickupDateTime: args.pickupDateTime,
    returnDateTime: args.returnDateTime,
  });

  return {
    totalHours: pricing.totalHours,
    billingDurationLabel: pricing.billingDurationLabel,
    vehicleCharge: pricing.charge,
    vehicleRows: pricing.rows,
    appliedCap: pricing.appliedCap,
    extensionType: pricing.extensionType,
  };
}

export function calculateDriverPricing({
  driverRate12Hr = DRIVER_RATE_12_HR,
  driverRate24Hr = DRIVER_RATE_24_HR,
  driverExtraHourRate = DRIVER_EXTRA_HOUR_RATE,
  pickupDateTime,
  returnDateTime,
  rentalType,
  tripType,
  withDriver,
} = {}) {
  const hasDriver =
    Boolean(withDriver) ||
    isWithDriverRental(rentalType) ||
    isWithDriverRental(tripType);

  if (!hasDriver) {
    return {
      driverCharge: 0,
      driverRows: [],
      driverAppliedCap: false,
      driverExtensionType: "none",
    };
  }

  const pricing = calculateTierPricing({
    rate12Hr: driverRate12Hr,
    rate24Hr: driverRate24Hr,
    extraHourRate: driverExtraHourRate,
    pickupDateTime,
    returnDateTime,
    prefix: "Driver",
  });

  return {
    driverCharge: pricing.charge,
    driverRows: pricing.rows,
    driverAppliedCap: pricing.appliedCap,
    driverExtensionType: pricing.extensionType,
  };
}

export function calculateBookingPricing({
  vehicle = {},
  vehicleDailyRate,
  dailyRate,
  rate12Hr,
  rate24Hr,
  extraHourRate,
  driverRate12Hr = DRIVER_RATE_12_HR,
  driverRate24Hr = DRIVER_RATE_24_HR,
  driverExtraHourRate = DRIVER_EXTRA_HOUR_RATE,
  pickupDateTime,
  returnDateTime,
  rentalType,
  tripType,
  withDriver,
  paymentOption,
} = {}) {
  const safeVehicle = vehicle || {};
  const vehiclePricing = calculateVehiclePricing({
    rate12Hr: rate12Hr ?? safeVehicle.rate12Hr ?? safeVehicle.rate24Hr ?? safeVehicle.dailyRate ?? safeVehicle.price,
    rate24Hr: rate24Hr ?? safeVehicle.rate24Hr ?? safeVehicle.dailyRate ?? safeVehicle.price,
    extraHourRate:
      extraHourRate ??
      safeVehicle.extraHourRate ??
      (Number(safeVehicle.rate24Hr || safeVehicle.dailyRate || safeVehicle.price || 0) > 0
        ? Number(safeVehicle.rate24Hr || safeVehicle.dailyRate || safeVehicle.price || 0) / 24
        : 0),
    dailyRate: dailyRate ?? safeVehicle.dailyRate ?? safeVehicle.price,
    vehicleDailyRate,
    pickupDateTime,
    returnDateTime,
  });
  const driverPricing = calculateDriverPricing({
    driverRate12Hr,
    driverRate24Hr,
    driverExtraHourRate,
    pickupDateTime,
    returnDateTime,
    rentalType,
    tripType,
    withDriver,
  });
  const estimatedTotal = roundMoney(vehiclePricing.vehicleCharge + driverPricing.driverCharge);
  const amountDue =
    paymentOption === "full_payment"
      ? estimatedTotal
      : paymentOption === "down_payment_50"
      ? roundMoney(estimatedTotal * 0.5)
      : 0;

  return {
    totalHours: vehiclePricing.totalHours,
    billingDurationLabel: vehiclePricing.billingDurationLabel,
    billingLabel: vehiclePricing.billingDurationLabel,
    vehicleCharge: vehiclePricing.vehicleCharge,
    vehicleRows: vehiclePricing.vehicleRows,
    vehicleBaseAmount: vehiclePricing.vehicleRows[0]?.amount || 0,
    vehicleOvertimeAmount: roundMoney(
      Math.max(0, vehiclePricing.vehicleCharge - (vehiclePricing.vehicleRows[0]?.amount || 0))
    ),
    vehicleExtensionType: vehiclePricing.extensionType,
    vehicleTotal: vehiclePricing.vehicleCharge,
    vehicleAppliedCap: vehiclePricing.appliedCap,
    driverCharge: driverPricing.driverCharge,
    driverRows: driverPricing.driverRows,
    driverDailyFee: driverRate24Hr,
    driverBaseAmount: driverPricing.driverRows[0]?.amount || 0,
    driverOvertimeAmount: roundMoney(
      Math.max(0, driverPricing.driverCharge - (driverPricing.driverRows[0]?.amount || 0))
    ),
    driverExtensionType: driverPricing.driverExtensionType,
    driverTotal: driverPricing.driverCharge,
    estimatedTotal,
    subtotal: estimatedTotal,
    paymentOption: paymentOption || "",
    amountDue,
    remainingBalance: paymentOption ? roundMoney(Math.max(0, estimatedTotal - amountDue)) : 0,
  };
}

export function calculateRentalPricing(args) {
  return calculateBookingPricing(args);
}

export function buildLocalDateTime(date, time) {
  if (!date || !time) return null;
  return `${date}T${time}`;
}

export function formatRentalHours(hours) {
  const value = Math.round(Number(hours || 0) * 100) / 100;
  if (!Number.isFinite(value) || value <= 0) return "0 hours";
  const label = Number.isInteger(value) ? String(value) : String(value);
  return `${label} ${value === 1 ? "hour" : "hours"}`;
}

export function getVehicleRate12Hr(vehicle = {}) {
  return Number(vehicle.rate12Hr || vehicle.rate24Hr || vehicle.dailyRate || vehicle.price || 0);
}

export function getVehicleRate24Hr(vehicle = {}) {
  return Number(vehicle.rate24Hr || vehicle.dailyRate || vehicle.price || 0);
}

export function getVehicleExtraHourRate(vehicle = {}) {
  const rate24Hr = getVehicleRate24Hr(vehicle);
  return Number(vehicle.extraHourRate || (rate24Hr > 0 ? rate24Hr / 24 : 0));
}

import { normalizeDate } from "./dateValidation";

export function toMidnight(value) {
  return normalizeDate(value);
}

export function getDateKey(value) {
  const date = toMidnight(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value, days) {
  const date = toMidnight(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return date;
}

export function getMonthStart(value) {
  const date = toMidnight(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthLabel(value) {
  const date = getMonthStart(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatDisplayDate(value) {
  const date = toMidnight(value);
  if (!date) return "Not set";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isDateBooked(date, unavailableDates) {
  const key = getDateKey(date);
  if (!key) return false;

  if (unavailableDates instanceof Set) {
    return unavailableDates.has(key);
  }

  return Array.isArray(unavailableDates) ? unavailableDates.includes(key) : false;
}

export function doesRangeContainBookedDate(startDate, endDate, unavailableDates) {
  const start = toMidnight(startDate);
  const end = toMidnight(endDate);

  if (!start || !end || end < start) return false;

  let cursor = new Date(start);
  while (cursor <= end) {
    if (isDateBooked(cursor, unavailableDates)) {
      return true;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

export function getCalendarMarkedDates(bookedRanges = [], startDate, endDate) {
  const marked = {};

  bookedRanges.forEach((booking) => {
    const start = toMidnight(booking?.startDate);
    const end = toMidnight(booking?.endDate);
    if (!start || !end || end < start) return;

    let cursor = new Date(start);
    while (cursor <= end) {
      marked[getDateKey(cursor)] = "booked";
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const startKey = getDateKey(startDate);
  const endKey = getDateKey(endDate);
  if (startKey) marked[startKey] = "pickup";
  if (endKey) marked[endKey] = "return";

  if (startDate && endDate) {
    let cursor = addDays(startDate, 1);
    while (cursor && cursor < endDate) {
      const key = getDateKey(cursor);
      if (!marked[key]) marked[key] = "range";
      cursor = addDays(cursor, 1);
    }
  }

  return marked;
}

export function buildUnavailableDateKeys(bookedRanges = []) {
  const keys = new Set();

  bookedRanges.forEach((booking) => {
    const start = toMidnight(booking?.startDate);
    const end = toMidnight(booking?.endDate);

    if (!start || !end || end < start) return;

    let cursor = new Date(start);
    while (cursor <= end) {
      keys.add(getDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return keys;
}

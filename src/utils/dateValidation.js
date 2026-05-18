export function parseDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function normalizeDate(value) {
  return parseDateOnly(value);
}

export function formatLocalDate(value) {
  const date = parseDateOnly(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isBeforeToday(value) {
  const date = parseDateOnly(value);
  if (!date) return false;
  const today = parseDateOnly(new Date());
  return Boolean(today && date < today);
}

export function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);
  const raw = String(value).trim();
  if (!raw) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function combineDateAndTime(dateValue, timeValue) {
  const date = parseDateInput(dateValue);
  if (!date) return null;

  if (!timeValue) return date;

  if (timeValue instanceof Date && !Number.isNaN(timeValue.getTime())) {
    date.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
    return date;
  }

  const timeText = String(timeValue || "").trim();
  const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return date;
  }

  const time = new Date(timeText);
  if (!Number.isNaN(time.getTime())) {
    date.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }

  return date;
}

export function ceilDateToThirtyMinutes(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  date.setSeconds(0, 0);
  const minutes = date.getMinutes();
  const remainder = minutes % 30;

  if (remainder !== 0) {
    date.setMinutes(minutes + (30 - remainder));
  }

  return date;
}

export function normalizeTimeToThirtyMinutes(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const normalizedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
  const normalizedHours = minutes < 45 ? hours : (hours + 1) % 24;

  return `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`;
}

export function getDateRangeError({ startDate, endDate, startTime, endTime }) {
  if (!startDate) return { field: "startDate", message: "Start date is required." };
  if (!endDate) return { field: "endDate", message: "End date is required." };

  const startOnly = parseDateOnly(startDate);
  const endOnly = parseDateOnly(endDate);
  if (!startOnly) return { field: "startDate", message: "Start date is required." };
  if (!endOnly) return { field: "endDate", message: "End date is required." };
  if (isBeforeToday(startOnly)) {
    return { field: "startDate", message: "Pick-up date cannot be before today." };
  }
  if (isBeforeToday(endOnly)) {
    return { field: "endDate", message: "Return date cannot be before today." };
  }
  if (endOnly.getTime() < startOnly.getTime()) {
    return { field: "endDate", message: "End date cannot be earlier than start date." };
  }
  if (!startTime && !endTime && endOnly.getTime() === startOnly.getTime()) {
    return { field: "endDate", message: "Return date must be later than start date." };
  }

  const now = new Date();
  const today = parseDateOnly(now);
  const startDateTime = startTime ? combineDateAndTime(startDate, startTime) : null;
  const endDateTime = endTime ? combineDateAndTime(endDate, endTime) : null;

  if (
    startTime &&
    today &&
    startOnly.getTime() === today.getTime() &&
    startDateTime &&
    startDateTime <= now
  ) {
    return { field: "startTime", message: "Start time must be later than the current time." };
  }

  if (
    endTime &&
    today &&
    endOnly.getTime() === today.getTime() &&
    endDateTime &&
    endDateTime <= now
  ) {
    return { field: "endTime", message: "End time must be later than the current time." };
  }

  if (startTime && endTime) {
    if (startDateTime && endDateTime && endDateTime <= startDateTime) {
      return { field: "endTime", message: "End time must be later than start time." };
    }
  }

  return null;
}

export function isEndDateValid(startDate, endDate) {
  return !getDateRangeError({ startDate, endDate });
}

import { BACKEND_ORIGIN } from "../api/api";

function firstPresent(values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function valueFromObject(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return firstPresent(value);
  return firstPresent([
    value.url,
    value.secure_url,
    value.path,
    value.src,
    value.uri,
    value.image,
  ]);
}

export function getBackendOrigin() {
  return BACKEND_ORIGIN.replace(/\/+$/, "");
}

export function resolveImageUrl(imageValue) {
  let value = valueFromObject(imageValue);
  value = valueFromObject(value);

  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^data:image\//i.test(raw)) {
    return raw;
  }

  if (/^[a-z]:\\/i.test(raw) || raw.startsWith("\\\\")) {
    return null;
  }

  const backendOrigin = getBackendOrigin();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
        const backendUrl = new URL(backendOrigin);
        url.protocol = backendUrl.protocol;
        url.hostname = backendUrl.hostname;
        url.port = backendUrl.port;
        return url.toString();
      }
      return raw;
    } catch {
      return null;
    }
  }

  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return null;

  if (normalized.startsWith("api/")) {
    return `${backendOrigin}/${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${backendOrigin}/${normalized}`;
  }

  if (/\.(jpe?g|png|webp|gif|bmp)$/i.test(normalized)) {
    return `${backendOrigin}/uploads/${normalized}`;
  }

  return null;
}

export function getVehicleImageUrl(vehicle) {
  return resolveImageUrl(
    firstPresent([
      Array.isArray(vehicle?.images) ? vehicle.images[0]?.url : null,
      Array.isArray(vehicle?.images) ? vehicle.images[0] : null,
      vehicle?.image,
      vehicle?.imageUrl,
      vehicle?.photo,
      vehicle?.thumbnail,
      vehicle?.vehicleImage,
      Array.isArray(vehicle?.vehicleId?.images) ? vehicle.vehicleId.images[0]?.url : null,
      Array.isArray(vehicle?.vehicleId?.images) ? vehicle.vehicleId.images[0] : null,
      vehicle?.vehicleId?.image,
      vehicle?.vehicleId?.imageUrl,
    ])
  );
}

export function getVehicleImageGallery(vehicle) {
  const uploadedImages = Array.isArray(vehicle?.images) ? vehicle.images : [];
  const candidates = uploadedImages.length ? uploadedImages : [vehicle?.image];
  const uniqueImages = [];

  for (const candidate of candidates) {
    const resolved = resolveImageUrl(candidate);

    if (resolved && !uniqueImages.includes(resolved)) {
      uniqueImages.push(resolved);
    }
  }

  return uniqueImages;
}

export function getProfileImageUrl(user) {
  return resolveImageUrl(
    firstPresent([
      user?.profileImage,
      user?.profileImageUrl,
      user?.avatar,
      user?.avatarUrl,
      user?.photo,
      user?.image,
    ])
  );
}

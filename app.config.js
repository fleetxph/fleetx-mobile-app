require("dotenv/config");

const googleMapsAndroidApiKey = String(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    ""
).trim();
const apiBaseUrl = String(
  process.env.EXPO_PUBLIC_API_BASE_URL ||
    "https://fleetx-backend-u4k6.onrender.com/api"
)
  .trim()
  .replace(/\/+$/, "");

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...(config.android || {}),
    googleServicesFile: "./google-services.json",
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
    ],
    ...(googleMapsAndroidApiKey
      ? {
          config: {
            ...((config.android && config.android.config) || {}),
            googleMaps: {
              apiKey: googleMapsAndroidApiKey,
            },
          },
        }
      : {}),
  },
  extra: {
    ...(config.extra || {}),
    hasNativeGoogleMapsKey: Boolean(googleMapsAndroidApiKey),
    googleMapsPublicApiKey: googleMapsAndroidApiKey || "",
    apiBaseUrl,
  },
});

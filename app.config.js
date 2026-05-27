require("dotenv/config");

const appJson = require("./app.json");

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

const baseConfig = appJson.expo || {};

module.exports = () => ({
  ...baseConfig,
  android: {
    ...(baseConfig.android || {}),
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
    ],
    ...(googleMapsAndroidApiKey
      ? {
          config: {
            ...((baseConfig.android && baseConfig.android.config) || {}),
            googleMaps: {
              apiKey: googleMapsAndroidApiKey,
            },
          },
        }
      : {}),
  },
  extra: {
    ...(baseConfig.extra || {}),
    hasNativeGoogleMapsKey: Boolean(googleMapsAndroidApiKey),
    googleMapsPublicApiKey: googleMapsAndroidApiKey || "",
    apiBaseUrl,
  },
});

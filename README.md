# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## FleetX build environment

Set these Expo public variables locally and in the EAS environment used to build an APK:

```bash
EXPO_PUBLIC_API_BASE_URL=https://fleetx-backend-u4k6.onrender.com/api
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

`EXPO_PUBLIC_API_BASE_URL` controls mobile API calls in release builds. If it is absent, the app keeps the current Render API URL as a compatibility fallback.

## Android push notification setup

Expo push tokens on Android require Firebase Cloud Messaging configuration for the same EAS project and Android package (`com.fleetx.app`).

1. Create or select the Firebase Android app for `com.fleetx.app`.
2. Download `google-services.json`, place it in this mobile project, and configure `expo.android.googleServicesFile` in the Expo app config.
3. Upload the Firebase service account key to Expo/EAS as the Android FCM V1 push notification credential for this EAS project.
4. Rebuild and reinstall the development build or APK after Firebase/EAS credential or app config changes.

Do not commit Firebase service account private-key JSON files. For the current Expo instructions, see:

- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/fcm-credentials/

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

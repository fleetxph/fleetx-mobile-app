import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearClientSession, isUnauthorizedError, subscribeToSessionExpired } from "../api/api";
import { getClientProfile } from "../api/clientApi";
import { clearStoredPushToken, initializePushNotificationsForSession } from "../services/notificationService";
import {
  clearStoredBookingIntent,
  getBookingIntentMeta,
  getStoredBookingIntent,
} from "../utils/bookingState";

const AuthContext = createContext(null);

const SESSION_SAVED_AT_KEY = "sessionSavedAt";

async function getStoredItem(key) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key) || "";
  }

  return (await AsyncStorage.getItem(key)) || "";
}

async function setStoredItem(key, value) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [user, setUser] = useState(null);
  const [authEvent, setAuthEvent] = useState({ type: "restore", at: Date.now() });

  const saveSession = useCallback(async ({ token = "", user: nextUser = null } = {}) => {
    if (!token) return false;

    const safeUser = nextUser && typeof nextUser === "object" ? nextUser : {};
    const clientName = safeUser?.name || safeUser?.fullName || "";
    const clientEmail = safeUser?.email || "";

    await Promise.all([
      setStoredItem("clientToken", token),
      setStoredItem("token", token),
      setStoredItem("clientUser", JSON.stringify(safeUser)),
      setStoredItem("clientName", clientName),
      setStoredItem("clientEmail", clientEmail),
      setStoredItem(SESSION_SAVED_AT_KEY, new Date().toISOString()),
    ]);

    setUser(safeUser);
    setIsAuthenticated(true);
    setAuthEvent({ type: "login", at: Date.now() });

    if (__DEV__) {
      console.log("[Session][save]", {
        hasToken: Boolean(token),
        hasUser: Boolean(Object.keys(safeUser).length),
      });
    }

    return true;
  }, []);

  const logout = useCallback(async () => {
    await clearClientSession();
    await clearStoredBookingIntent({ reason: "logout" });
    setUser(null);
    setIsAuthenticated(false);
    setAuthEvent({ type: "logout", at: Date.now() });

    if (__DEV__) {
      console.log("[Session][logout]", { cleared: true });
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      setIsRestoring(true);
      const pendingBookingIntent = await getStoredBookingIntent();
      const pendingBookingMeta = getBookingIntentMeta(pendingBookingIntent);
      const token = (await getStoredItem("clientToken")) || (await getStoredItem("token"));
      const rawUser = await getStoredItem("clientUser");
      let parsedUser = null;

      if (rawUser) {
        try {
          parsedUser = JSON.parse(rawUser);
        } catch {
          parsedUser = null;
        }
      }

      let restored = false;

      if (token) {
        try {
          const profileResponse = await getClientProfile();
          const profileUser = profileResponse?.user || parsedUser || {};
          setUser(profileUser);
          setIsAuthenticated(true);
          restored = true;
          await setStoredItem("clientUser", JSON.stringify(profileUser));
        } catch (error) {
          if (isUnauthorizedError(error)) {
            await clearClientSession();
            setUser(null);
            setIsAuthenticated(false);
          } else {
            setUser(parsedUser);
            setIsAuthenticated(Boolean(parsedUser));
            restored = Boolean(parsedUser);
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      if (__DEV__) {
        console.log("[BookingState][restore]", {
          hasSelectedVehicle: pendingBookingMeta.hasSelectedVehicle,
          hasDraft: pendingBookingMeta.hasDraft,
          openedWizard: false,
          reason: restored ? "session-restored-to-safe-route" : "no-active-session",
        });
        console.log("[Session][restore]", {
          hasToken: Boolean(token),
          hasUser: Boolean(parsedUser),
          restored,
        });
      }

      if (pendingBookingIntent) {
        await clearStoredBookingIntent({ reason: "session-restore" });
      }

      setAuthEvent({ type: "restore", at: Date.now() });
    } finally {
      setIsRestoring(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!isAuthenticated) return;

    initializePushNotificationsForSession().catch((error) => {
      if (__DEV__) {
        console.log("[PushNotifications][init]", {
          success: false,
          message: error?.message || "Unknown error",
        });
      }
    });
  }, [authEvent?.type, isAuthenticated]);

  useEffect(() => {
    const unsubscribe = subscribeToSessionExpired(async ({ status } = {}) => {
      await clearStoredPushToken();
      await clearStoredBookingIntent({ reason: "session-expired" });
      setUser(null);
      setIsAuthenticated(false);
      setAuthEvent({ type: "expired", status: status || null, at: Date.now() });
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isRestoring,
      user,
      authEvent,
      saveSession,
      logout,
      restoreSession,
    }),
    [authEvent, isAuthenticated, isRestoring, logout, restoreSession, saveSession, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

import React, { useEffect } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, Feather } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { configureNotifications } from "./src/services/notificationService";
import { warmUpBackend } from "./src/api/api";

// Auth screens
import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginClient from "./src/screens/LoginClient";
import RegisterClient from "./src/screens/RegisterClient";
import ClientOTP from "./src/screens/ClientOTP";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ForgotPasswordSentScreen from "./src/screens/ForgotPasswordSentScreen";
import ForgotPasswordVerifyScreen from "./src/screens/ForgotPasswordVerifyScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import ResetPasswordSuccessScreen from "./src/screens/ResetPasswordSuccessScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";

// Main screens
import ClientDashboard from "./src/screens/ClientDashboard";
import BrowseVehicles from "./src/screens/BrowseVehicles";
import VehicleDetails from "./src/screens/VehicleDetails";
import BookingWizardScreen from "./src/screens/BookingWizardScreen";
import MyBookings from "./src/screens/MyBookings";
import ProfileScreen from "./src/screens/ProfileScreen";
import PlanScreen from "./src/screens/PlanScreen";
import VerificationScreen from "./src/screens/VerificationScreen";
import PersonalInfoScreen from "./src/screens/PersonalInfoScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import BookingReceiptScreen from "./src/screens/BookingReceiptScreen";
import BookingInvoiceScreen from "./src/screens/BookingInvoiceScreen";
import BookedVehicleDetails from "./src/screens/BookedVehicleDetails";
import ContractReviewScreen from "./src/screens/ContractReviewScreen";
import PaymentInstructionsScreen from "./src/screens/PaymentInstructionsScreen";

const RootStack = createNativeStackNavigator();
const BrowseStackNav = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

function BrowseStack() {
  return (
    <BrowseStackNav.Navigator screenOptions={{ headerShown: false }}>
      <BrowseStackNav.Screen name="BrowseMain" component={BrowseVehicles} />
      <BrowseStackNav.Screen name="VehicleDetails" component={VehicleDetails} />
      <BrowseStackNav.Screen
        name="BookingWizard"
        component={BookingWizardScreen}
      />
    </BrowseStackNav.Navigator>
  );
}

function AuthRequiredScreen({ navigation, message = "Please log in to continue." }) {
  return (
    <SafeAreaView style={styles.authRequiredSafe}>
      <View style={styles.authRequiredCard}>
        <Ionicons name="lock-closed-outline" size={30} color="#F47C20" />
        <Text style={styles.authRequiredTitle}>Login Required</Text>
        <Text style={styles.authRequiredText}>{message}</Text>
        <TouchableOpacity
          style={styles.authRequiredPrimary}
          onPress={() => navigation.replace("ClientLogin")}
        >
          <Text style={styles.authRequiredPrimaryText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.authRequiredSecondary}
          onPress={() => navigation.replace("MainApp", { screen: "Home" })}
        >
          <Text style={styles.authRequiredSecondaryText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function withAuth(Component, message) {
  return function ProtectedComponent(props) {
    const { isAuthenticated, isRestoring } = useAuth();

    if (isRestoring) {
      return (
        <SafeAreaView style={styles.restoreSafe}>
          <ActivityIndicator size="large" color="#F47C20" />
          <Text style={styles.restoreText}>Restoring session...</Text>
        </SafeAreaView>
      );
    }

    if (!isAuthenticated) {
      return <AuthRequiredScreen navigation={props.navigation} message={message} />;
    }

    return <Component {...props} />;
  };
}

function TabIcon({ routeName, focused, color }) {
  let iconName = "home-outline";
  let IconComponent = Ionicons;

  switch (routeName) {
    case "Home":
      iconName = focused ? "home" : "home-outline";
      break;
    case "Browse":
      iconName = focused ? "car-sport" : "car-sport-outline";
      break;
    case "Plan":
      IconComponent = Feather;
      iconName = "map";
      break;
    case "Bookings":
      iconName = focused ? "calendar" : "calendar-outline";
      break;
    case "Profile":
      iconName = focused ? "person" : "person-outline";
      break;
    default:
      iconName = "ellipse-outline";
      break;
  }

  return <IconComponent name={iconName} size={22} color={color} />;
}

function CustomPlanTabButton({ children, onPress }) {
  return (
    <TouchableOpacity
      style={styles.planButtonWrapper}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.planButton}>{children}</View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const ProtectedBookings = withAuth(
    MyBookings,
    "Please log in to manage your bookings."
  );
  const ProtectedProfile = withAuth(
    ProfileScreen,
    "Please log in to manage your profile and verification."
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#F47C20",
        tabBarInactiveTintColor: "#98A2B3",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 10,
          height: 74,
          borderTopWidth: 0,
          borderRadius: 22,
          backgroundColor: "#FFFFFF",
          paddingTop: 10,
          paddingBottom: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon routeName={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={ClientDashboard}
        options={{
          tabBarLabel: "Home",
        }}
      />

      <Tab.Screen
        name="Browse"
        component={BrowseStack}
        options={{
          tabBarLabel: "Browse",
          popToTopOnBlur: true,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate("Browse", {
              screen: "BrowseMain",
            });
          },
        })}
      />

      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarLabel: "Plan",
          tabBarButton: (props) => <CustomPlanTabButton {...props} />,
          tabBarIcon: () => <Feather name="map" size={24} color="#FFFFFF" />,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            marginBottom: 4,
            color: "#F47C20",
          },
        }}
      />

      <Tab.Screen
        name="Bookings"
        component={ProtectedBookings}
        options={{
          tabBarLabel: "Bookings",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProtectedProfile}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { authEvent, isAuthenticated, isRestoring } = useAuth();
  const ProtectedChangePassword = withAuth(
    ChangePasswordScreen,
    "Please log in to change your password."
  );
  const ProtectedVerification = withAuth(
    VerificationScreen,
    "Please log in to manage account verification."
  );
  const ProtectedPersonalInfo = withAuth(
    PersonalInfoScreen,
    "Please log in to edit your personal information."
  );
  const ProtectedNotifications = withAuth(
    NotificationsScreen,
    "Please log in to view notifications."
  );
  const ProtectedBookingReceipt = withAuth(
    BookingReceiptScreen,
    "Please log in to view booking receipts."
  );
  const ProtectedBookingInvoice = withAuth(
    BookingInvoiceScreen,
    "Please log in to view booking invoices."
  );
  const ProtectedBookedVehicleDetails = withAuth(
    BookedVehicleDetails,
    "Please log in to view booking details."
  );
  const ProtectedPaymentInstructions = withAuth(
    PaymentInstructionsScreen,
    "Please log in to view payment instructions."
  );
  const ProtectedContractReview = withAuth(
    ContractReviewScreen,
    "Please log in to review your rental contract."
  );

  useEffect(() => {
    configureNotifications().catch(() => {});
    warmUpBackend().catch(() => {});
  }, []);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    if (authEvent?.type === "expired") {
      navigationRef.resetRoot({
        index: 0,
        routes: [
          {
            name: "ClientLogin",
            params: { sessionExpired: true },
          },
        ],
      });
    }
  }, [authEvent]);

  useEffect(() => {
    if (!navigationRef.isReady()) return;
    if (authEvent?.type !== "restore" || !isAuthenticated) return;

    navigationRef.resetRoot({
      index: 0,
      routes: [
        {
          name: "MainApp",
          params: { screen: "Home" },
        },
      ],
    });
  }, [authEvent, isAuthenticated]);

  if (isRestoring) {
    return (
      <SafeAreaView style={styles.restoreSafe}>
        <ActivityIndicator size="large" color="#F47C20" />
        <Text style={styles.restoreText}>Restoring session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator
        initialRouteName={isAuthenticated ? "MainApp" : "Welcome"}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen name="Welcome" component={WelcomeScreen} />
        <RootStack.Screen name="ClientLogin" component={LoginClient} />
        <RootStack.Screen name="RegisterClient" component={RegisterClient} />
        <RootStack.Screen name="ClientOTP" component={ClientOTP} />
        <RootStack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
        />
        <RootStack.Screen
          name="ForgotPasswordSent"
          component={ForgotPasswordSentScreen}
        />
        <RootStack.Screen
          name="ForgotPasswordVerify"
          component={ForgotPasswordVerifyScreen}
        />
        <RootStack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
        />
        <RootStack.Screen
          name="ResetPasswordSuccess"
          component={ResetPasswordSuccessScreen}
        />
        <RootStack.Screen
          name="ChangePassword"
          component={ProtectedChangePassword}
        />
        <RootStack.Screen name="MainApp" component={MainTabs} />
        <RootStack.Screen name="Verification" component={ProtectedVerification} />
        <RootStack.Screen name="PersonalInfo" component={ProtectedPersonalInfo} />
        <RootStack.Screen name="Notifications" component={ProtectedNotifications} />
        <RootStack.Screen name="BookingReceipt" component={ProtectedBookingReceipt} />
        <RootStack.Screen name="BookingInvoice" component={ProtectedBookingInvoice} />
        <RootStack.Screen name="BookedVehicleDetails" component={ProtectedBookedVehicleDetails} />
        <RootStack.Screen name="PaymentInstructions" component={ProtectedPaymentInstructions} />
        <RootStack.Screen name="ContractReview" component={ProtectedContractReview} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  planButtonWrapper: {
    top: -18,
    justifyContent: "center",
    alignItems: "center",
  },
  planButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F47C20",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 8,
  },
  restoreSafe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  restoreText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  authRequiredSafe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 20,
    justifyContent: "center",
  },
  authRequiredCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  authRequiredTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  authRequiredText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#64748B",
  },
  authRequiredPrimary: {
    marginTop: 18,
    minHeight: 48,
    alignSelf: "stretch",
    borderRadius: 16,
    backgroundColor: "#F47C20",
    alignItems: "center",
    justifyContent: "center",
  },
  authRequiredPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  authRequiredSecondary: {
    marginTop: 10,
    minHeight: 46,
    alignSelf: "stretch",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  authRequiredSecondaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#C2410C",
  },
});

import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, Feather } from "@expo/vector-icons";

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
import PaymentInstructionsScreen from "./src/screens/PaymentInstructionsScreen";

const RootStack = createNativeStackNavigator();
const BrowseStackNav = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
        }}
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
        component={MyBookings}
        options={{
          tabBarLabel: "Bookings",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName="Welcome"
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
          component={ChangePasswordScreen}
        />
        <RootStack.Screen name="MainApp" component={MainTabs} />
        <RootStack.Screen name="Verification" component={VerificationScreen} />
        <RootStack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} />
        <RootStack.Screen name="BookingReceipt" component={BookingReceiptScreen} />
        <RootStack.Screen name="BookingInvoice" component={BookingInvoiceScreen} />
        <RootStack.Screen name="BookedVehicleDetails" component={BookedVehicleDetails} />
        <RootStack.Screen name="PaymentInstructions" component={PaymentInstructionsScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
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
});

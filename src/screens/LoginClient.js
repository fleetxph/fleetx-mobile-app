import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import api from "../api/api";
import { styles } from "../styles/authStyle";
import LoadingOverlay from "../components/LoadingOverlay";

export default function LoginClient({ navigation }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const handleLogin = async () => {
    setMsg("");
    Keyboard.dismiss();

    if (!login.trim() || !password.trim()) {
      setMsg("Email/Username and password are required.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/client/login", {
        login: login.trim().toLowerCase(),
        password,
      });

      const token = res.data?.token || "";
      const user = res.data?.user || {};
      const name = user?.name || "";
      const userEmail = user?.email || "";

      if (Platform.OS === "web") {
        window.localStorage.setItem("clientToken", token);
        window.localStorage.setItem("token", token);
        window.localStorage.setItem("clientName", name);
        window.localStorage.setItem("clientEmail", userEmail);
        window.localStorage.setItem("clientUser", JSON.stringify(user));
      } else {
        await AsyncStorage.setItem("clientToken", token);
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("clientName", name);
        await AsyncStorage.setItem("clientEmail", userEmail);
        await AsyncStorage.setItem("clientUser", JSON.stringify(user));
      }

      navigation.replace("MainApp");
    } catch (err) {
      setMsg(err?.response?.data?.message || err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.topGlow} />
          <View style={styles.bottomCurve} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.authTopSection}>
              <View style={styles.brandArea}>
                <View style={styles.logoWrapper}>
                  <Image
                    source={require("../../assets/logo.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                
              </View>

              <View style={styles.heroTextBlock}>
                <Text style={styles.heroEyebrow}>CAPT FleetX</Text>
                <Text style={styles.heroTitle}>Welcome Back!</Text>
                <Text style={styles.heroSubtitle}>
                  Sign in to manage bookings, view trip updates, and continue your
                  next ride with ease.
                </Text>
              </View>
            </View>

            <View style={styles.cardWrap}>
              <View style={styles.card}>
                <View style={styles.authTabs}>
                  <TouchableOpacity
                    style={[styles.authTab, styles.authTabActive]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.authTabText, styles.authTabTextActive]}>
                      Log In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.authTab}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("RegisterClient")}
                  >
                    <Text style={styles.authTabText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>
                  Enter your details to access your FleetDrive account.
                </Text>

                {!!msg && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{msg}</Text>
                  </View>
                )}

                <Text style={styles.label}>Email / Username</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "login" && styles.inputWrapperFocused,
                  ]}
                >
                  <Feather
                    name="user"
                    size={18}
                    color="#98A2B3"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter email or username"
                    placeholderTextColor="#98A2B3"
                    value={login}
                    onChangeText={setLogin}
                    onFocus={() => setFocusedField("login")}
                    onBlur={() => setFocusedField("")}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "password" && styles.inputWrapperFocused,
                  ]}
                >
                  <Feather
                    name="lock"
                    size={18}
                    color="#98A2B3"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter your password"
                    placeholderTextColor="#98A2B3"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField("")}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#98A2B3"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.forgotPasswordWrap}
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      loading && styles.buttonTextDisabled,
                    ]}
                  >
                    {loading ? "Signing In..." : "Log In"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.bottomRow}>
                  <Text style={styles.bottomText}>Don&apos;t have an account? </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("RegisterClient")}
                  >
                    <Text style={styles.registerText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.trustText}>
                  Secure login - Verified bookings - Real-time updates
                </Text>
              </View>
            </View>
          </ScrollView>

          <LoadingOverlay visible={loading} text="Signing you in..." />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

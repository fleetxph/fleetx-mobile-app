import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Alert,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather } from "@expo/vector-icons";
import api from "../api/api";
import { styles } from "../styles/authStyle";
import LoadingOverlay from "../components/LoadingOverlay";

export default function ForgotPasswordScreen({ navigation, route }) {
  const isChangePassword = route?.params?.mode === "changePassword";

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => {
    return {
      minLength: newPassword.length >= 10,
      maxLength: newPassword.length <= 64 && newPassword.length > 0,
      uppercase: /[A-Z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
    };
  }, [newPassword]);

  const passwordStrength = useMemo(() => {
    const score = Object.values(passwordChecks).filter(Boolean).length;

    if (!newPassword) {
      return {
        label: "Enter password",
        width: "0%",
        color: "#e5e7eb",
      };
    }

    if (score <= 1) {
      return {
        label: "Weak",
        width: "33%",
        color: "#ef4444",
      };
    }

    if (score <= 3) {
      return {
        label: "Medium",
        width: "66%",
        color: "#f59e0b",
      };
    }

    return {
      label: "Strong",
      width: "100%",
      color: "#22c55e",
    };
  }, [newPassword, passwordChecks]);

  const RequirementText = ({ passed, children }) => (
    <Text
      style={[
        styles.passwordGuideText,
        passed && styles.passwordGuideTextPassed,
      ]}
    >
      {passed ? "OK" : "-"} {children}
    </Text>
  );

  const handleSendCode = async () => {
    setMsg("");
    Keyboard.dismiss();

    if (!email.trim()) {
      setMsg("Email is required.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setMsg("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/client/forgot-password/request-code", {
        email: email.trim().toLowerCase(),
      });

      navigation.navigate("ForgotPasswordSent", {
        email: email.trim().toLowerCase(),
        message:
          res.data?.message ||
          "If an account exists for this email, a reset code has been sent.",
      });
    } catch (err) {
      setMsg(
        err?.response?.data?.message ||
          err.message ||
          "Failed to send reset code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setMsg("");
    Keyboard.dismiss();

    try {
      setLoading(true);
      const storedEmail =
        Platform.OS === "web"
          ? window.localStorage.getItem("clientEmail") || ""
          : (await AsyncStorage.getItem("clientEmail")) || "";

      if (!storedEmail) {
        setMsg("We could not find your account email. Please use Forgot Password instead.");
        return;
      }

      const res = await api.post("/client/forgot-password/request-code", {
        email: storedEmail.trim().toLowerCase(),
      });

      Alert.alert(
        "Verification Required",
        res.data?.message || "A reset code was sent to your email.",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.navigate("ForgotPasswordSent", {
                email: storedEmail.trim().toLowerCase(),
                message: "Use the code from your email to finish changing your password.",
              }),
          },
        ]
      );
    } catch (err) {
      setMsg(
        err?.response?.data?.message ||
          err.message ||
          "Failed to start password reset."
      );
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
          <View style={[styles.authTopSection, styles.authTopSectionCompact]}>
            <View style={styles.brandArea}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require("../../assets/logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandName}>FleetDrive</Text>
              <Text style={styles.brandTagline}>Premium transport and rental booking</Text>
            </View>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>CAPT FleetX</Text>
              <Text style={styles.heroTitle}>
                {isChangePassword ? "Change Password" : "Forgot Password?"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isChangePassword
                  ? "Secure your account with a verified password update."
                  : "We'll send a secure reset code to your email address."}
              </Text>
            </View>
          </View>

          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={20} color="#0B1633" />
              </TouchableOpacity>

              <View style={styles.otpIconWrap}>
                <Feather name="lock" size={28} color="#F97316" />
              </View>

              <Text style={styles.title}>
                {isChangePassword ? "Change Password" : "Reset Access"}
              </Text>

              <Text style={styles.subtitle}>
                {isChangePassword
                  ? "We will send a verification code to your account email before updating your password."
                  : "Enter your email below and we'll send your reset code."}
              </Text>

              {!!msg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{msg}</Text>
                </View>
              )}

              {isChangePassword ? (
                <>
                  <Text style={styles.label}>Current Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="lock"
                      size={18}
                      color="#98A2B3"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Enter current password"
                      placeholderTextColor="#98A2B3"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                    />
                  </View>

                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="key"
                      size={18}
                      color="#98A2B3"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Enter new password"
                      placeholderTextColor="#98A2B3"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.passwordStrengthBox}>
                    <View style={styles.passwordStrengthTop}>
                      <Text style={styles.passwordStrengthLabel}>
                        Password Strength
                      </Text>
                      <Text
                        style={[
                          styles.passwordStrengthValue,
                          { color: passwordStrength.color },
                        ]}
                      >
                        {passwordStrength.label}
                      </Text>
                    </View>

                    <View style={styles.passwordStrengthTrack}>
                      <View
                        style={[
                          styles.passwordStrengthFill,
                          {
                            width: passwordStrength.width,
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.passwordGuideBox}>
                    <Text style={styles.passwordGuideTitle}>
                      Password Requirements
                    </Text>

                    <RequirementText passed={passwordChecks.minLength}>
                      At least 10 characters
                    </RequirementText>

                    <RequirementText passed={passwordChecks.maxLength}>
                      Maximum 64 characters
                    </RequirementText>

                    <RequirementText passed={passwordChecks.uppercase}>
                      At least one uppercase letter
                    </RequirementText>

                    <RequirementText passed={passwordChecks.number}>
                      At least one number
                    </RequirementText>
                  </View>

                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="check-circle"
                      size={18}
                      color="#98A2B3"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Confirm new password"
                      placeholderTextColor="#98A2B3"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        loading && styles.buttonTextDisabled,
                      ]}
                    >
                      {loading ? "Saving..." : "Save Password"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="mail"
                      size={18}
                      color="#98A2B3"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="you@email.com"
                      placeholderTextColor="#98A2B3"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSendCode}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        loading && styles.buttonTextDisabled,
                      ]}
                    >
                      {loading ? "Sending Code..." : "Send Code"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.bottomRow}>
                    <Text style={styles.bottomText}>Remember your password? </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("ClientLogin")}
                    >
                      <Text style={styles.registerText}>Back to Login</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        <LoadingOverlay
          visible={loading}
          text={
            isChangePassword ? "Updating password..." : "Sending reset code..."
          }
        />
      </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

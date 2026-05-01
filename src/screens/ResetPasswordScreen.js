import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import api from "../api/api";
import { styles } from "../styles/authStyle";
import LoadingOverlay from "../components/LoadingOverlay";

export default function ResetPasswordScreen({ route, navigation }) {
  const email = route?.params?.email || "";
  const otp = route?.params?.otp || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => {
    return {
      minLength: newPassword.length >= 10,
      maxLength: newPassword.length <= 64 && newPassword.length > 0,
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
    };
  }, [newPassword]);

  const passwordStrength = useMemo(() => {
    const score = Object.values(passwordChecks).filter(Boolean).length;

    if (!newPassword) {
      return { label: "", width: "0%", color: "#D0D5DD" };
    }

    if (score <= 1) {
      return { label: "Weak", width: "33%", color: "#EF4444" };
    }

    if (score <= 3) {
      return { label: "Medium", width: "66%", color: "#F59E0B" };
    }

    return { label: "Strong", width: "100%", color: "#22C55E" };
  }, [passwordChecks, newPassword]);

  const Requirement = ({ passed, text }) => (
    <Text
      style={[
        styles.passwordRuleItem,
        passed && { color: "#16a34a", fontWeight: "700" },
      ]}
    >
      {passed ? "OK" : "-"} {text}
    </Text>
  );

  const handleResetPassword = async () => {
    setMsg("");
    Keyboard.dismiss();

    if (!newPassword || !confirmPassword) {
      setMsg("Both password fields are required.");
      return;
    }

    if (!passwordChecks.minLength) {
      setMsg("Password must be at least 10 characters.");
      return;
    }

    if (!passwordChecks.maxLength) {
      setMsg("Password must not exceed 64 characters.");
      return;
    }

    if (!passwordChecks.uppercase) {
      setMsg("Password must include uppercase letter.");
      return;
    }

    if (!passwordChecks.number) {
      setMsg("Password must include a number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/client/forgot-password/reset", {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
        confirmPassword,
      });

      navigation.replace("ResetPasswordSuccess");
    } catch (err) {
      setMsg(
        err?.response?.data?.message ||
          err.message ||
          "Failed to reset password."
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

          <Text style={styles.title}>Create new password</Text>

          <Text style={styles.subtitleCenter}>
            Choose a strong password for your account.
          </Text>

          {!!msg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{msg}</Text>
            </View>
          )}

          <Text style={styles.label}>New Password</Text>

          <View style={styles.inputWrapper}>
            <Feather
              name="lock"
              size={18}
              color="#98A2B3"
              style={styles.leftIcon}
            />

            <TextInput
              style={styles.inputWithIcon}
              placeholder="Enter new password"
              placeholderTextColor="#98A2B3"
              value={newPassword}
              onChangeText={(text) => setNewPassword(text.slice(0, 64))}
              maxLength={64}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color="#98A2B3"
              />
            </TouchableOpacity>
          </View>

          {!!newPassword && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBarBg}>
                <View
                  style={[
                    styles.strengthBarFill,
                    {
                      width: passwordStrength.width,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>

              <Text
                style={[styles.strengthText, { color: passwordStrength.color }]}
              >
                {passwordStrength.label}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Confirm Password</Text>

          <View style={styles.inputWrapper}>
            <Feather
              name="lock"
              size={18}
              color="#98A2B3"
              style={styles.leftIcon}
            />

            <TextInput
              style={styles.inputWithIcon}
              placeholder="Confirm new password"
              placeholderTextColor="#98A2B3"
              value={confirmPassword}
              onChangeText={(text) => setConfirmPassword(text.slice(0, 64))}
              maxLength={64}
              secureTextEntry={!showConfirmPassword}
            />

            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Feather
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={18}
                color="#98A2B3"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordRulesCard}>
            <Text style={styles.passwordRulesTitle}>Password Requirements</Text>

            <Requirement
              passed={passwordChecks.minLength}
              text="At least 10 characters"
            />

            <Requirement
              passed={passwordChecks.maxLength}
              text="Maximum 64 characters"
            />

            <Requirement
              passed={passwordChecks.uppercase}
              text="At least one uppercase letter"
            />

            <Requirement
              passed={passwordChecks.number}
              text="At least one number"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text
              style={[
                styles.buttonText,
                loading && styles.buttonTextDisabled,
              ]}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>

        <LoadingOverlay visible={loading} text="Resetting your password..." />
      </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

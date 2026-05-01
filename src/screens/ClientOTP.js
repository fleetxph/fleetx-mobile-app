import { useEffect, useRef, useState } from "react";
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

export default function ClientOTP({ route, navigation }) {
  const emailFromRoute = route?.params?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [msg, setMsg] = useState("");
  const [seconds, setSeconds] = useState(300);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  const maskedEmail = emailFromRoute
    ? emailFromRoute.replace(/(.{2}).+(@.+)/, "$1***$2")
    : "";

  const otpValue = otp.join("");
  const isComplete = otpValue.length === 6;

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  const handleChange = (text, index) => {
    const cleanText = text.replace(/\D/g, "");

    if (!cleanText) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      setMsg("");
      return;
    }

    if (cleanText.length > 1) {
      const pasted = cleanText.slice(0, 6).split("");
      const updated = ["", "", "", "", "", ""];

      pasted.forEach((digit, i) => {
        updated[i] = digit;
      });

      setOtp(updated);
      setMsg("");

      const nextIndex = Math.min(pasted.length, 5);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    const updated = [...otp];
    updated[index] = cleanText;
    setOtp(updated);
    setMsg("");

    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    } else {
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setMsg("");
    Keyboard.dismiss();

    if (!emailFromRoute.trim()) {
      setMsg("Email is required.");
      return;
    }

    if (!isComplete) {
      setMsg("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/client/verify-otp", {
        email: emailFromRoute.trim().toLowerCase(),
        otp: otpValue,
      });

      navigation.replace("ClientLogin");
    } catch (err) {
      console.log("OTP VERIFY ERROR:", err?.response?.data || err.message);

      const message =
        err?.response?.data?.message ||
        err.message ||
        "OTP verification failed.";

      setMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setMsg("");
    Keyboard.dismiss();

    if (!emailFromRoute.trim()) {
      setMsg("Email is required.");
      return;
    }

    try {
      setResending(true);

      const res = await api.post("/client/request-otp", {
        email: emailFromRoute.trim().toLowerCase(),
      });

      setOtp(["", "", "", "", "", ""]);
      setSeconds(300);

      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);

      setMsg(res.data?.message || "OTP sent to your email.");
    } catch (err) {
      console.log("RESEND OTP ERROR:", err?.response?.data || err.message);

      const message =
        err?.response?.data?.message ||
        err.message ||
        "Failed to resend OTP.";

      setMsg(message);
    } finally {
      setResending(false);
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
            <Feather name="mail" size={28} color="#F97316" />
          </View>

          <Text style={styles.otpTitle}>Check your email</Text>
          <Text style={styles.otpSubtitle}>
            We sent a verification code to your registered email.
          </Text>
          <Text style={styles.otpEmail}>{maskedEmail || emailFromRoute}</Text>

          {!!msg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{msg}</Text>
            </View>
          )}

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputsRef.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                autoFocus={index === 0}
              />
            ))}
          </View>

          <View style={styles.timerRow}>
            <Feather name="clock" size={14} color="#98A2B3" />
            <Text style={styles.timerText}>
              Code expires in {formatTime(seconds)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!isComplete || loading) && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={!isComplete || loading}
          >
            <Text
              style={[
                styles.buttonText,
                (!isComplete || loading) && styles.buttonTextDisabled,
              ]}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.resendLabel}>Didn't receive the code?</Text>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending}
            style={styles.resendButton}
          >
            <Text style={styles.resendText}>
              {resending ? "Sending..." : "Resend code"}
            </Text>
          </TouchableOpacity>

          <View style={styles.statusCard}>
            <View style={styles.statusIconWrap}>
              <Feather name="shield" size={16} color="#F59E0B" />
            </View>

            <View>
              <Text style={styles.statusTitle}>Account Status</Text>
              <Text style={styles.statusSubtitle}>
                Pending Email Verification
              </Text>
            </View>
          </View>
        </View>
        </ScrollView>

        <LoadingOverlay
          visible={loading || resending}
          text={loading ? "Verifying your code..." : "Sending a new code..."}
        />
      </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

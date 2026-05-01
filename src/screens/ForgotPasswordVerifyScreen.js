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
import { Feather } from "@expo/vector-icons";
import api from "../api/api";
import { styles } from "../styles/authStyle";
import LoadingOverlay from "../components/LoadingOverlay";

export default function ForgotPasswordVerifyScreen({ route, navigation }) {
  const email = route?.params?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [msg, setMsg] = useState("");
  const [seconds, setSeconds] = useState(600);
  const [resendCooldown, setResendCooldown] = useState(36);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef([]);

  const maskedEmail = email
    ? email.replace(/(.{1}).+(@.+)/, "$1***$2")
    : "";

  const otpValue = otp.join("");
  const isComplete = otpValue.length === 6;

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

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

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

    if (!email.trim()) {
      setMsg("Email is required.");
      return;
    }

    if (!isComplete) {
      setMsg("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/client/forgot-password/verify-code", {
        email: email.trim().toLowerCase(),
        otp: otpValue,
      });

      navigation.navigate("ResetPassword", {
        email,
        otp: otpValue,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Failed to verify reset code.";

      setMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setMsg("");
    Keyboard.dismiss();

    try {
      setResending(true);

      await api.post("/client/forgot-password/request-code", {
        email: email.trim().toLowerCase(),
      });

      setOtp(["", "", "", "", "", ""]);
      setSeconds(600);
      setResendCooldown(36);

      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);

      setMsg("A new reset code has been sent.");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Failed to resend code.";

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
          <View style={styles.otpIconWrap}>
            <Feather name="shield" size={28} color="#F97316" />
          </View>

          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitleCenter}>
            Enter the code we sent to continue.
          </Text>
          <Text style={styles.otpEmail}>{maskedEmail || email}</Text>

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
                style={styles.otpInputOrange}
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
              {loading ? "Verifying..." : "Verify Code"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.resendLabel}>Didn't receive the code?</Text>

          <Text style={styles.resendTimerText}>
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : "You can resend the code now"}
          </Text>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0 || resending}
            style={styles.resendButton}
          >
            <Text
              style={[
                styles.resendText,
                (resendCooldown > 0 || resending) && styles.disabledResendText,
              ]}
            >
              {resending ? "Sending..." : "Resend Code"}
            </Text>
          </TouchableOpacity>

          <View style={styles.noticeCard}>
            <View style={styles.noticeIconWrap}>
              <Feather name="shield" size={14} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Security Notice</Text>
              <Text style={styles.noticeText}>
                This code is valid for 10 minutes and can only be used once.
                Never share it with anyone.
              </Text>
            </View>
          </View>
        </View>
        </ScrollView>

        <LoadingOverlay
          visible={loading || resending}
          text={loading ? "Verifying code..." : "Sending a new code..."}
        />
      </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { styles } from "../styles/authStyle";

export default function ForgotPasswordSentScreen({ route, navigation }) {
  const email = route?.params?.email || "";

  const maskedEmail = email
    ? email.replace(/(.{1}).+(@.+)/, "$1***$2")
    : "";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.bottomCurve} />
      <View style={styles.card}>
        <View style={styles.successIconWrapGreen}>
          <Feather name="mail" size={30} color="#22C55E" />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitleCenter}>
          If an account exists for this email, a verification code has been sent.
        </Text>

        <Text style={styles.otpEmail}>{maskedEmail || email}</Text>

        <View style={styles.infoCardBlue}>
          <View style={styles.infoIconWrapBlue}>
            <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTitleBlue}>Email Sent</Text>
            <Text style={styles.infoCardTextBlue}>
              Please check your inbox for the reset code.
            </Text>
          </View>
        </View>

        <View style={styles.infoCardYellow}>
          <View style={styles.infoIconWrapYellow}>
            <Feather name="clock" size={16} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTextYellow}>
              The code expires in <Text style={styles.boldText}>10 minutes</Text>. Check your spam
              folder if you don't see it.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate("ForgotPasswordVerify", {
              email,
            })
          }
        >
          <Text style={styles.buttonText}>Enter Verification Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textOnlyButton}
          onPress={() => navigation.navigate("ClientLogin")}
        >
          <Text style={styles.textOnlyButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

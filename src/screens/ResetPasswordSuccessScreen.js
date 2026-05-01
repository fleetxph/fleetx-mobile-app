import { useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { styles } from "../styles/authStyle";

export default function ResetPasswordSuccessScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("ClientLogin");
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.bottomCurve} />
      <View style={styles.card}>
        <View style={styles.successIconWrapGreen}>
          <Feather name="check" size={34} color="#22C55E" />
        </View>

        <Text style={styles.titleCenter}>Password updated</Text>
        <Text style={styles.subtitleCenter}>
          You can now sign in using your new password.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace("ClientLogin")}
        >
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.redirectText}>
          Redirecting automatically in a few seconds...
        </Text>
      </View>
    </SafeAreaView>
  );
}

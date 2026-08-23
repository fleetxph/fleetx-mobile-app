import { Modal, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../styles/verificationStyle";

const TIPS = [
  "Show the entire ID, including all four corners.",
  "Make sure names, numbers, and dates are readable.",
  "Hold the camera steady so the image is not blurred.",
  "Avoid glare and strong reflections on the card.",
  "Use even lighting and a plain background.",
];

export default function DocumentExampleModal({ visible, side = "front", onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.exampleModalBackdrop}>
        <View style={styles.exampleModalCard}>
          <View style={styles.exampleModalHeader}>
            <View>
              <Text style={styles.exampleModalTitle}>Good {side} photo</Text>
              <Text style={styles.exampleModalSubtitle}>Use this checklist before continuing.</Text>
            </View>
            <TouchableOpacity style={styles.exampleCloseButton} onPress={onClose}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.exampleIllustration}>
            <MaterialCommunityIcons name="card-account-details-outline" size={72} color="#f97316" />
            <View style={styles.exampleCornerTopLeft} />
            <View style={styles.exampleCornerTopRight} />
            <View style={styles.exampleCornerBottomLeft} />
            <View style={styles.exampleCornerBottomRight} />
          </View>

          <View style={styles.exampleTips}>
            {TIPS.map((tip) => (
              <View style={styles.exampleTipRow} key={tip}>
                <Ionicons name="checkmark-circle" size={19} color="#15803d" />
                <Text style={styles.exampleTipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.exampleDoneButton} onPress={onClose}>
            <Text style={styles.exampleDoneButtonText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

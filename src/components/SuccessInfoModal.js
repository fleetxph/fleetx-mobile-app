import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export default function SuccessInfoModal({
  visible,
  title,
  message,
  note,
  steps = [],
  reference,
  primaryActionLabel = "Continue",
  secondaryActionLabel = "Close",
  onPrimary,
  onSecondary,
  onClose,
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose || onSecondary}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark" size={30} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}

          {reference ? (
            <View style={styles.referenceChip}>
              <Text style={styles.referenceChipText}>{reference}</Text>
            </View>
          ) : null}

          {steps.length ? (
            <View style={styles.stepsCard}>
              {steps.map((step, index) => (
                <View key={`${index}-${step}`} style={styles.stepRow}>
                  <Text style={styles.stepIndex}>{index + 1}.</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={onPrimary}>
            <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={onSecondary}>
            <Text style={styles.secondaryButtonText}>{secondaryActionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    color: colors.heading,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  note: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 10,
  },
  referenceChip: {
    alignSelf: "center",
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  referenceChipText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  stepsCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  stepIndex: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "900",
  },
});

import { StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },

  /* ---------- IMAGE ---------- */

  imageSection: {
    marginBottom: 18,
  },

  mainImage: {
    width: "100%",
    height: 240,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },

  imagePlaceholder: {
    width: "100%",
    height: 240,
    borderRadius: 20,
    backgroundColor: colors.primary || "#0B132B",
    alignItems: "center",
    justifyContent: "center",
  },

  imagePlaceholderText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },

  thumbnailRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },

  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },

  thumbnailActive: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.accent,
  },

  thumbnailImage: {
    width: "100%",
    height: "100%",
  },

  thumbnailFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },

  /* ---------- VEHICLE INFO ---------- */

  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  vehicleTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.heading,
    marginBottom: 12,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  infoItem: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },

  infoLabel: {
    fontSize: 12,
    color: colors.subtext,
  },

  rateBox: {
    marginTop: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: 14,
  },

  rateLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: 4,
  },

  rateValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.accent,
  },

  /* ---------- FORM ---------- */

  formCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.heading,
    marginBottom: 6,
  },

  sectionSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },

  inputBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },

  inputText: {
    color: colors.text,
    fontSize: 14,
  },

  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: colors.text,
  },

  paxDropdown: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: "hidden",
  },

  paxOption: {
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  paxOptionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },

  /* ---------- SUMMARY ---------- */

  summaryBox: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 13,
    color: colors.subtext,
  },

  summaryValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
  },

  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },

  totalPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.accent,
  },

  /* ---------- BUTTON ---------- */

  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },prefilledNotice: {
  backgroundColor: "#FFF7ED",
  borderWidth: 1,
  borderColor: "#FDBA74",
  borderRadius: 14,
  padding: 12,
  marginBottom: 14,
},

prefilledNoticeText: {
  color: "#C2410C",
  fontSize: 13,
  lineHeight: 19,
  fontWeight: "600",
},
});

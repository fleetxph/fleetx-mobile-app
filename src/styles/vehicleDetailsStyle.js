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
  fitCard: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.softBorder,
    padding: 12,
  },
  fitPrimary: {
    color: colors.heading,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  fitSecondary: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

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
    lineHeight: 19,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },

  inputText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  summaryBox: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.softBorder,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },

  summaryLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.subtext,
  },

  summaryValue: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
  },

  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },

  prefilledNotice: {
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

  availabilityNotice: {
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
    padding: 12,
    marginBottom: 12,
  },

  availabilityNoticeText: {
    color: "#92400E",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  errorText: {
    color: colors.danger,
    marginBottom: 12,
    fontWeight: "700",
    fontSize: 13,
  },

  dateFieldRow: {
    flexDirection: "row",
    gap: 10,
  },

  dateFieldCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.softBorder,
    padding: 14,
  },

  dateFieldCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  calendarCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.softBorder,
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  calendarNavText: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },

  calendarMonthText: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },

  calendarHint: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  calendarWeekLabel: {
    flex: 1,
    textAlign: "center",
    color: colors.subtext,
    fontSize: 12,
    fontWeight: "700",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  calendarDay: {
    width: "13.4%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 6,
  },

  calendarDayMuted: {
    opacity: 0.55,
  },

  calendarDayDisabled: {
    opacity: 0.55,
  },

  calendarDayBlocked: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },

  calendarDayInRange: {
    backgroundColor: colors.accentSoft,
  },

  calendarDaySelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  calendarDayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },

  calendarDayTextMuted: {
    color: colors.subtext,
  },

  calendarDayTextBlocked: {
    color: colors.danger,
  },

  calendarDayTextSelected: {
    color: colors.white,
  },

  calendarBlockedDot: {
    position: "absolute",
    bottom: 7,
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.danger,
  },

  calendarLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 8,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },

  legendSwatchSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  legendSwatchRange: {
    backgroundColor: colors.accentSoft,
    borderColor: "#F6AD55",
  },

  legendSwatchBlocked: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },

  legendText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: "600",
  },

  summaryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  summaryChip: {
    flex: 1,
    minWidth: "31%",
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    padding: 12,
  },

  summaryChipLabel: {
    color: colors.subtext,
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },

  summaryChipValue: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
});

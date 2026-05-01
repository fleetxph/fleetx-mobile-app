import { StyleSheet, Platform } from "react-native";
import { colors } from "../theme/colors";

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },

  header: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  headerSide: {
    width: 64,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerSideRight: {
    width: 64,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748B",
  },

  exitText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 34,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 28,
  },

  stepWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },

  stepItem: {
    minWidth: 66,
    alignItems: "center",
  },

  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#D7DCE5",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  stepCircleActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },

  stepCircleDone: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },

  stepCircleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
  },

  stepCircleTextActive: {
    color: "#FFFFFF",
  },

  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A0AEC0",
    textAlign: "center",
  },

  stepLabelActive: {
    color: "#F97316",
  },

  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#DFE5EE",
    marginTop: 16,
    marginHorizontal: 8,
  },

  stepLineActive: {
    backgroundColor: "#F97316",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  cardSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: "#64748B",
    marginBottom: 22,
  },

  tripTypeGrid: {
    gap: 14,
  },

  tripTypeCard: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FFFFFF",
  },

  tripTypeCardActive: {
    borderColor: "#F97316",
    backgroundColor: "#FFF8EF",
  },

  tripTypeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  tripTypeIconBoxActive: {
    backgroundColor: "#F97316",
  },

  tripTypeTitle: {
    fontSize: 17,
    color: "#0F172A",
    fontWeight: "800",
    marginBottom: 8,
  },

  tripTypeDesc: {
    color: "#64748B",
    lineHeight: 23,
    fontSize: 14,
    marginBottom: 12,
  },

  tripTypeSmall: {
    color: "#F97316",
    fontSize: 13,
    fontWeight: "600",
  },

  infoNote: {
    marginTop: 18,
    backgroundColor: "#EDF4FF",
    borderWidth: 1,
    borderColor: "#C7DDFF",
    borderRadius: 16,
    padding: 14,
  },

  infoNoteText: {
    color: "#2563EB",
    fontSize: 14,
    lineHeight: 22,
  },

  uploadSection: {
    marginTop: 22,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  uploadHeader: {
    gap: 10,
    marginBottom: 10,
  },

  uploadTitle: {
    fontSize: 18,
    color: "#0F172A",
    fontWeight: "800",
  },

  uploadBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  uploadBadgeText: {
    color: "#F97316",
    fontSize: 12,
    fontWeight: "700",
  },

  uploadDescription: {
    color: "#64748B",
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 14,
  },

  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    padding: 22,
  },

  uploadEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },

  uploadCircle: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  uploadEmptyTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },

  uploadEmptySub: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    fontSize: 13,
  },

  uploadFilled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  uploadSuccess: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  uploadFileInfo: {
    flex: 1,
  },

  uploadFileName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },

  uploadFileSize: {
    color: "#64748B",
    fontSize: 13,
  },

  uploadActions: {
    marginTop: 12,
    alignItems: "flex-end",
  },

  removeFileBtn: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF1F2",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  removeFileBtnText: {
    color: "#DC2626",
    fontWeight: "600",
  },

  errorText: {
    marginTop: 10,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },

  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  formGroupHalf: {
    flex: 1,
  },

  formGroupFull: {
    marginBottom: 16,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  inputIconWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBE2EA",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 52,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingLeft: 10,
    minHeight: Platform.OS === "ios" ? 44 : 48,
  },

  inputPlain: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#DBE2EA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },

  chip: {
    borderWidth: 1,
    borderColor: "#DBE2EA",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  chipActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },

  chipText: {
    color: "#64748B",
    fontSize: 13,
  },

  chipTextActive: {
    color: "#FFFFFF",
  },

  locationList: {
    gap: 10,
  },

  locationOption: {
    borderWidth: 1,
    borderColor: "#DBE2EA",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  locationOptionActive: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },

  locationOptionText: {
    color: "#334155",
    fontWeight: "600",
  },

  locationOptionTextActive: {
    color: "#F97316",
  },

  durationBox: {
    marginTop: 6,
    backgroundColor: "#EAF7EE",
    borderWidth: 1,
    borderColor: "#CFE9D7",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  durationCheck: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  durationText: {
    color: "#15803D",
    fontWeight: "600",
    flex: 1,
  },

  prefSection: {
    marginBottom: 24,
  },

  prefSectionLast: {
    marginBottom: 0,
  },

  prefHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  prefHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  prefHeaderValue: {
    color: "#F97316",
    fontWeight: "800",
    fontSize: 16,
  },

  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D6DBE4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  circleBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#334155",
  },

  controlCenter: {
    flex: 1,
  },

  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#F97316",
  },

  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  rangeLabelText: {
    color: "#94A3B8",
    fontSize: 12,
  },

  luggageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  luggageBtn: {
    width: "18%",
    minWidth: 56,
    minHeight: 68,
    borderWidth: 1,
    borderColor: "#DBE2EA",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  luggageBtnActive: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },

  luggageIcon: {
    fontSize: 17,
  },

  luggageText: {
    color: "#64748B",
    fontWeight: "600",
  },

  luggageTextActive: {
    color: "#F97316",
  },

  transmissionGrid: {
    gap: 10,
  },

  transmissionBtn: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DBE2EA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  transmissionBtnActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },

  transmissionBtnText: {
    color: "#334155",
    fontWeight: "700",
  },

  transmissionBtnTextActive: {
    color: "#FFFFFF",
  },

  purposeGrid: {
    gap: 10,
  },

  purposeBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DBE2EA",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  purposeBtnActive: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },

  purposeBtnText: {
    color: "#334155",
    fontWeight: "600",
  },

  purposeBtnTextActive: {
    color: "#F97316",
  },

  reviewList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  reviewRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  reviewRowAltOne: {
    backgroundColor: "#F8FAFC",
  },

  reviewRowAltTwo: {
    backgroundColor: "#FFFFFF",
  },

  reviewLabel: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },

  reviewValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },

  readyBox: {
    marginTop: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 14,
    padding: 14,
  },

  readyBoxTitle: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "800",
    color: "#9A3412",
  },

  readyBoxText: {
    fontSize: 13,
    lineHeight: 21,
    color: "#C2410C",
  },

  footer: {
    marginTop: 24,
    gap: 14,
  },

  footerBtnBack: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#1F2937",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  footerBtnBackDisabled: {
    borderColor: "#D1D5DB",
  },

  footerBtnBackText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
  },

  footerBtnBackTextDisabled: {
    color: "#9CA3AF",
  },

  footerStepText: {
    color: "#9AA5B1",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },

  footerBtnNext: {
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },

  footerBtnNextText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  inputPlainText: {
  color: "#0F172A",
  fontSize: 14,
},

inputPlainPlaceholder: {
  color: "#94A3B8",
  fontSize: 14,
},
});
import { Platform, StatusBar, StyleSheet } from "react-native";

export const authColors = {
  primary: "#0B132B",
  primaryDeep: "#111827",
  accent: "#F28C28",
  accentSoft: "#FFF4E8",
  background: "#F5F6F8",
  card: "#FFFFFF",
  inputBg: "#FBFCFE",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  danger: "#EF4444",
  success: "#16A34A",
  white: "#FFFFFF",
};

const shadow = Platform.select({
  ios: {
    shadowColor: "#0B132B",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
  },
  android: {
    elevation: 8,
  },
  default: {
    shadowColor: "#0B132B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 28,
  },

  scrollContentTop: {
    flexGrow: 1,
    paddingTop: 28,
    paddingBottom: 80,
  },

  topGlow: {
    position: "absolute",
    top: -72,
    right: -76,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#FFE1BD",
    opacity: 0.72,
  },

  bottomCurve: {
    position: "absolute",
    left: -84,
    bottom: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: authColors.primary,
    opacity: 0.08,
  },

  brandArea: {
    alignItems: "center",
    marginBottom: 18,
  },

  logoWrapper: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: authColors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...shadow,
  },

  logoBox: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  logoImage: {
    width: 62,
    height: 62,
    resizeMode: "contain",
  },

  brandName: {
    color: authColors.primary,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
  },

  brandTagline: {
    color: authColors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },

  card: {
    backgroundColor: authColors.card,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: "rgba(229,231,235,0.78)",
    ...shadow,
  },

  compactCard: {
    minHeight: 0,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: authColors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  iconHero: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: authColors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: authColors.text,
    marginBottom: 8,
    letterSpacing: 0,
  },

  titleCenter: {
    fontSize: 26,
    fontWeight: "900",
    color: authColors.text,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 0,
  },

  subtitle: {
    fontSize: 14,
    color: authColors.muted,
    lineHeight: 22,
    marginBottom: 24,
  },

  subtitleCenter: {
    fontSize: 14,
    color: authColors.muted,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: "center",
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: authColors.text,
    marginBottom: 9,
    marginTop: 4,
  },

  input: {
    backgroundColor: authColors.inputBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: authColors.border,
    paddingHorizontal: 16,
    height: 56,
    color: authColors.text,
    fontSize: 15,
    marginBottom: 15,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: authColors.inputBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: authColors.border,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 15,
  },

  inputWrapperFocused: {
    borderColor: authColors.accent,
    backgroundColor: authColors.white,
  },

  inputWrapperError: {
    borderColor: authColors.danger,
  },

  leftIcon: {
    marginRight: 10,
  },

  inputWithIcon: {
    flex: 1,
    fontSize: 15,
    color: authColors.text,
    paddingVertical: 0,
  },

  forgotPasswordWrap: {
    alignSelf: "flex-end",
    marginTop: 0,
    marginBottom: 22,
    minHeight: 32,
    justifyContent: "center",
  },

  forgotPassword: {
    fontSize: 14,
    fontWeight: "900",
    color: authColors.accent,
  },

  button: {
    backgroundColor: authColors.primary,
    borderRadius: 20,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: authColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },

  buttonText: {
    color: authColors.white,
    fontWeight: "900",
    fontSize: 16,
  },

  buttonDisabled: {
    backgroundColor: "#D7DCE4",
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonTextDisabled: {
    color: "#8A94A6",
  },

  secondaryButton: {
    backgroundColor: authColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },

  secondaryButtonText: {
    color: authColors.primary,
    fontWeight: "800",
    fontSize: 14,
  },

  linkRow: {
    marginTop: 16,
    alignItems: "center",
  },

  linkText: {
    color: authColors.muted,
    fontSize: 14,
  },

  linkAction: {
    color: authColors.accent,
    fontWeight: "900",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    flexWrap: "wrap",
  },

  bottomText: {
    fontSize: 14,
    color: authColors.muted,
    fontWeight: "600",
  },

  registerText: {
    fontSize: 14,
    fontWeight: "900",
    color: authColors.accent,
  },

  trustText: {
    color: authColors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 18,
  },

  message: {
    marginTop: 16,
    textAlign: "center",
    color: authColors.danger,
    fontSize: 13,
    lineHeight: 18,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  errorText: {
    color: authColors.danger,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },

  strengthWrap: {
    marginTop: -4,
    marginBottom: 16,
  },

  strengthBarBg: {
    height: 7,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  strengthBarFill: {
    height: "100%",
    borderRadius: 999,
  },

  strengthText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: "800",
  },

  otpIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: authColors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  otpTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: authColors.text,
    textAlign: "center",
    marginBottom: 8,
  },

  otpSubtitle: {
    fontSize: 14,
    color: authColors.muted,
    textAlign: "center",
    lineHeight: 21,
  },

  otpEmail: {
    fontSize: 15,
    fontWeight: "900",
    color: authColors.primary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 22,
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
    marginBottom: 18,
  },

  otpInput: {
    flex: 1,
    maxWidth: 48,
    height: 50,
    borderRadius: 16,
    backgroundColor: authColors.inputBg,
    borderWidth: 1,
    borderColor: authColors.border,
    fontSize: 20,
    fontWeight: "900",
    color: authColors.primary,
  },

  otpInputOrange: {
    flex: 1,
    maxWidth: 48,
    height: 50,
    borderRadius: 16,
    backgroundColor: authColors.accentSoft,
    borderWidth: 2,
    borderColor: authColors.accent,
    fontSize: 20,
    fontWeight: "900",
    color: authColors.accent,
  },

  timerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 22,
  },

  timerText: {
    fontSize: 13,
    color: authColors.muted,
    fontWeight: "700",
  },

  resendLabel: {
    textAlign: "center",
    color: authColors.muted,
    fontSize: 14,
    marginTop: 18,
    marginBottom: 8,
    fontWeight: "600",
  },

  resendButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    marginBottom: 18,
  },

  resendText: {
    color: authColors.accent,
    fontSize: 14,
    fontWeight: "900",
  },

  resendTimerText: {
    textAlign: "center",
    color: authColors.muted,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "700",
  },

  disabledResendText: {
    color: "#98A2B3",
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: authColors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 4,
  },

  statusIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: authColors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  statusTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: authColors.text,
    marginBottom: 2,
  },

  statusSubtitle: {
    fontSize: 12,
    color: authColors.accent,
    fontWeight: "800",
  },

  successIconWrapGreen: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },

  infoCardBlue: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },

  infoIconWrapBlue: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  infoCardTitleBlue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2563EB",
    marginBottom: 2,
  },

  infoCardTextBlue: {
    fontSize: 13,
    lineHeight: 20,
    color: "#2563EB",
    fontWeight: "600",
  },

  infoCardYellow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },

  infoIconWrapYellow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  infoCardTextYellow: {
    fontSize: 13,
    lineHeight: 20,
    color: "#B45309",
    fontWeight: "600",
  },

  boldText: {
    fontWeight: "900",
  },

  textOnlyButton: {
    marginTop: 20,
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
  },

  textOnlyButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: authColors.accent,
  },

  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
  },

  noticeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: authColors.accentSoft,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: authColors.text,
    marginBottom: 4,
  },

  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: authColors.muted,
    fontWeight: "600",
  },

  passwordRulesCard: {
    backgroundColor: authColors.accentSoft,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },

  passwordRulesTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#C2410C",
    marginBottom: 8,
  },

  passwordRuleItem: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A3412",
    marginBottom: 5,
  },

  redirectText: {
    marginTop: 18,
    textAlign: "center",
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },

  passwordStrengthBox: {
    marginTop: -4,
    marginBottom: 14,
  },

  passwordStrengthTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  passwordStrengthLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: authColors.muted,
  },

  passwordStrengthValue: {
    fontSize: 12,
    fontWeight: "900",
  },

  passwordStrengthTrack: {
    height: 7,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  passwordStrengthFill: {
    height: "100%",
    borderRadius: 999,
  },

  passwordGuideBox: {
    backgroundColor: authColors.accentSoft,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },

  passwordGuideTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#C2410C",
    marginBottom: 8,
  },

  passwordGuideText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    marginBottom: 5,
  },

  passwordGuideTextPassed: {
    color: authColors.success,
  },
});

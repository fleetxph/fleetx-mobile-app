import { Platform, StatusBar, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export const authColors = {
  primary: colors.primary,
  primaryDeep: colors.primaryNight,
  accent: colors.accent,
  accentGold: colors.accentGold,
  accentSoft: colors.accentSoft,
  background: "#EEF1F5",
  card: colors.white,
  inputBg: "#F8FAFC",
  text: colors.text,
  muted: colors.subtext,
  border: "#E6EAF0",
  danger: "#EF4444",
  success: "#16A34A",
  white: colors.white,
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
    backgroundColor: authColors.primaryDeep,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 28,
  },

  scrollContentTop: {
    flexGrow: 1,
    paddingBottom: 42,
  },

  topGlow: {
    position: "absolute",
    top: -88,
    right: -52,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(244, 124, 32, 0.2)",
    opacity: 1,
  },

  bottomCurve: {
    position: "absolute",
    left: -92,
    bottom: -110,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "rgba(255,255,255,0.06)",
    opacity: 1,
  },

  authTopSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 30,
  },

  authTopSectionCompact: {
    paddingBottom: 18,
  },

  brandArea: {
    alignItems: "center",
    marginBottom: 28,
  },

  logoWrapper: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
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
    color: authColors.white,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  brandTagline: {
    color: "rgba(248, 250, 252, 0.78)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },

  heroTextBlock: {
    alignItems: "center",
    marginBottom: 4,
  },

  heroEyebrow: {
    color: authColors.accentGold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  heroTitle: {
    color: authColors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },

  heroSubtitle: {
    color: "rgba(248, 250, 252, 0.82)",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },

  cardWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: authColors.card,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(230,234,240,0.92)",
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

  authTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    padding: 5,
    marginBottom: 22,
  },

  authTab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  authTabActive: {
    backgroundColor: authColors.white,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  authTabText: {
    fontSize: 14,
    fontWeight: "800",
    color: authColors.muted,
  },

  authTabTextActive: {
    color: authColors.primary,
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
    fontSize: 28,
    fontWeight: "900",
    color: authColors.text,
    marginBottom: 8,
    letterSpacing: 0,
    textAlign: "center",
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
    marginBottom: 22,
    textAlign: "center",
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
    minHeight: 58,
    marginBottom: 16,
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
    marginBottom: 20,
    minHeight: 32,
    justifyContent: "center",
  },

  forgotPassword: {
    fontSize: 14,
    fontWeight: "900",
    color: authColors.accent,
  },

  button: {
    backgroundColor: authColors.accent,
    borderRadius: 20,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: authColors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
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

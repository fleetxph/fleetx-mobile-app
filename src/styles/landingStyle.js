import { Platform, StatusBar, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },

  slider: {
    ...StyleSheet.absoluteFillObject,
  },

  background: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },

  backgroundImage: {
    opacity: 0.98,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  glowTop: {
    position: "absolute",
    top: -90,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(244, 124, 32, 0.16)",
  },

  glowBottom: {
    position: "absolute",
    left: -70,
    bottom: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(16, 26, 48, 0.4)",
  },

  safeArea: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
    paddingHorizontal: 24,
  },

  contentShell: {
    flex: 1,
    justifyContent: "space-between",
  },

  brandBlock: {
    alignItems: "center",
    paddingTop: 18,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  logoChip: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(230,234,240,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },

  brandLogo: {
    width: 32,
    height: 32,
  },

  brandInlineText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },

  heroSection: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 18,
  },

  textBlock: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },

  headline: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 14,
    paddingHorizontal: 10,
    color: "rgba(248, 250, 252, 0.88)",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },

  paginationDot: {
    borderRadius: 999,
  },

  paginationDotActive: {
    width: 22,
    height: 4,
    backgroundColor: colors.accent,
  },

  paginationDotInactive: {
    width: 22,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  actionBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: 18,
  },

  ctaButton: {
    width: "100%",
    maxWidth: 340,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },

  ctaText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  footerBlock: {
    alignItems: "center",
    paddingBottom: 24,
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 12,
  },

  loginLabel: {
    color: "rgba(248, 250, 252, 0.82)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  loginLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
});

import { StyleSheet } from "react-native";
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
    opacity: 0.96,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 12, 24, 0.52)",
  },

  bottomShade: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: "56%",
    backgroundColor: "rgba(7, 15, 30, 0.3)",
  },

  safeArea: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flex: 1,
    paddingHorizontal: 22,
  },

  contentShell: {
    flex: 1,
    justifyContent: "space-between",
  },

  brandBlock: {
    alignItems: "center",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(230,234,240,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },

  brandLogo: {
    width: 28,
    height: 28,
  },

  brandInlineText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.15,
    textAlign: "center",
  },

  heroSection: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
  },

  textBlock: {
    width: "100%",
    maxWidth: 336,
    alignItems: "center",
    minHeight: 92,
    justifyContent: "flex-end",
  },

  headline: {
    color: colors.white,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 10,
    paddingHorizontal: 8,
    color: "rgba(248, 250, 252, 0.86)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
    textAlign: "center",
  },

  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 7,
  },

  paginationDot: {
    borderRadius: 999,
  },

  paginationDotActive: {
    width: 24,
    height: 5,
    backgroundColor: colors.accent,
  },

  paginationDotInactive: {
    width: 6,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.38)",
  },

  actionBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },

  ctaButton: {
    width: "100%",
    maxWidth: 336,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },

  ctaText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  footerBlock: {
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 4,
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
    fontWeight: "500",
    textAlign: "center",
  },

  loginLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
});

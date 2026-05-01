import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 130,
  },

  profileTop: {
    alignItems: "center",
    paddingTop: 4,
    marginBottom: 26,
  },

  avatarWrap: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 3,
    borderColor: "#fed7aa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },

  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f97316",
  },

  cameraButton: {
    position: "absolute",
    right: -2,
    bottom: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f97316",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 3,
  },

  profileEmail: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 9,
  },

  verifiedBadge: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },

  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  menuItem: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  menuTextWrap: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  menuSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginLeft: 65,
  },

  smallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },

  smallBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },

  smallBadgeNeutral: {
    backgroundColor: "#e2e8f0",
  },

  smallBadgeTextNeutral: {
    color: "#475569",
  },

  smallBadgeWarning: {
    backgroundColor: "#ffedd5",
  },

  smallBadgeTextWarning: {
    color: "#c2410c",
  },

  smallBadgeInfo: {
    backgroundColor: "#dbeafe",
  },

  smallBadgeTextInfo: {
    color: "#1d4ed8",
  },

  smallBadgeSuccess: {
    backgroundColor: "#dcfce7",
  },

  smallBadgeTextSuccess: {
    color: "#15803d",
  },

  smallBadgeDanger: {
    backgroundColor: "#fee2e2",
  },

  smallBadgeTextDanger: {
    color: "#b91c1c",
  },

  verificationCard: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },

  verificationTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  verificationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },

  verificationTextWrap: {
    flex: 1,
  },

  verificationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  verificationSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748b",
  },

  eligibilityPills: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  eligibilityPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  eligibilityPillActive: {
    borderColor: "#fdba74",
    backgroundColor: "#fff7ed",
  },

  eligibilityPillLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },

  eligibilityPillValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },

  eligibilityPillLabelActive: {
    color: "#c2410c",
  },

  eligibilityPillValueActive: {
    color: "#9a3412",
  },

  verificationFooter: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  verificationAction: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f97316",
  },

  signOutButton: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },

  signOutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "700",
    marginTop: 3,
  },

  navTextActive: {
    color: "#f97316",
  },

  planButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    shadowColor: "#f97316",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

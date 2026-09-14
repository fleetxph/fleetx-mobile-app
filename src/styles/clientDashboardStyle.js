import { StyleSheet, Platform, StatusBar } from "react-native";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  contentContainer: {
    paddingTop: 12,
    paddingBottom: 104,
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  logo: {
    width: 136,
    height: 42,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatarButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },

  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#0B132B",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  heroCard: {
    height: 204,
    borderRadius: 22,
    overflow: "hidden",
    marginHorizontal: 0,
    marginBottom: 20,
    backgroundColor: "#111827",
  },
  campaignCard: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED4",
    marginBottom: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.025,
    shadowRadius: 8,
    elevation: 1,
  },
  campaignContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  campaignLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
  },
  campaignLoadingText: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "700",
  },
  campaignColumns: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  campaignLeftColumn: {
    flex: 1.08,
    minWidth: 0,
    paddingRight: 12,
    justifyContent: "center",
  },
  campaignRightColumn: {
    flex: 0.92,
    minWidth: 0,
    paddingLeft: 12,
    justifyContent: "space-between",
  },
  campaignDivider: {
    width: 1,
    backgroundColor: "#E7E1DB",
    marginVertical: 1,
  },
  campaignEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  campaignLabel: {
    alignSelf: "flex-start",
    color: "#EA580C",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDBA74",
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  campaignTitle: {
    color: "#0B132B",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 21,
    marginBottom: 6,
  },
  campaignSubtitle: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
  },
  campaignBadge: {
    alignSelf: "center",
    backgroundColor: "#0B132B",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  campaignBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  campaignCodeBlock: {
    marginBottom: 12,
  },
  campaignCodeLabel: {
    color: "#98A2B3",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: 5,
  },
  campaignCodeValue: {
    color: "#0B132B",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  campaignActions: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 7,
  },
  campaignCodeButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 9,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F97316",
  },
  campaignCodeButtonText: {
    color: "#EA580C",
    fontSize: 10,
    fontWeight: "700",
  },
  campaignButton: {
    flex: 1,
    backgroundColor: "#F97316",
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 9,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  campaignButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  heroBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  heroBackgroundImage: {
    borderRadius: 22,
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.44)",
  },

  heroContent: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },

  heroTitle: {
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "700",
    maxWidth: 280,
  },

  heroSubtitle: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
    marginTop: 7,
    marginBottom: 15,
  },

  planTripButton: {
    alignSelf: "flex-start",
    backgroundColor: "#f97316",
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 15,
    minHeight: 44,
    justifyContent: "center",
  },

  planTripButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  section: {
    marginBottom: 20,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },

  sectionTitleInline: {
    marginBottom: 0,
  },

  seeAllText: {
    color: "#f97316",
    fontSize: 13,
    fontWeight: "600",
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 20,
  },

  typeScrollContent: {
    gap: 11,
    paddingRight: 16,
  },

  typeChip: {
    width: 90,
    minHeight: 114,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f3e2d3",
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },

  typeChipImageWrap: {
    width: "100%",
    height: 66,
    borderRadius: 14,
    backgroundColor: "#fffaf5",
    borderWidth: 1,
    borderColor: "#fed7aa",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    paddingVertical: 4,
    marginBottom: 7,
  },

  typeChipImage: {
    width: "100%",
    height: "100%",
  },

  typeChipFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },

  typeChipFallbackText: {
    color: "#f97316",
    fontSize: 14,
    fontWeight: "700",
  },

  typeItem: {
    alignItems: "center",
    width: "31%",
  },

  typeImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  typeImage: {
    width: "100%",
    height: "100%",
  },

  typeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 16,
  },

  quickAccessRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },

  quickAccessCard: {
    flex: 1,
    borderRadius: 18,
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },

  quickAccessCardDark: {
    backgroundColor: "#111827",
  },

  quickAccessCardLight: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  quickAccessCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  quickIconBoxDark: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  quickIconBoxLight: {
    backgroundColor: "#FFF1E6",
  },

  quickAccessCardDarkText: {
    color: "#ffffff",
  },

  quickAccessCardLightText: {
    color: "#0f172a",
  },

  quickAccessTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },

  featuredRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "stretch",
  },

  featuredScrollContent: {
    gap: 12,
    paddingRight: 18,
    paddingBottom: 4,
  },

  vehicleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8EDF3",
    overflow: "hidden",
    minHeight: 274,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },

  vehicleImage: {
    width: "100%",
    height: 132,
    backgroundColor: "#e5e7eb",
  },

  vehicleImageFallback: {
    width: "100%",
    height: 132,
    backgroundColor: "#0B132B",
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleImageFallbackText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  vehicleCardBody: {
    padding: 13,
  },

  vehicleCategoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ffedd5",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: 110,
  },

  vehicleCategoryText: {
    color: "#f97316",
    fontSize: 11,
    fontWeight: "600",
  },

  vehicleName: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },

  vehicleTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 7,
  },

  vehicleStatus: {
    color: "#15803d",
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "700",
    maxWidth: 96,
  },

  vehicleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  vehicleMetaIcon: {
    fontSize: 12,
    marginRight: 5,
  },

  vehicleMetaText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },

  vehiclePrice: {
    color: "#f97316",
    fontSize: 14,
    fontWeight: "700",
  },

  vehicleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  vehicleButtonText: {
    color: "#ffffff",
    backgroundColor: "#0B132B",
    borderRadius: 11,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "700",
  },

  featuredLoading: {
    minHeight: 120,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  featuredLoadingText: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },

  featuredEmpty: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 18,
  },

  featuredEmptyTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },

  featuredEmptyText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});

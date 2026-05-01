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
    paddingTop: 18,
    paddingBottom: 120,
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  logo: {
    width: 130,
    height: 44,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatarButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
    fontWeight: "900",
  },

  heroCard: {
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    marginHorizontal: 0,
    marginBottom: 30,
    backgroundColor: "#111827",
  },

  heroBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  heroContent: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  heroGreeting: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },

  heroName: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },

  heroSubtitle: {
    color: "#f8fafc",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 20,
  },

  planTripButton: {
    alignSelf: "flex-start",
    backgroundColor: "#f97316",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },

  planTripButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  section: {
    marginBottom: 30,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 16,
  },

  sectionTitleInline: {
    marginBottom: 0,
  },

  seeAllText: {
    color: "#f97316",
    fontSize: 13,
    fontWeight: "800",
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 20,
  },

  typeScrollContent: {
    gap: 12,
    paddingRight: 12,
  },

  typeChip: {
    width: 92,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  typeChipImage: {
    width: 64,
    height: 54,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#f1f5f9",
  },

  typeChipFallback: {
    width: 64,
    height: 54,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },

  typeChipFallbackText: {
    color: "#f97316",
    fontSize: 14,
    fontWeight: "900",
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
    fontWeight: "800",
    color: "#334155",
    textAlign: "center",
  },

  quickAccessRow: {
    flexDirection: "row",
    gap: 14,
  },

  quickAccessCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    minHeight: 112,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  quickAccessCardDark: {
    backgroundColor: "#111827",
  },

  quickAccessCardLight: {
    backgroundColor: "#ffffff",
  },

  quickIconBox: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  quickIconBoxDark: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  quickIconBoxLight: {
    backgroundColor: "#fff7ed",
  },

  quickIconText: {
    fontSize: 20,
  },

  quickAccessCardDarkText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  quickAccessCardLightText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },

  featuredRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "stretch",
  },

  featuredScrollContent: {
    gap: 16,
    paddingRight: 18,
    paddingBottom: 4,
  },

  vehicleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
    minHeight: 286,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },

  vehicleImage: {
    width: "100%",
    height: 138,
    backgroundColor: "#e5e7eb",
  },

  vehicleImageFallback: {
    width: "100%",
    height: 138,
    backgroundColor: "#0B132B",
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleImageFallbackText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },

  vehicleCardBody: {
    padding: 14,
  },

  vehicleCategoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ffedd5",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 8,
    maxWidth: 110,
  },

  vehicleCategoryText: {
    color: "#f97316",
    fontSize: 11,
    fontWeight: "800",
  },

  vehicleName: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
    marginBottom: 8,
  },

  vehicleTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },

  vehicleStatus: {
    color: "#15803d",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900",
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
    marginBottom: 12,
  },

  vehiclePrice: {
    color: "#f97316",
    fontSize: 14,
    fontWeight: "900",
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
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "900",
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
    fontWeight: "800",
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
    fontWeight: "900",
  },

  featuredEmptyText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});

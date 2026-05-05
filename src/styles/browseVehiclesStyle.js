import { Platform, StatusBar, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 10,
  },

  listHeader: {
    paddingTop: 8,
    marginBottom: 10,
  },

  heroHeaderCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F3E3D2",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  heroHeaderGlow: {
    position: "absolute",
    top: -32,
    right: -20,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#FFF0E2",
  },

  heroHeaderAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "#F97316",
  },

  heroHeaderContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  heroHeaderContentStack: {
    flexDirection: "column",
    alignItems: "flex-start",
  },

  heroHeaderTextBlock: {
    flex: 1,
    paddingRight: 4,
    zIndex: 1,
  },

  heroHeaderBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF4E8",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },

  heroHeaderBadgeText: {
    color: "#C2410C",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  header: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.heading || "#0F172A",
    marginBottom: 6,
  },

  headerSubtext: {
    color: "#475467",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: "94%",
  },

  heroVehicleWrap: {
    width: 126,
    height: 106,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  heroVehicleWrapCompact: {
    alignSelf: "stretch",
    width: "100%",
    height: 110,
    marginTop: 6,
  },

  heroVehiclePlate: {
    position: "absolute",
    left: 12,
    bottom: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFE7CF",
  },

  heroVehicleImage: {
    width: "118%",
    height: "108%",
  },

  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F1E4D5",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  searchInputWrapper: {
    minHeight: 56,
    backgroundColor: "#FCFDFE",
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 14,
  },

  filterSortRow: {
    marginBottom: 14,
    gap: 14,
  },

  filterButton: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonText: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },

  sortGroup: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 14,
  },

  sortButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  sortButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  sortButtonText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: "700",
  },

  sortButtonTextSelected: {
    color: colors.white,
  },

  activeFilterArea: {
    gap: 10,
  },

  activeFilterChips: {
    gap: 10,
    paddingRight: 8,
  },

  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  activeFilterChipText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  clearAllInlineButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },

  clearAllInlineButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },

  chip: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  chipTextActive: {
    color: colors.white,
  },

  resultText: {
    fontSize: 14,
    color: "#475467",
    fontWeight: "700",
  },

  resultRow: {
    marginBottom: 18,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  columnWrapper: {
    justifyContent: "space-between",
  },

  card: {
    width: "48.2%",
    backgroundColor: colors.card,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F2E8DE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    minHeight: 286,
  },

  cardAccentBar: {
    height: 5,
    backgroundColor: "#F97316",
  },

  imageWrap: {
    height: 142,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#FFF9F4",
    borderWidth: 1,
    borderColor: "#FDE7CF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: colors.primary || "#0B132B",
    alignItems: "center",
    justifyContent: "center",
  },

  imageFallbackText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },

  cardBody: {
    padding: 14,
    minHeight: 126,
    justifyContent: "space-between",
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft || "#FFF2E8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },

  badgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  cardTextBlock: {
    minHeight: 72,
    marginBottom: 10,
  },

  title: {
    color: colors.heading || colors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    marginBottom: 6,
    minHeight: 42,
  },

  meta: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
  },

  priceRow: {
    minHeight: 24,
    justifyContent: "flex-end",
  },

  price: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "900",
  },

  tripSummaryCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  tripSummaryTitle: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  tripSummaryText: {
    color: "#C2410C",
    fontSize: 13,
    lineHeight: 18,
  },

  emptyStateCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginTop: 10,
    alignItems: "center",
    width: "100%",
  },

  emptyStateButton: {
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },

  loadMoreButton: {
    marginTop: 10,
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: colors.accent,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  loadMoreButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },

  endText: {
    color: colors.subtext,
    fontSize: 13,
    textAlign: "center",
    paddingTop: 14,
    paddingBottom: 22,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.heading || colors.text,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 18,
  },

  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },

  filterSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 12,
    maxHeight: "86%",
  },

  filterSheetHandle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    alignSelf: "center",
    marginBottom: 16,
  },

  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 14,
  },

  filterSheetTitle: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "900",
  },

  filterSheetClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  filterSheetContent: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  filterSection: {
    marginBottom: 18,
  },

  filterSectionTitle: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  filterOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  filterChip: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  filterChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },

  filterChipTextSelected: {
    color: colors.white,
  },

  filterFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.softBorder,
    backgroundColor: colors.card,
  },

  clearFilterButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  clearFilterButtonText: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },

  applyFilterButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  applyFilterButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
});

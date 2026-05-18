import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
    backgroundColor: "#f8fafc",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  filterList: {
    flexGrow: 0,
    height: 52,
    maxHeight: 52,
    marginBottom: 8,
  },

  filterScrollContent: {
    gap: 8,
    paddingRight: 16,
    paddingVertical: 4,
    alignItems: "center",
  },

  viewTabsContent: {
    gap: 10,
    paddingRight: 16,
    paddingVertical: 4,
    alignItems: "center",
  },

  viewTab: {
    minWidth: 110,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  viewTabActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },

  viewTabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
  },

  viewTabTextActive: {
    color: "#ffffff",
  },

  filterButton: {
    height: 38,
    minWidth: 58,
    paddingHorizontal: 14,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2f7",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  activeFilterButton: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  filterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
  },

  activeFilterText: {
    color: "#ffffff",
  },

  listContent: {
    paddingTop: 2,
    paddingBottom: 150,
    flexGrow: 1,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 13,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  carImage: {
    width: 82,
    height: 74,
    borderRadius: 13,
    backgroundColor: "#f1f5f9",
    marginRight: 12,
  },

  carImageFallback: {
    width: 82,
    height: 74,
    borderRadius: 13,
    backgroundColor: "#0B132B",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  carImageFallbackText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },

  cardContent: {
    flex: 1,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  vehicleInfo: {
    flex: 1,
    paddingRight: 8,
  },

  vehicleName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  bookingCode: {
    fontSize: 11,
    color: "#475569",
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },

  approvedBadge: {
    backgroundColor: "#dcfce7",
  },

  statusBadge_progress: {
    backgroundColor: "#dbeafe",
  },

  statusBadge_payment: {
    backgroundColor: "#ffedd5",
  },

  statusBadge_review: {
    backgroundColor: "#fef3c7",
  },

  statusBadge_confirmed: {
    backgroundColor: "#dcfce7",
  },

  statusBadge_completed: {
    backgroundColor: "#f3e8ff",
  },

  statusBadge_cancelled: {
    backgroundColor: "#fee2e2",
  },

  pendingBadge: {
    backgroundColor: "#fef3c7",
  },

  completedBadge: {
    backgroundColor: "#f3e8ff",
  },

  cancelledBadge: {
    backgroundColor: "#fee2e2",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#111827",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  locationText: {
    flex: 1,
    fontSize: 11,
    color: "#475569",
    marginLeft: 3,
  },

  dateText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 5,
  },

  cardFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  totalText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },

  paymentText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
    marginTop: 2,
  },

  paymentVerified: {
    color: "#22c55e",
    fontWeight: "800",
  },

  paymentSubmitted: {
    color: "#f97316",
    fontWeight: "800",
  },

  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 105,
  },

  noteText: {
    fontSize: 10,
    color: "#64748b",
    marginLeft: 3,
  },

  statusSubtext: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
  },

  helperText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  actionButton: {
    flexGrow: 1,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  actionButtonDisabled: {
    opacity: 0.65,
  },

  actionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },

  secondaryActionButton: {
    flexGrow: 1,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fdba74",
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  secondaryActionText: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "900",
  },

  paymentPanel: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
    padding: 12,
  },

  panelTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  panelText: {
    color: "#9a3412",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  referenceInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: "#ffffff",
    color: "#111827",
    paddingHorizontal: 12,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
  },

  checkText: {
    color: "#9a3412",
    fontSize: 11,
    fontWeight: "800",
  },

  cancelLink: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "900",
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#64748b",
    fontWeight: "600",
  },

  emptyBox: {
    alignItems: "center",
    marginTop: 56,
    paddingHorizontal: 18,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 6,
    color: "#64748b",
    textAlign: "center",
  },

  refreshButton: {
    marginTop: 16,
    backgroundColor: "#111827",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 18,
  },

  refreshText: {
    color: "#ffffff",
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

  activeNavText: {
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

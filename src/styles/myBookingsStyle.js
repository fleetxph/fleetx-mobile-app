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
    fontWeight: "700",
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
    height: 44,
    borderRadius: 22,
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
    fontWeight: "600",
    color: "#64748b",
  },

  viewTabTextActive: {
    color: "#ffffff",
  },

  filterButton: {
    height: 44,
    minWidth: 58,
    paddingHorizontal: 14,
    borderRadius: 22,
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
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  filterText: {
    fontSize: 12,
    fontWeight: "600",
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
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8EDF3",
    shadowColor: "#000",
    shadowOpacity: 0.025,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    fontWeight: "700",
  },

  cardSummary: {
    flex: 1,
    minWidth: 0,
  },

  vehicleInfo: {
    minWidth: 0,
  },

  vehicleName: {
    fontSize: 14,
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "600",
  },

  paymentSubmitted: {
    color: "#f97316",
    fontWeight: "600",
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
    flex: 1,
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },

  bookingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    minHeight: 44,
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
    fontWeight: "700",
  },

  secondaryActionButton: {
    flexGrow: 1,
    minHeight: 44,
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
    fontWeight: "700",
  },

  paymentPanel: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
    padding: 12,
  },

  extensionPanel: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    padding: 12,
    gap: 10,
  },

  extensionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  extensionStatusText: {
    flex: 1,
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "700",
  },

  extensionStatusPending: {
    color: "#b45309",
  },

  extensionButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#0369a1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  extensionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  additionalInvoicePanel: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    padding: 12,
  },

  additionalInvoiceTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },

  additionalInvoiceSubtitle: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 8,
  },

  additionalInvoiceRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 7,
  },

  additionalInvoiceLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
  },

  additionalInvoiceValue: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  additionalInvoiceButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 10,
  },

  additionalInvoiceButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  panelTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },

  panelText: {
    color: "#9a3412",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  referenceInput: {
    minHeight: 44,
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
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },

  extensionModalSheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },

  extensionModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  extensionModalHeading: {
    flex: 1,
    paddingRight: 12,
  },

  extensionModalTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "700",
  },

  extensionModalSubtitle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  extensionModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  currentReturnCard: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 14,
  },

  currentReturnValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },

  extensionFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },

  extensionFieldButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  extensionFieldLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },

  extensionFieldValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },

  extensionPickerWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 10,
    marginBottom: 14,
  },

  extensionPickerDone: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  extensionPickerDoneText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "700",
  },

  extensionReasonInput: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 7,
  },

  extensionValidationText: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 8,
  },

  extensionHelperText: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 8,
  },

  extensionModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  extensionModalCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },

  extensionModalCancelText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },

  extensionModalSubmit: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  extensionModalSubmitText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  cancelLink: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "700",
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
    fontWeight: "600",
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
    minHeight: 44,
    justifyContent: "center",
  },

  refreshText: {
    color: "#ffffff",
    fontWeight: "600",
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

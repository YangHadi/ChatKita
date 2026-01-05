// app/sadmin_tabs/styles.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  /** =============================================
   *                   LAYOUT
   * ============================================== */
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  sectionTitle: { fontWeight: "700", fontSize: 18, marginBottom: 12 },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  panelCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  panelTitle: { fontWeight: "700", fontSize: 18, marginBottom: 8 },

  /** =============================================
   *                  COMPONENTS
   * ============================================== */
  /* --- Dashboard Cards --- */
  dashboardCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    flexBasis: "48%",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "visible",
  },
  metricTitle: { fontSize: 14, color: "#555", marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: "700" },

  /* --- Pie Chart & Legends --- */
  pieRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  pieCenter: { position: "absolute", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" },
  pieCenterNumber: { fontSize: 18, fontWeight: "800" },
  pieCenterLabel: { fontSize: 12, color: "#666" },
  legendContainer: { marginLeft: 20, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  pieLegendRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 }, // Kept for backward compatibility if used elsewhere
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { fontSize: 14, fontWeight: "600" },
  barChartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },

  /* --- Bar Chart --- */
  horizontalBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  horizontalBarLabel: { width: '25%', fontSize: 12 },
  horizontalBar: { flex: 1, height: 16, backgroundColor: '#f0f0f0', borderRadius: 8, marginRight: 8 },
  horizontalBarFill: { height: '100%', backgroundColor: '#E74C3C', borderRadius: 8 },
  horizontalBarValue: { fontSize: 12, fontWeight: '600', minWidth: 20, textAlign: 'right' },

  /* --- Progress Bar --- */
  progressBarContainer: { height: 8, backgroundColor: "#EEE", borderRadius: 4, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 4 },

  /** =============================================
   *                    MODULES
   * ============================================== */
  /* --- System Health Module --- */
  healthGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  healthGridItem: { flex: 1, padding: 8, borderRadius: 8, backgroundColor: '#f9f9f9', marginHorizontal: 4 },
  healthStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  healthLabel: { fontSize: 14, fontWeight: "600" },
  healthStatus: { fontSize: 12, color: '#555' },
  healthUsageRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },

  /* --- Violation Breakdown --- */
  violationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  violationLabel: { width: '25%', fontSize: 14, fontWeight: '600' },
  violationBarContainer: { flex: 1, height: 20, backgroundColor: '#eee', borderRadius: 5, marginHorizontal: 8, justifyContent: 'center' },
  violationBar: { height: '100%', borderRadius: 5, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 5 },
  violationCount: { fontSize: 14, fontWeight: '700', minWidth: 25, textAlign: 'right' },
  violationBarText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  /* --- Flagged Users Module --- */
  flaggedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  flaggedItemIcon: { marginRight: 12 },
  flaggedItemContent: { flex: 1 },
  flaggedItemUser: { fontSize: 15, fontWeight: '600' },
  flaggedItemDate: { fontSize: 12, color: '#777' },
  flaggedItemTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  flaggedItemTagText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  emptyStateText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#888',
    fontSize: 14,
  },

  /* --- User List Module --- */
  userListContainer: { flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#f5f5f5" },
  userListControls: { flexDirection: "row", marginBottom: 12, gap: 8 },
  userListBulkActions: { flexDirection: "row", marginBottom: 12, gap: 8, alignItems: 'center' },
  bulkActionButton: { flexDirection: 'row', padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center", flex: 1 },
  bulkActionButtonText: { color: "#fff", fontWeight: "700" },
  cancelBulkActionButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e0e0e0' },
  cancelBulkActionButtonText: { color: '#555', fontWeight: '600' },
  clearSearchButton: { position: "absolute", right: 8, top: 0, bottom: 0, justifyContent: 'center', padding: 4 },
  searchInput: {
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    flex: 1,
  },
  sortButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 100, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#4A90E2", borderRadius: 8, gap: 6 },
  sortButtonText: { color: "#fff", fontWeight: "700" },
  emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyListText: { fontSize: 16, color: '#888' },  userCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 2, // Add a permanent border width
    borderColor: 'transparent', // Make it transparent by default
    overflow: "hidden",
  },
  floatingIconsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    zIndex: 50,
    backgroundColor: '#f8f9fa', // A very light grey to lift it off the main background
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  miniFloatingButton: { flex: 1, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  scrollToTopButton: { position: 'absolute', bottom: 20, right: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, zIndex: 100 },
  userStatus: { fontSize: 12 },
  userCardBadge: { backgroundColor: "#E74C3C", borderRadius: 6, paddingHorizontal: 4, marginLeft: 4 },
  userCardBadgeText: { color: "#fff", fontSize: 10 },

  /* --- Reports Module --- */
  reportsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  rangeSelectorContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    alignItems: 'center',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rangeButton: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeButtonActive: { backgroundColor: "#4A90E2", elevation: 2, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  rangeText: { fontWeight: "600", color: "#333" },
  rangeTextActive: { color: "#fff" },
  downloadButton: {
    backgroundColor: "#4A90E2",
    padding: 10,
    borderRadius: 8,
  },
  reportSummary: { fontSize: 14, color: '#555', marginBottom: 16, paddingHorizontal: 4 },

  /* --- Modal --- */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "90%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalCloseBtn: { position: "absolute", top: 8, right: 8, justifyContent: "center", alignItems: "center" },
  modalHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 12 },
  modalUserName: { fontSize: 20, fontWeight: 'bold' },
  modalStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4 },
  modalStatusBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  modalButton: { flexDirection: 'row', flex: 1, padding: 12, borderRadius: 8, justifyContent: "center", alignItems: "center", gap: 8 },
  modalButtonText: { color: "#fff", fontWeight: "700" },
  modalInfoGrid: { marginBottom: 16 },
  modalGridRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalGridTitle: { fontWeight: "600" },
  modalGridValue: { color: "#555" },
  modalSection: { marginTop: 8 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  modalListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 6, marginBottom: 6 },
  modalListItemText: { fontSize: 14, color: '#333' },
  modalActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16, marginTop: 8 },
  listOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  durationSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  durationButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', marginHorizontal: 4 },
  durationButtonSelected: { backgroundColor: '#4A90E2', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  durationButtonText: { fontWeight: '600', color: '#333', fontSize: 12 },
  durationButtonTextSelected: { color: '#fff' },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    fontSize: 14,
  },

  /* --- Custom Alert --- */
  alertBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  alertContainer: { width: '85%', backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  alertTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  alertMessage: { fontSize: 15, color: '#333', marginBottom: 20, lineHeight: 22 },
  alertButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  alertButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  alertButtonDefault: { backgroundColor: '#4A90E2' },
  alertButtonCancel: { backgroundColor: '#e0e0e0' },
  alertButtonDestructive: { backgroundColor: '#E74C3C' },
  alertButtonTextDefault: { color: 'white', fontWeight: 'bold' },
  alertButtonTextCancel: { color: '#333', fontWeight: 'bold' },
  alertButtonTextDestructive: { color: 'white', fontWeight: 'bold' },

  trashButton: { padding: 4 },
});

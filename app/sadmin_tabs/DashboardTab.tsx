// app/sadmin_tabs/DashboardTab.tsx
import React, { memo, useEffect, useReducer, useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, ViewStyle, ActivityIndicator, StyleSheet, TextStyle, TextInput, RefreshControl, GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, FadeIn, FadeOut, Easing, cancelAnimation } from "react-native-reanimated";
import { styles } from "../../lib/sadmin_tabs/styles";
import { Screening, Violation, parseStatus, getUsageColor, STATUS_COLORS, useDashboardContext, MOCK_DATA } from "../../lib/sadmin_tabs/common";
import axios from "axios";
import { API_BASE_URL } from "../../lib/apiConfig";
import { useNavigation } from "@react-navigation/native";
import { PanelCard, SummaryCard, SvgPieChart } from "../../lib/sadmin_tabs/SharedComponents";
import { DashboardSkeleton } from "../../lib/sadmin_tabs/SkeletonLoader";

// --- Reusable UI Components --- //

const ProgressBar: React.FC<{ progress: number; color: string }> = memo(({ progress, color }) => {
  const width = `${Math.max(0, Math.min(100, progress))}%` as ViewStyle["width"];

  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width, backgroundColor: color }]} />
    </View>
  );
});

const LogDetailItem: React.FC<{ label: string; value: string | undefined; valueStyle?: TextStyle }> = memo(({ label, value, valueStyle }) => {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
      <Text style={{ width: 80, color: '#666', fontWeight: '500' }}>{label}:</Text>
      <Text style={[{ flex: 1, color: '#333' }, valueStyle]}>{value}</Text>
    </View>
  );
});

const localStyles = StyleSheet.create({
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  quickActionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
});

const QuickActions: React.FC<{ onUsersPress: () => void; onReportsPress: () => void; onLogsPress: () => void; }> = memo(({ onUsersPress, onReportsPress, onLogsPress }) => (
  <View style={localStyles.quickActionsContainer}>
    <TouchableOpacity style={localStyles.quickActionBtn} onPress={onUsersPress}>
      <View style={[localStyles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
        <Ionicons name="people" size={24} color="#4A90E2" />
      </View>
      <Text style={localStyles.quickActionText}>Manage Users</Text>
    </TouchableOpacity>
    <TouchableOpacity style={localStyles.quickActionBtn} onPress={onReportsPress}>
      <View style={[localStyles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
        <Ionicons name="bar-chart" size={24} color="#2ECC71" />
      </View>
      <Text style={localStyles.quickActionText}>View Reports</Text>
    </TouchableOpacity>
    <TouchableOpacity style={localStyles.quickActionBtn} onPress={onLogsPress}>
      <View style={[localStyles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
        <Ionicons name="clipboard" size={24} color="#F39C12" />
      </View>
      <Text style={localStyles.quickActionText}>Audit Logs</Text>
    </TouchableOpacity>
  </View>
));

const getTimeAgo = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const now = new Date();
  const past = new Date(dateStr.replace(" ", "T")); // Ensure ISO format parsing
  if (isNaN(past.getTime())) return 'Invalid date';

  const diffSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (diffSeconds < 10) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMins = Math.floor(diffSeconds / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
};

/* -------------------------- DashboardTab -------------------------- */
interface ExtendedHealth {
  backend: string;
  myphp: string;
  database: string;
  cpu: number;
  memory: number;
  disk: number;
  dbLatency: number;
  msgsPerMin: number;
  avgMsgSize: number;
}

const DashboardTab: React.FC = memo(() => {
  const { metrics, screenings, users } = useDashboardContext();
  const navigation = useNavigation<any>();
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activityTab, setActivityTab] = useState<'newUsers' | 'adminActions' | 'flaggedActivity'>('newUsers');
  const [modalType, setModalType] = useState<"screenings" | "violations" | null>(null);
  const [reviewed, dispatchReviewed] = useReducer(
    (state: { screenings: boolean; violations: boolean }, action: "view_screenings" | "view_violations" | "reset_screenings" | "reset_violations") => {
      switch (action) {
        case "view_screenings": return { ...state, screenings: true };
        case "view_violations": return { ...state, violations: true };
        case "reset_screenings": return { ...state, screenings: false };
        case "reset_violations": return { ...state, violations: false };
        default: return state;
      }
    },
    { screenings: false, violations: false }
  );

  useEffect(() => {
    if (metrics.screeningsToday > 0 && reviewed.screenings) dispatchReviewed("reset_screenings");
  }, [metrics.screeningsToday, reviewed.screenings]);

  useEffect(() => {
    if (metrics.violationsToday > 0 && reviewed.violations) dispatchReviewed("reset_violations");
  }, [metrics.violationsToday, reviewed.violations]);

  const [health, setHealth] = useState<ExtendedHealth>({ backend: "Checking...", myphp: "Checking...", database: "Checking...", cpu: 0, memory: 0, disk: 0, dbLatency: 0, msgsPerMin: 0, avgMsgSize: 0 });

  const refreshRotation = useSharedValue(0);
  const animatedRefreshStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  const fetchHealth = useCallback(async () => {
    refreshRotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    try {
      const res = await axios.get(`${API_BASE_URL}/dashboard.php`);
      if (res.data && res.data.success) {
        setHealth({
          backend: "Connected",
          myphp: "Running",
          database: res.data.database === "OK" ? "OK" : "Down",
          cpu: res.data.cpu || 0,
          memory: res.data.memory || 0,
          disk: res.data.disk || 0,
          dbLatency: res.data.db_latency || 0,
          msgsPerMin: res.data.msgs_per_min || 0,
          avgMsgSize: res.data.avg_msg_size || 0
        });
      }
    } catch (error) {
      // If the request fails, the backend is likely down
      setHealth(prev => ({ ...prev, backend: "Disconnected", myphp: "Stopped", database: "Unknown" }));
    } finally {
      cancelAnimation(refreshRotation);
      refreshRotation.value = 0;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchHealth, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // --- New Registered Users Logic ---
  const [newUsers, setNewUsers] = useState<any[]>([]);
  
  const fetchNewUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users.php?fetch_recent_users=1&limit=5`);
      if (res.data.success) {
        setNewUsers(res.data.users);
      }
    } catch (e) {
      console.error("Failed to fetch new users", e);
    }
  }, []);

  // --- Recent Admin Logs Logic ---
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [fullLogs, setFullLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = useCallback(async (limit = 5, targetSetter = setRecentLogs) => {
    try {
      if (limit > 5) setLoadingLogs(true);
      const res = await axios.get(`${API_BASE_URL}/users.php?fetch_recent_logs=1&limit=${limit}`);
      if (res.data.success) {
        targetSetter(res.data.logs);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      if (limit > 5) setLoadingLogs(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHealth(), fetchLogs(5, setRecentLogs), fetchNewUsers()]);
    setIsRefreshing(false);
  }, [fetchHealth, fetchLogs, fetchNewUsers]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchHealth(), fetchLogs(5, setRecentLogs), fetchNewUsers()]);
      setIsLoading(false);
    };
    init();

    // Keep polling for health status
    const interval = setInterval(() => {
      fetchLogs(5, setRecentLogs);
      fetchNewUsers();
    }, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchLogs, fetchNewUsers, fetchHealth]);

  const onLogsPress = useCallback(() => { setLogsModalVisible(true); fetchLogs(50, setFullLogs); }, [fetchLogs]);
  const onUsersPress = useCallback(() => navigation.navigate("Users"), [navigation]);
  const onReportsPress = useCallback(() => navigation.navigate("Reports"), [navigation]);

  const liveActiveUsers = useMemo(() => users.filter(u => u.status === 'active').length, [users]);
  const liveSuspendedUsers = useMemo(() => users.filter(u => u.status === 'suspended').length, [users]);

  const healthItems = useMemo(() => [
    { label: "Backend", value: health.backend }, 
    { label: "Database", value: health.database }, 
    { label: "DB Latency", value: `${health.dbLatency}ms` }
  ], [health.backend, health.database, health.dbLatency]);
  
  const recentFlagged = useMemo(() => MOCK_DATA.violations.slice(-5).reverse(), []);

  const filteredLogs = useMemo(() => fullLogs.filter(log => {
    const searchTerm = logSearchTerm.toLowerCase();
    const matchesSearch = !logSearchTerm || (
      (log.admin_name || '').toLowerCase().includes(searchTerm) ||
      (log.action || '').toLowerCase().includes(searchTerm) ||
      (log.target_name || '').toLowerCase().includes(searchTerm) ||
      (log.reason || '').toLowerCase().includes(searchTerm) ||
      (log.created_at || '').toLowerCase().includes(searchTerm)
    );

    if (!matchesSearch) return false;

    const logTime = new Date(log.created_at.replace(" ", "T")).getTime();
    if (logStartDate) {
      const startTime = new Date(logStartDate).getTime();
      if (!isNaN(startTime) && logTime < startTime) return false;
    }
    if (logEndDate) {
      const endDate = new Date(logEndDate);
      endDate.setHours(23, 59, 59, 999);
      const endTime = endDate.getTime();
      if (!isNaN(endTime) && logTime > endTime) return false;
    }
    return true;
  }), [fullLogs, logSearchTerm, logStartDate, logEndDate]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.panelCard, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0, padding: 0 }]}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Live Metrics</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <SummaryCard icon="checkmark-circle-outline" color="#44bd32" textColor="#fff" title="Active Users" value={liveActiveUsers} onPress={() => navigation.navigate("Users", { filter: "active" })} />
          <SummaryCard icon="ban-outline" color="#E74C3C" textColor="#fff" title="Suspended" value={liveSuspendedUsers} onPress={() => navigation.navigate("Users", { filter: "suspended" })} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <SummaryCard title="Msgs/min" value={health.msgsPerMin} icon="speedometer-outline" color="#fff" textColor="#333" />
          <SummaryCard title="Avg Msg Size" value={`${health.avgMsgSize} B`} icon="document-text-outline" color="#fff" textColor="#333" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SummaryCard title="Screenings Today" value={metrics.screeningsToday} icon="shield-checkmark-outline" color="#FFF3E0" textColor="#F39C12" onPress={() => { setModalType("screenings"); dispatchReviewed("view_screenings"); }} badgeVisible={!reviewed.screenings && metrics.screeningsToday > 0} />
          <SummaryCard title="Violations Today" value={metrics.violationsToday} icon="alert-circle-outline" color="#FDEDEC" textColor="#E74C3C" onPress={() => { setModalType("violations"); dispatchReviewed("view_violations"); }} badgeVisible={!reviewed.violations && metrics.violationsToday > 0} />
        </View>
      </View>

      <QuickActions onUsersPress={onUsersPress} onReportsPress={onReportsPress} onLogsPress={onLogsPress} />

      <Modal transparent visible={!!modalType} animationType="fade" onRequestClose={() => setModalType(null)}>
        <TouchableWithoutFeedback onPress={(e: GestureResponderEvent) => e.target === e.currentTarget && setModalType(null)}>
          <View style={styles.modalBackdrop}>
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalContent}>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.modalCloseBtn}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
              <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 12 }}>{modalType === "screenings" ? "Screenings Today" : "Violations Today"}</Text>              <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {(modalType === "screenings" ? screenings : MOCK_DATA.violations).map((item, idx) => (
                  <View key={idx} style={{ backgroundColor: modalType === "violations" ? "#FDEDEC" : "#FFF3E0", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: modalType === "violations" ? "#E74C3C" : "#F39C12" }}>
                    <Text style={{ fontWeight: "600" }}>{item.userName}</Text>
                    <Text style={{ fontSize: 12, color: "#555" }}>{modalType === "screenings" ? `Type: ${(item as Screening).type} | Result: ${(item as Screening).result}` : `Type: ${(item as Violation).type} | Date: ${(item as Violation).date}`}</Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <PanelCard title="System Health" onPress={fetchHealth} headerRight={<Animated.View style={animatedRefreshStyle}><Ionicons name="refresh" size={20} color="#4A90E2" /></Animated.View>}>
        <View style={styles.healthGrid}>
          {healthItems.map((item, index) => {
            const status = parseStatus(item.value);
            return (
              <View key={index} style={styles.healthGridItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}><View style={[styles.healthStatusDot, { backgroundColor: STATUS_COLORS[status.key] }]} /><Text style={styles.healthLabel}>{item.label}</Text></View>
                <Text style={styles.healthStatus} numberOfLines={1}>{status.label}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ marginTop: 16 }}><View style={styles.healthUsageRow}><Text style={styles.healthLabel}>CPU Usage</Text><Text style={{ color: getUsageColor(Number(health.cpu)), fontWeight: '600' }}>{health.cpu}%</Text></View><ProgressBar progress={Number(health.cpu)} color={getUsageColor(Number(health.cpu))} /></View>
        <View style={{ marginTop: 12 }}><View style={styles.healthUsageRow}><Text style={styles.healthLabel}>Memory Usage</Text><Text style={{ color: getUsageColor(Number(health.memory)), fontWeight: '600' }}>{health.memory}%</Text></View><ProgressBar progress={Number(health.memory)} color={getUsageColor(Number(health.memory))} /></View>
        <View style={{ marginTop: 12 }}><View style={styles.healthUsageRow}><Text style={styles.healthLabel}>Disk Usage</Text><Text style={{ color: getUsageColor(Number(health.disk)), fontWeight: '600' }}>{health.disk}%</Text></View><ProgressBar progress={Number(health.disk)} color={getUsageColor(Number(health.disk))} /></View>
      </PanelCard>

      <PanelCard title="Live Activity">
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => setActivityTab('newUsers')} style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: activityTab === 'newUsers' ? '#4A90E2' : 'transparent' }}>
            <Text style={{ textAlign: 'center', fontWeight: '600', color: activityTab === 'newUsers' ? '#4A90E2' : '#999' }}>New Users</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActivityTab('adminActions')} style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: activityTab === 'adminActions' ? '#4A90E2' : 'transparent' }}>
            <Text style={{ textAlign: 'center', fontWeight: '600', color: activityTab === 'adminActions' ? '#4A90E2' : '#999' }}>Admin Actions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActivityTab('flaggedActivity')} style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: activityTab === 'flaggedActivity' ? '#4A90E2' : 'transparent' }}>
            <Text style={{ textAlign: 'center', fontWeight: '600', color: activityTab === 'flaggedActivity' ? '#4A90E2' : '#999' }}>Flagged</Text>
          </TouchableOpacity>
        </View>

        <View style={{ minHeight: 300 }}>
          {activityTab === 'newUsers' && (
            newUsers.length > 0 ? (
              newUsers.map((user, index) => (                <TouchableOpacity key={user.id || index} style={[styles.flaggedItem, index === newUsers.length - 1 && { borderBottomWidth: 0 }]} onPress={() => {
                  const userItem = {
                    id: user.id,
                    name: user.username,
                    status: 'active', // New users are active by default
                    joinedDate: user.created_at,
                  };
                  navigation.navigate("Users", { userId: user.id, userObject: userItem });
                }}>
                    <View style={[styles.flaggedItemIcon, { backgroundColor: 'rgba(46, 204, 113, 0.1)' }]}>
                        <Ionicons name="person-add-outline" size={24} color="#2ECC71" />
                    </View>
                    <View style={styles.flaggedItemContent}>
                        <Text style={styles.flaggedItemUser}>{user.username}</Text>
                        <Text style={styles.flaggedItemDate}>{getTimeAgo(user.created_at)}</Text>
                    </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyStateText}>No new users found.</Text>
            )
          )}

          {activityTab === 'adminActions' && (
            recentLogs.length > 0 ? (
              recentLogs.map((log, index) => (
                <TouchableOpacity key={index} style={[styles.flaggedItem, index === recentLogs.length - 1 && { borderBottomWidth: 0 }]} onPress={() => { setLogsModalVisible(true); fetchLogs(50, setFullLogs); }}>
                  <View style={styles.flaggedItemIcon}><Ionicons name="construct-outline" size={24} color="#555" /></View>
                  <View style={styles.flaggedItemContent}>
                    <View>
                      <Text style={styles.flaggedItemUser} numberOfLines={2}>
                        <Text style={{fontWeight: 'bold'}}>{log.admin_name || 'Unknown'}</Text>
                        <Text> {log.action} </Text>
                        <Text style={{fontWeight: 'bold'}}>{log.target_name || 'N/A'}</Text>
                      </Text>
                    </View>
                    <Text style={styles.flaggedItemDate}>{getTimeAgo(log.created_at)}</Text>
                  </View>
                  <View style={[styles.flaggedItemTag, { backgroundColor: log.resulting_status === 'active' ? '#44bd32' : '#E74C3C' }]}>
                    <Text style={styles.flaggedItemTagText}>{log.resulting_status}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyStateText}>No recent actions recorded.</Text>
            )
          )}

          {activityTab === 'flaggedActivity' && (
            recentFlagged.length > 0 ? (
              recentFlagged.map((item, index) => {
                const violationColors: Record<string, string> = { spam: "#E74C3C", offensive: "#F39C12", harassment: "#9B59B6" };
                const tagColor = violationColors[item.type.toLowerCase()] || '#555';
                return (
                  <TouchableOpacity key={item.id} style={[styles.flaggedItem, index === recentFlagged.length - 1 && { borderBottomWidth: 0 }]} onPress={() => navigation.navigate("Users", { userId: item.userId })}>
                    <View style={styles.flaggedItemIcon}>
                      <Ionicons name="person-circle-outline" size={32} color="#555" />
                    </View>
                    <View style={styles.flaggedItemContent}>
                      <View>
                        <Text style={styles.flaggedItemUser}>{item.userName}</Text>
                        <Text style={styles.flaggedItemDate}>{item.date}</Text>
                      </View>
                    </View>
                    <View style={[styles.flaggedItemTag, { backgroundColor: tagColor }]}><Text style={styles.flaggedItemTagText}>{item.type}</Text></View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyStateText}>No recent violations found.</Text>
            )
          )}
        </View>
      </PanelCard>

      {/* Admin Logs Modal */}
      <Modal transparent visible={logsModalVisible} animationType="fade" onRequestClose={() => setLogsModalVisible(false)} onShow={() => { setLogSearchTerm(''); setLogStartDate(''); setLogEndDate(''); }}>
        <TouchableWithoutFeedback onPress={(e: GestureResponderEvent) => e.target === e.currentTarget && setLogsModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalContent}>
              <TouchableOpacity onPress={() => setLogsModalVisible(false)} style={styles.modalCloseBtn}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
              <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 12 }}>Admin Action History</Text>
              <View style={localStyles.searchContainer}>
                <Ionicons name="search" size={18} color="#999" style={localStyles.searchIcon} />
                <TextInput
                  style={localStyles.searchInput}
                  placeholder="Search by admin, action, target..."
                  placeholderTextColor="#999"
                  value={logSearchTerm}
                  onChangeText={setLogSearchTerm}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={[localStyles.searchContainer, { flex: 1, marginBottom: 0 }]}>
                  <TextInput
                    style={localStyles.searchInput}
                    placeholder="Start (YYYY-MM-DD)"
                    placeholderTextColor="#999"
                    value={logStartDate}
                    onChangeText={setLogStartDate}
                  />
                </View>
                <View style={[localStyles.searchContainer, { flex: 1, marginBottom: 0 }]}>
                  <TextInput
                    style={localStyles.searchInput}
                    placeholder="End (YYYY-MM-DD)"
                    placeholderTextColor="#999"
                    value={logEndDate}
                    onChangeText={setLogEndDate}
                  />
                </View>
              </View>
              <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {loadingLogs ? <ActivityIndicator size="small" color="#4A90E2" /> : (
                  filteredLogs.length > 0 ? filteredLogs.map((log, index) => (
                    <View key={index} style={{ backgroundColor: "#f9f9f9", padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: log.resulting_status === 'active' ? '#44bd32' : '#E74C3C' }}>
                      <LogDetailItem label="Action" value={log.action} valueStyle={{ fontWeight: 'bold' }} />
                      <LogDetailItem label="Admin" value={log.admin_name || 'Unknown'} />
                      <LogDetailItem label="Target" value={log.target_name || 'N/A'} />
                      <LogDetailItem label="Timestamp" value={log.created_at} />
                      <LogDetailItem label="Reason" value={log.reason} valueStyle={{ fontStyle: 'italic' }} />
                    </View>
                  )) : <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>{fullLogs.length > 0 ? 'No results found.' : 'No logs found.'}</Text>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
});

export default DashboardTab;

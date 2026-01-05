// app/sadmin_tabs/UsersTab.tsx
import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, Pressable, Modal, TouchableWithoutFeedback, ScrollView, ActivityIndicator, StyleSheet, FlatListProps } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming, useAnimatedScrollHandler } from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { styles } from "../../lib/sadmin_tabs/styles";
import axios from "axios";
import { API_BASE_URL } from "../../lib/apiConfig";
import { UserItem, Violation, Screening, useDashboardContext, useAlert } from "../../lib/sadmin_tabs/common";
import { useRoute, useNavigation, EventArg, NavigationAction } from "@react-navigation/native";
import { SummaryCard } from "../../lib/sadmin_tabs/SharedComponents";
import { UsersSkeleton } from "../../lib/sadmin_tabs/SkeletonLoader";

// --- User Management Components --- //

const UserCard: React.FC<{
  user: UserItem;
  violations: Violation[];
  screenings: Screening[];
  search: string;
  onPress: () => void;
  selected: boolean;
  onLongPress: () => void;
  onSuspend: (userId: number) => void;
  onLiftSuspension: (userId: number) => void;
  onRemove: (userId: number) => void;
}> = memo(({ user, violations, screenings, search, onPress, selected, onLongPress, onSuspend, onLiftSuspension, onRemove }) => {
  const highlightName = useMemo(() => {
    if (!search) return <Text>{user.name}</Text>;
    return user.name.split(new RegExp(`(${search})`, "gi")).map((part, i) => (
      <Text key={i} style={{ backgroundColor: part.toLowerCase() === search.toLowerCase() ? "#FFD700" : "transparent" }}>{part}</Text>
    ));
  }, [user.name, search]);

  const animatedValue = useSharedValue(selected ? 1 : 0);
  const swipeableRef = useRef<Swipeable>(null);

  useEffect(() => {
    animatedValue.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected]);

  const outlineColor = user.status === 'active' ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)';

  const animatedCardStyle = useAnimatedStyle(() => {
    const borderColor = animatedValue.value === 1 ? "#4A90E2" : outlineColor;
    return { borderColor, borderWidth: 1 };
  }, [outlineColor]);

  const renderRightActions = useCallback(() => {
    const isSuspended = user.status === 'suspended';
    
    const handleSuspend = () => {
      swipeableRef.current?.close();
      onSuspend(user.id);
    };

    const handleLiftSuspension = () => {
      swipeableRef.current?.close();
      onLiftSuspension(user.id);
    };

    const handleRemove = () => {
      swipeableRef.current?.close();
      onRemove(user.id);
    };

    return (
      <View style={{ flexDirection: 'row', width: 160, borderTopRightRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
        <TouchableOpacity
          onPress={isSuspended ? handleLiftSuspension : handleSuspend}
          style={{
            flex: 1,
            backgroundColor: isSuspended ? '#2ECC71' : '#F39C12',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name={isSuspended ? 'checkmark-circle-outline' : 'ban-outline'} size={24} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 }}>{isSuspended ? 'Lift' : 'Suspend'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRemove}
          style={{
            flex: 1,
            backgroundColor: '#E74C3C',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 }}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }, [user.status, user.id, onSuspend, onLiftSuspension, onRemove]);

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} friction={2} rightThreshold={40} containerStyle={{ overflow: 'visible' }}>
      <Pressable onPress={onPress} onLongPress={onLongPress}>
        {({ pressed }) => (
          <Animated.View style={[
              styles.userCard, 
              { 
                backgroundColor: '#fff', 
                borderRadius: 12, 
                elevation: 2, 
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: 1 }, 
                shadowOpacity: 0.1, 
                shadowRadius: 3 
              }, 
              animatedCardStyle, 
              { opacity: pressed ? 0.6 : 1 }
            ]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View><View style={{ flexDirection: "row", flexWrap: "wrap" }}>{highlightName}</View><Text style={[styles.userStatus, { color: user.status === "active" ? "#2ECC71" : "#E74C3C", textTransform: 'capitalize' }]}>{user.status}</Text></View>
            </View>
            <View style={{ flexDirection: "row" }}>
              {violations.length > 0 && (<View style={[styles.userCardBadge, { backgroundColor: "#E74C3C" }, selected && { opacity: 0.5 }]}><Ionicons name="alert-circle" size={14} color="#fff" /></View>)}
              {screenings.length > 0 && (<View style={[styles.userCardBadge, { backgroundColor: "#F39C12" }, selected && { opacity: 0.5 }]}><Ionicons name="shield-checkmark" size={14} color="#fff" /></View>)}
            </View>
            {selected && (<Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(74, 144, 226, 0.2)", borderRadius: 12, justifyContent: "center", alignItems: "center" }]} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} />)}
          </Animated.View>
        )}
      </Pressable>
    </Swipeable>
  );
});

const SuspendUserModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (duration: number, reason: string) => void;
}> = memo(({ visible, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(7);
  const durations = [{ label: '1 Day', value: 1 }, { label: '7 Days', value: 7 }, { label: '30 Days', value: 30 }, { label: 'Permanent', value: -1 }];

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onSubmit(duration, reason);
    onClose();
    setReason('');
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalSectionTitle}>Suspend User</Text>
          <Text style={{ marginBottom: 16, color: '#555' }}>Select a duration and provide a reason for the suspension.</Text>
          <View style={styles.durationSelector}>
            {durations.map(d => (
              <TouchableOpacity key={d.value} style={[styles.durationButton, duration === d.value && styles.durationButtonSelected]} onPress={() => setDuration(d.value)}>
                <Text style={[styles.durationButtonText, duration === d.value && styles.durationButtonTextSelected]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.reasonInput} placeholder="Reason for suspension..." value={reason} onChangeText={setReason} multiline />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#e0e0e0' }]} onPress={onClose}><Text style={[styles.modalButtonText, { color: '#333' }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E74C3C' }]} onPress={handleSubmit}><Text style={styles.modalButtonText}>Confirm Suspension</Text></TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
});

interface ModerationLog {
  action: string;
  resulting_status: string;
  reason: string | null;
  created_at: string;
  admin_name: string;
}

const UserModal: React.FC<{
  visible: boolean;
  user: UserItem | null;
  violations: Violation[];
  screenings: Screening[];
  moderationLogs: ModerationLog[];
  loadingLogs: boolean;
  onClose: () => void;
  onSuspend: (userId: number) => void;
  onLiftSuspension: (userId: number) => void;
  onRemove: (userId: number) => void;
}> = memo(({ visible, user, violations, screenings, moderationLogs, loadingLogs, onClose, onSuspend, onLiftSuspension, onRemove }) => {
  if (!user) return null;
  const showAlert = useAlert();
  const userViolations = violations.filter((v) => v.userId === user.id);
  const userScreenings = screenings.filter((s) => s.userId === user.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  // Reset tab to overview when modal opens
  useEffect(() => {
    if (visible) setActiveTab('overview');
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.modalContent}>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
              <View style={styles.modalHeader}>
                <Ionicons name="person-circle" size={50} color="#4A90E2" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.modalUserName}>{user.name}</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: user.status === 'active' ? '#2ECC71' : '#E74C3C' }]}><Text style={styles.modalStatusBadgeText}>{user.status}</Text></View>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Joined: {user.joinedDate}</Text>
                </View>
              </View>

              {/* Tabs */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setActiveTab('overview')} style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: activeTab === 'overview' ? '#4A90E2' : 'transparent' }}>
                  <Text style={{ textAlign: 'center', fontWeight: '600', color: activeTab === 'overview' ? '#4A90E2' : '#999' }}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('history')} style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: activeTab === 'history' ? '#4A90E2' : 'transparent' }}>
                  <Text style={{ textAlign: 'center', fontWeight: '600', color: activeTab === 'history' ? '#4A90E2' : '#999' }}>History</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300, marginVertical: 0 }}>
                {activeTab === 'overview' ? (
                  <>
                    {userViolations.length > 0 && (<View style={styles.modalSection}><Text style={styles.modalSectionTitle}>Violations ({userViolations.length})</Text>{userViolations.map(v => (<View key={`v-${v.id}`} style={styles.modalListItem}><Ionicons name="alert-circle-outline" size={16} color="#E74C3C" style={{ marginRight: 8 }} /><Text style={styles.modalListItemText}>{v.type} on {v.date}</Text></View>))}</View>)}
                    {userScreenings.length > 0 && (<View style={styles.modalSection}><Text style={styles.modalSectionTitle}>Screening History ({userScreenings.length})</Text>{userScreenings.map(s => (<View key={`s-${s.id}`} style={styles.modalListItem}><Ionicons name="shield-checkmark-outline" size={16} color="#F39C12" style={{ marginRight: 8 }} /><Text style={styles.modalListItemText}>{s.type} - <Text style={{ color: s.result === 'passed' ? 'green' : 'orange' }}>{s.result}</Text> on {s.date}</Text></View>))}</View>)}
                    {user.status === 'suspended' && (user.suspensionReason || user.suspensionEndDate) && (<View style={styles.modalSection}><Text style={styles.modalSectionTitle}>Suspension Details</Text>{user.suspensionReason && <Text style={styles.modalListItemText}><Text style={{fontWeight: 'bold'}}>Reason:</Text> {user.suspensionReason}</Text>}{user.suspensionEndDate && <Text style={styles.modalListItemText}><Text style={{fontWeight: 'bold'}}>Ends on:</Text> {user.suspensionEndDate}</Text>}</View>)}
                    {userViolations.length === 0 && userScreenings.length === 0 && user.status !== 'suspended' && (<View style={styles.emptyListContainer}><Ionicons name="shield-checkmark-outline" size={24} color="#2ECC71" /><Text style={styles.emptyStateText}>This user has a clean record.</Text></View>)}
                  </>
                ) : (
                  <>
                    {moderationLogs.length > 0 ? (
                      <View style={styles.modalSection}>
                        {moderationLogs.map((log, index) => (
                          <View key={index} style={styles.modalListItem}>
                            <Ionicons name="clipboard-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.modalListItemText}><Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{log.action}</Text> by {log.admin_name}</Text>
                              <Text style={{ fontSize: 11, color: '#888' }}>{log.created_at}</Text>
                              {log.reason && <Text style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginTop: 2 }}>"{log.reason}"</Text>}
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      !loadingLogs && <View style={styles.emptyListContainer}><Text style={styles.emptyStateText}>No moderation history found.</Text></View>
                    )}
                    {loadingLogs && <ActivityIndicator size="small" color="#4A90E2" style={{ marginTop: 10 }} />}
                  </>
                )}
              </ScrollView>
              <View style={styles.modalActions}>
                {user.status === 'active' ? (<TouchableOpacity style={[styles.modalButton, { backgroundColor: '#F39C12' }]} onPress={() => onSuspend(user.id)}><Ionicons name="ban-outline" size={20} color="#fff" /><Text style={styles.modalButtonText}>Suspend User</Text></TouchableOpacity>) : (<TouchableOpacity style={[styles.modalButton, { backgroundColor: '#2ECC71' }]} onPress={() => onLiftSuspension(user.id)}><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.modalButtonText}>Lift Suspension</Text></TouchableOpacity>)}
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E74C3C' }]} onPress={() => showAlert({ title: "Remove User", message: `Are you sure you want to remove ${user.name}? This action cannot be undone.`, buttons: [{ text: "Cancel", style: "cancel" }, { text: "Yes, Remove", style: "destructive", onPress: () => { onRemove(user.id); onClose(); } }] })}><Ionicons name="trash-outline" size={20} color="#fff" /><Text style={styles.modalButtonText}>Remove</Text></TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

/* -------------------------- UsersTab -------------------------- */
const UsersTab: React.FC = memo(() => {
  const { 
    violations, 
    screenings, 
    users, 
    loadingUsers,
    suspendUser,
    liftSuspension,
    removeUser,
    removeUsersBulk,
    refreshData: fetchUsers
  } = useDashboardContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSuspendModalVisible, setIsSuspendModalVisible] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<number | null>(null);
  const [usersToSuspend, setUsersToSuspend] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const showAlert = useAlert();
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sortMode, setSortMode] = useState<'alphabetical' | 'newest'>("alphabetical");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const flatListRef = useRef<FlatList<UserItem>>(null);
  const resolvingUserId = useRef<number | null>(null);

  const ITEMS_PER_PAGE = 20;
  const EMPTY_VIOLATIONS: Violation[] = useMemo(() => [], []);
  const EMPTY_SCREENINGS: Screening[] = useMemo(() => [], []);

  useEffect(() => {
    // Dynamically update the tab label with the current user count.
    // This is the recommended way to update screen options from within a component,
    // ensuring the navigator configuration remains stable.
    navigation.setOptions({
      tabBarLabel: `Users (${users.length})`,
    });
  }, [navigation, users.length]);
  useEffect(() => {
    if (route.params?.filter) {
      const filter = route.params.filter;
      if (filter === 'active' || filter === 'suspended' || filter === 'all') {
        setStatusFilter(filter);
      }
      navigation.setParams({ filter: undefined });
    }
  }, [route.params?.filter]);

  const fetchModerationLogs = useCallback(async (userId: number) => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users.php?fetch_logs=1&user_id=${userId}`);
      if (res.data.success) {
        setModerationLogs(res.data.logs);
      } else {
        setModerationLogs([]);
      }
    } catch (e) {
      console.error(e);
      setModerationLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const openUserModal = useCallback((user: UserItem) => { setSelectedUser(user); setIsModalVisible(true); fetchModerationLogs(user.id); }, [fetchModerationLogs]);
  const closeUserModal = useCallback(() => { setSelectedUser(null); setIsModalVisible(false); setModerationLogs([]); }, []);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const floatingHeaderStyle = useAnimatedStyle(() => {
    const show = scrollY.value > 100;
    return {
      opacity: withTiming(show ? 1 : 0, { duration: 300 }),
      transform: [
        { translateY: withTiming(show ? 0 : -100, { duration: 300 }) },
      ],
    };
  });

  const scrollToTopStyle = useAnimatedStyle(() => {
    const show = scrollY.value > 300;
    return {
      opacity: withTiming(show ? 1 : 0, { duration: 300 }),
      transform: [
        { scale: withTiming(show ? 1 : 0, { duration: 300 }) },
      ],
    };
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortMode, statusFilter]);

  useEffect(() => {
    if (selectedUserIds.size === 0 && selectionMode) setSelectionMode(false);
  }, [selectedUserIds, selectionMode]);

  useFocusEffect(useCallback(() => () => { setSelectionMode(false); setSelectedUserIds(new Set()); }, []));

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
      // If we're not in selection mode, we don't need to do anything.
      if (!selectionMode) {
        return;
      }

      // Prevent the screen from being left
      e.preventDefault();

      // Prompt the user for confirmation using the existing alert system
      showAlert({
        title: 'Discard selection?',
        message: 'You have users selected. Are you sure you want to leave and discard the selection?',
        buttons: [
          { text: "Don't leave", style: 'cancel', onPress: () => {} },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ],
      });
    });

    return unsubscribe;
  }, [navigation, selectionMode, showAlert]);

  useEffect(() => {
    const userId = route.params?.userId;
    const userObject = route.params?.userObject as UserItem | undefined;
    if (!userId) {
      if (resolvingUserId.current) {
        resolvingUserId.current = null;
      }
      return;
    }

    if (loadingUsers) {
      return;
    }

    const userIdNum = Number(userId);
    const userToOpen = users.find(u => u.id === userIdNum);

    if (userToOpen) { // User found in the existing list
      openUserModal(userToOpen);
      navigation.setParams({ userId: undefined, userObject: undefined });
      resolvingUserId.current = null;
    } else {
      // User not in the list, check if a user object was passed via params
      if (userObject && userObject.id === userIdNum) {
        // Immediately open the modal with the passed data
        openUserModal(userObject);
        // Still try to refresh the main list in the background
        if (resolvingUserId.current !== userIdNum) {
          resolvingUserId.current = userIdNum;
          fetchUsers();
        }
        navigation.setParams({ userId: undefined, userObject: undefined });
      } else if (resolvingUserId.current !== userIdNum) {
        resolvingUserId.current = userIdNum;
        fetchUsers();
      } else {
        showAlert({ title: "User Not Found", message: "The user could not be found.", buttons: [{ text: "OK" }] });
        navigation.setParams({ userId: undefined, userObject: undefined });
        resolvingUserId.current = null;
        }
    }
  }, [route.params?.userId, route.params?.userObject, users, loadingUsers, fetchUsers, navigation, openUserModal, showAlert]);

  const handleSwipeRemove = useCallback((userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    showAlert({
      title: "Remove User",
      message: `Are you sure you want to remove ${user.name}? This action cannot be undone.`,
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Remove", style: "destructive", onPress: () => removeUser(userId) }
      ]
    });
  }, [users, showAlert, removeUser]);

  const violationsMap = useMemo(() => {
    const map: Record<number, Violation[]> = {};
    violations.forEach(v => (map[v.userId] ? map[v.userId].push(v) : (map[v.userId] = [v])));
    return map;
  }, [violations]);

  const screeningsMap = useMemo(() => {
    const map: Record<number, Screening[]> = {};
    screenings.forEach(s => (map[s.userId] ? map[s.userId].push(s) : (map[s.userId] = [s])));
    return map;
  }, [screenings]);

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const nameMatch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = statusFilter === 'all' || user.status === statusFilter;
      return nameMatch && statusMatch;
    });
    const sorted = [...filtered];
    if (sortMode === "alphabetical") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => b.id - a.id);
    return sorted;
  }, [users, searchQuery, sortMode, statusFilter]);

  const displayedUsers = useMemo(() => filteredUsers.slice(0, currentPage * ITEMS_PER_PAGE), [filteredUsers, currentPage]);
  const modalUser = useMemo(() => users.find(u => u.id === selectedUser?.id) || selectedUser, [users, selectedUser]);
  
  const toggleUserSelection = useCallback((userId: number) => { setSelectedUserIds(prev => { const newSet = new Set(prev); newSet.has(userId) ? newSet.delete(userId) : newSet.add(userId); return newSet; }); }, []);
  const handleLongPressUser = useCallback((userId: number) => { if (!selectionMode) setSelectionMode(true); toggleUserSelection(userId); }, [selectionMode, toggleUserSelection]);
  const handlePressUser = useCallback((user: UserItem) => { if (selectionMode) toggleUserSelection(user.id); else openUserModal(user); }, [selectionMode, openUserModal, toggleUserSelection]);
  const handleSuspendUser = useCallback((userId: number) => { setIsModalVisible(false); setUserToSuspend(userId); setIsSuspendModalVisible(true); }, []);
  const handleBulkSuspend = useCallback((userIds: Set<number>) => { setUsersToSuspend(userIds); setIsSuspendModalVisible(true); }, []);
  const handleConfirmBulkSuspension = useCallback((duration: number, reason: string) => { usersToSuspend.forEach(userId => suspendUser(userId, duration, reason)); setIsSuspendModalVisible(false); setUsersToSuspend(new Set()); setSelectedUserIds(new Set()); }, [usersToSuspend, suspendUser]);
  const handleConfirmSuspension = useCallback((duration: number, reason: string) => { if (userToSuspend) suspendUser(userToSuspend, duration, reason); setIsSuspendModalVisible(false); setUserToSuspend(null); }, [userToSuspend, suspendUser]);

  const { canSuspend, canLift, toggleActionLabel } = useMemo(() => {
    if (selectedUserIds.size === 0) return { canSuspend: false, canLift: false, toggleActionLabel: 'Toggle' };
    const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
    const allActive = selectedUsers.every(u => u.status === 'active');
    const allSuspended = selectedUsers.every(u => u.status === 'suspended');
    if (allActive) return { canSuspend: true, canLift: false, toggleActionLabel: 'Suspend' };
    if (allSuspended) return { canSuspend: false, canLift: true, toggleActionLabel: 'Lift' };
    return { canSuspend: false, canLift: false, toggleActionLabel: 'Toggle' };
  }, [selectedUserIds, users]);

  const { activeUsersCount, suspendedUsersCount } = useMemo(() => {
    return users.reduce((counts, user) => {
      if (user.status === 'active') counts.activeUsersCount++;
      else if (user.status === 'suspended') counts.suspendedUsersCount++;
      return counts;
    }, { activeUsersCount: 0, suspendedUsersCount: 0 });
  }, [users]);

  const renderHeader = useCallback(() => (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12, marginTop: 4 }}>
        <SummaryCard
          icon="checkmark-circle-outline"
          color="#44bd32"
          textColor="#fff"
          title="Active"
          value={activeUsersCount}
          onPress={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
          showArrow={false}
          style={{
            opacity: statusFilter !== 'all' && statusFilter !== 'active' ? 0.65 : 1,
            borderWidth: statusFilter === 'active' ? 2 : 0,
            borderColor: 'rgba(255,255,255,0.7)',
          }}
        />
        <SummaryCard
          icon="ban-outline"
          color="#e84118"
          textColor="#fff"
          title="Suspended"
          value={suspendedUsersCount}
          onPress={() => setStatusFilter(prev => prev === 'suspended' ? 'all' : 'suspended')}
          showArrow={false}
          style={{
            opacity: statusFilter !== 'all' && statusFilter !== 'suspended' ? 0.65 : 1,
            borderWidth: statusFilter === 'suspended' ? 2 : 0,
            borderColor: 'rgba(255,255,255,0.7)',
          }}
        />
      </View>
    </View>
  ), [activeUsersCount, suspendedUsersCount, statusFilter]);

  if (loadingUsers && users.length === 0) {
    return <UsersSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.userListControls, { position: 'relative', zIndex: 1, elevation: 0, marginTop: 0, marginBottom: 10 }]}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <TextInput placeholder="Search users..." value={searchText} onChangeText={setSearchText} style={[styles.searchInput, { paddingRight: 35 }]} />
          {searchText.length > 0 && (<TouchableOpacity onPress={() => setSearchText("")} style={styles.clearSearchButton}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity>)}
        </View>
        <Pressable onPress={() => setSortMode(p => (p === "alphabetical" ? "newest" : "alphabetical"))} style={({ pressed }) => [styles.sortButton, { backgroundColor: pressed ? '#3B7BC2' : '#4A90E2' }]}>
          <MaterialIcons name="sort" size={18} color="#fff" /><Text style={styles.sortButtonText}>{sortMode === "alphabetical" ? "A-Z" : "Newest"}</Text>
        </Pressable>
      </View>

      {selectionMode && selectedUserIds.size > 0 && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.userListBulkActions, { marginBottom: 10 }]}>
          <TouchableOpacity
            disabled={!canSuspend && !canLift}
            onPress={() => {
              if (canSuspend) {
                const usersToSuspend = users.filter(user => selectedUserIds.has(user.id));
                const namesToShow = usersToSuspend.map(u => u.name).slice(0, 3).join(', ');
                const remainingCount = Math.max(0, usersToSuspend.length - 3);
                const userListMessage = remainingCount > 0 ? `${namesToShow}, and ${remainingCount} more` : namesToShow;
                showAlert({ title: "Confirm Bulk Suspension", message: `You are about to suspend ${selectedUserIds.size} user(s):\n\n${userListMessage}`, buttons: [{ text: "Cancel", style: "cancel" }, { text: "Proceed", onPress: () => handleBulkSuspend(selectedUserIds) }] });
              } else if (canLift) {
                showAlert({ title: "Confirm Bulk Action", message: `Are you sure you want to lift the suspension for ${selectedUserIds.size} user(s)?`, buttons: [{ text: "Cancel", style: "cancel" }, { text: "Yes, Lift All", onPress: () => { selectedUserIds.forEach(liftSuspension); setSelectedUserIds(new Set()); } }] });
              }
            }}
            style={[styles.bulkActionButton, { backgroundColor: canLift ? '#2ECC71' : '#F39C12' }, !canSuspend && !canLift && { backgroundColor: '#aaa', opacity: 0.6 }]}
          >
            <Ionicons name={canLift ? 'checkmark-circle-outline' : 'ban-outline'} size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.bulkActionButtonText}>{toggleActionLabel} ({selectedUserIds.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const usersToRemove = users.filter(user => selectedUserIds.has(user.id));
              const namesToShow = usersToRemove.map(u => u.name).slice(0, 3).join(', ');
              const remainingCount = Math.max(0, usersToRemove.length - 3);
              const userListMessage = remainingCount > 0 ? `${namesToShow}, and ${remainingCount} more` : namesToShow;
              showAlert({ title: "Confirm Bulk Removal", message: `This will permanently remove ${selectedUserIds.size} user(s):\n\n${userListMessage}`, buttons: [{ text: "Cancel", style: "cancel" }, { text: "Yes, Remove All", style: "destructive", onPress: () => { removeUsersBulk(selectedUserIds); setSelectedUserIds(new Set()); } }] });
            }}
            style={[styles.bulkActionButton, { backgroundColor: "#E74C3C" }]}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.bulkActionButtonText}>Remove ({selectedUserIds.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedUserIds(new Set())} style={styles.cancelBulkActionButton}><Text style={styles.cancelBulkActionButtonText}>Cancel</Text></TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.userListContainer}>
        <View style={{ flex: 1 }}>
          <Animated.FlatList
            ref={flatListRef}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            ListHeaderComponent={renderHeader}
            data={displayedUsers}
            keyExtractor={item => item.id.toString()}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            onEndReached={() => { if (!loadingUsers && displayedUsers.length < filteredUsers.length) setCurrentPage(p => p + 1); }}
            refreshing={loadingUsers} onRefresh={fetchUsers}
            contentContainerStyle={{ paddingBottom: 32 }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={!loadingUsers ? (<View style={styles.emptyListContainer}><Text style={styles.emptyListText}>No users found matching your search.</Text></View>) : null}
            ListFooterComponent={
              loadingUsers ? null :
              displayedUsers.length < filteredUsers.length ? 
                <ActivityIndicator size="small" color="#4A90E2" style={{ padding: 10 }} /> :
              filteredUsers.length > 0 ?
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Ionicons name="leaf-outline" size={24} color="#bdc3c7" />
                  <Text style={{ color: '#95a5a6', fontSize: 12, marginTop: 8 }}>You've reached the end of the list.</Text>
                </View> : null
            }
            renderItem={useCallback(({ item }: { item: UserItem }) => (<UserCard user={item} violations={violationsMap[item.id] || EMPTY_VIOLATIONS} screenings={screeningsMap[item.id] || EMPTY_SCREENINGS} search={searchQuery} selected={selectedUserIds.has(item.id)} onLongPress={() => handleLongPressUser(item.id)} onPress={() => handlePressUser(item)} onSuspend={handleSuspendUser} onLiftSuspension={liftSuspension} onRemove={handleSwipeRemove} />), [violationsMap, screeningsMap, searchQuery, selectedUserIds, handleLongPressUser, handlePressUser, EMPTY_VIOLATIONS, EMPTY_SCREENINGS, handleSuspendUser, liftSuspension, handleSwipeRemove])}
          />
          {loadingUsers && displayedUsers.length === 0 && (<View style={styles.listOverlay}><ActivityIndicator size="large" color="#4A90E2" /></View>)}
          
          <Animated.View style={[styles.floatingIconsContainer, floatingHeaderStyle]}>
            <TouchableOpacity onPress={() => setStatusFilter(f => f === 'active' ? 'all' : 'active')} style={[styles.miniFloatingButton, { backgroundColor: '#44bd32', borderColor: statusFilter === 'active' ? '#fff' : 'transparent', borderWidth: statusFilter === 'active' ? 2 : 0, flexDirection: 'row', gap: 6 }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{activeUsersCount}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStatusFilter(f => f === 'suspended' ? 'all' : 'suspended')} style={[styles.miniFloatingButton, { backgroundColor: '#e84118', borderColor: statusFilter === 'suspended' ? '#fff' : 'transparent', borderWidth: statusFilter === 'suspended' ? 2 : 0, flexDirection: 'row', gap: 6 }]}>
              <Ionicons name="ban-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{suspendedUsersCount}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Suspended</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.scrollToTopButton, scrollToTopStyle]}>
            <TouchableOpacity onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })} style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="arrow-up" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <UserModal visible={isModalVisible} user={modalUser} violations={violations} screenings={screenings} moderationLogs={moderationLogs} loadingLogs={loadingLogs} onClose={closeUserModal} onSuspend={handleSuspendUser} onLiftSuspension={liftSuspension} onRemove={removeUser} />
      <SuspendUserModal visible={isSuspendModalVisible} onClose={() => setIsSuspendModalVisible(false)} onSubmit={(duration, reason) => { if (userToSuspend) handleConfirmSuspension(duration, reason); else if (usersToSuspend.size > 0) handleConfirmBulkSuspension(duration, reason); }} />
    </View>
  );
});

export default UsersTab;

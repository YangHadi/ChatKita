// app/sadmindashboard.tsx
import React, { useLayoutEffect, useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SadminNavProp, Metric, Violation, UserItem, Screening, CustomAlertOptions, MOCK_DATA, useDashboardContext, useAlert, AlertContext, DashboardContext } from "../lib/sadmin_tabs/common";
import { API_BASE_URL } from "../lib/apiConfig";
import { styles } from "../lib/sadmin_tabs/styles";
import DashboardTab from "./sadmin_tabs/DashboardTab";
import UsersTab from "./sadmin_tabs/UsersTab";
import ReportsTab from "./sadmin_tabs/ReportsTab";

// --- Reusable UI Components --- //
const CustomAlert: React.FC<{
  visible: boolean;
  options: CustomAlertOptions | null;
  onClose: () => void;
}> = memo(({ visible, options, onClose }) => {
  if (!options) return null;

  const { title, message, buttons } = options;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.alertBackdrop}>
        {/* By wrapping the content in a Pressable with no onPress, we prevent taps from propagating to the backdrop */}
        <Pressable>
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{title}</Text>
            <Text style={styles.alertMessage}>{message}</Text>
            <View style={styles.alertButtonRow}>
            {buttons.map((button, index) => {
              const getButtonStyle = () => {
                if (button.style === 'destructive') return styles.alertButtonDestructive;
                if (button.style === 'cancel') return styles.alertButtonCancel;
                return styles.alertButtonDefault;
              };
              const getTextStyle = () => {
                if (button.style === 'destructive') return styles.alertButtonTextDestructive;
                if (button.style === 'cancel') return styles.alertButtonTextCancel;
                return styles.alertButtonTextDefault;
              };

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.alertButton, getButtonStyle()]}
                  onPress={() => { button.onPress?.(); onClose(); }}
                >
                  <Text style={getTextStyle()}>{button.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

/* ========================
   Tabs
======================== */
const Tab = createMaterialTopTabNavigator();

/* ========================
   Dashboard UI - The main component with all the tabs
======================== */
function DashboardUI() {
  const { swipeEnabled, users } = useDashboardContext();

  return (
    <Tab.Navigator screenOptions={{ lazy: true }}>
        <Tab.Screen
          name="Dashboard"
          component={DashboardTab}
          options={{ swipeEnabled: true }} />
        <Tab.Screen
          name="Users"
          component={UsersTab}
          options={{
            swipeEnabled: true,
            tabBarLabel: 'Users' // Set a static label, it will be updated dynamically
          }}/>
        <Tab.Screen
          name="Reports"
          options={{ swipeEnabled: swipeEnabled }}
          component={ReportsTab} />
      </Tab.Navigator>
  );
}

/* ========================
   Main Screen - The top-level component that provides context
======================== */
export default function SadminDashboardScreen() {
  const [metrics, setMetrics] = useState<Metric>(MOCK_DATA.initialMetrics);
  const [alertOptions, setAlertOptions] = useState<CustomAlertOptions | null>(null);
  const [violations, setViolations] = useState<Violation[]>(MOCK_DATA.violations);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [screenings] = useState<Screening[]>(MOCK_DATA.screenings);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const router = useRouter();

  const showAlert = useCallback((options: CustomAlertOptions) => {
    setAlertOptions(options);
  }, []);

  const fetchUsers = useCallback(async (): Promise<UserItem[] | undefined> => {
    setLoadingUsers(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users.php?admin=1&_t=${Date.now()}`);
      if (res.data.success && Array.isArray(res.data.users)) {
        const mappedUsers: UserItem[] = res.data.users.map((u: any) => ({
          id: u.id,
          name: u.username,
          status: u.status,
          role: u.role,
          joinedDate: u.created_at || 'N/A',
          suspensionReason: u.suspension_reason,
          suspensionEndDate: u.suspension_end_date
        }));
        setUsers(mappedUsers);
        return mappedUsers;
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
      showAlert({ title: "Error", message: "Failed to load users. Please check your connection.", buttons: [{ text: "OK" }] });
    } finally {
      setLoadingUsers(false);
    }
    return undefined;
  }, [showAlert]);

  const suspendUser = useCallback(async (userId: number, duration: number, reason: string) => {
    try {
      const adminId = await AsyncStorage.getItem("userID");
      await axios.post(`${API_BASE_URL}/users.php`, { action: 'suspend', user_id: userId, duration, reason, admin_id: adminId });
      fetchUsers();
    } catch (error) { console.error(error); showAlert({ title: "Error", message: "Failed to suspend user.", buttons: [{ text: "OK" }] }); }
  }, [fetchUsers, showAlert]);

  const liftSuspension = useCallback(async (userId: number) => {
    try {
      const adminId = await AsyncStorage.getItem("userID");
      await axios.post(`${API_BASE_URL}/users.php`, { action: 'activate', user_id: userId, admin_id: adminId });
      fetchUsers();
    } catch (error) { console.error(error); showAlert({ title: "Error", message: "Failed to lift suspension.", buttons: [{ text: "OK" }] }); }
  }, [fetchUsers, showAlert]);

  const removeUser = useCallback(async (userId: number) => {
    try {
      const adminId = await AsyncStorage.getItem("userID");
      await axios.post(`${API_BASE_URL}/users.php`, { action: 'delete', user_id: userId, admin_id: adminId });
      fetchUsers();
    } catch (error) { console.error(error); showAlert({ title: "Error", message: "Failed to remove user.", buttons: [{ text: "OK" }] }); }
  }, [fetchUsers, showAlert]);

  const removeUsersBulk = useCallback(async (userIds: Set<number>) => {
    try {
      const adminId = await AsyncStorage.getItem("userID");
      await Promise.all(Array.from(userIds).map(id => 
        axios.post(`${API_BASE_URL}/users.php`, { action: 'delete', user_id: id, admin_id: adminId })
      ));
      fetchUsers();
    } catch (error) { console.error(error); showAlert({ title: "Error", message: "Failed to remove users.", buttons: [{ text: "OK" }] }); }
  }, [fetchUsers, showAlert]);

  const refreshData = useCallback((): Promise<UserItem[] | undefined> => {
    setMetrics(MOCK_DATA.initialMetrics);
    setViolations(MOCK_DATA.violations);
    return fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 5 - 2),
        messagesPerSec: Math.max(0, prev.messagesPerSec + Math.floor(Math.random() * 10 - 5)),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const contextValue = useMemo(() => ({
    metrics,
    violations,
    users,
    screenings,
    swipeEnabled,
    loadingUsers,
    setSwipeEnabled,
    suspendUser,
    liftSuspension,
    removeUser,
    removeUsersBulk,
    refreshData,
  }), [metrics, violations, users, screenings, swipeEnabled, loadingUsers, suspendUser, liftSuspension, removeUser, removeUsersBulk, refreshData]);

  // This effect will run when the component mounts.
  // We can check for a parameter to bypass the selection screen if needed.
  // For now, we'll just ensure the selection screen shows up on initial load.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true, // Always show header to prevent layout shift
      title: "Admin Dashboard",
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ marginRight: 15 }}
            onPress={() => showAlert({
              title: "Confirm Logout",
              message: "Are you sure you want to log out?",
              buttons: [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: async () => { 
                    await SecureStore.deleteItemAsync("user");
                    await AsyncStorage.multiRemove(["userID", "username", "role"]);
                    router.replace("/auth"); 
                  } 
                },
              ]
            })}
          >
            <MaterialIcons name="logout" size={24} color="#fff" />
          </TouchableOpacity>
          </View>
        ),
      });
  }, [navigation, router, showAlert]);

  return (
    <AlertContext.Provider value={showAlert}>
      <DashboardContext.Provider value={contextValue}>
        <DashboardUI />
        <CustomAlert
          visible={!!alertOptions}
          options={alertOptions}
          onClose={() => setAlertOptions(null)}
        />
      </DashboardContext.Provider>
    </AlertContext.Provider>
  );
}

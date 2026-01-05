// app/sadmin_tabs/ReportsTab.tsx
import React, { memo, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ViewStyle, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { styles } from "../../lib/sadmin_tabs/styles";
import axios from "axios";
import ViewShot from "react-native-view-shot";
import { API_BASE_URL } from "../../lib/apiConfig";
import { MOCK_DATA, useDashboardContext, useAlert } from "../../lib/sadmin_tabs/common";
import { PanelCard, SvgPieChart, SvgLineChart, SvgBarChart } from "../../lib/sadmin_tabs/SharedComponents";
import { ReportsSkeleton } from "../../lib/sadmin_tabs/SkeletonLoader";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// --- Reusable UI Components --- //

const ChartContainer: React.FC<{ children: React.ReactNode; isScrollable?: boolean; scrollRef?: React.RefObject<ScrollView | null>; onTouchStart?: () => void; onTouchEnd?: () => void; }> = ({ children, isScrollable, scrollRef, onTouchStart, onTouchEnd }) => {
  if (isScrollable) return <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={scrollRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{children}</ScrollView>;
  return <>{children}</>;
};

// --- Report Section Components --- //

const ReportsHeader: React.FC<{
  range: "daily" | "weekly" | "monthly";
  setRange: (range: "daily" | "weekly" | "monthly") => void;
  onDownload: () => void;
}> = memo(({ range, setRange, onDownload }) => (
    <View style={styles.reportsHeader}>
      <View style={styles.rangeSelectorContainer}>
        {(["daily", "weekly", "monthly"] as const).map((r) => (
          <TouchableOpacity key={r} onPress={() => setRange(r)} style={[styles.rangeButton, range === r && styles.rangeButtonActive, { flex: 1 }]}>
            <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.downloadButton} onPress={onDownload}>
        <Ionicons name="download-outline" size={20} color="#ffffffff" />
      </TouchableOpacity>
    </View>
));

const MessagesChartCard: React.FC<{
  range: string;
  data: number[];
  labels: string[];
  chartWidth: number;
  scrollRef: React.RefObject<ScrollView | null>;
  setSwipeEnabled: (enabled: boolean) => void;
  viewShotRef: React.RefObject<ViewShot | null>;
  onDownload: () => void;
}> = memo(({ range, data, labels, chartWidth, scrollRef, setSwipeEnabled, viewShotRef, onDownload }) => (
    <PanelCard 
      title={`${range.charAt(0).toUpperCase() + range.slice(1)} Messages Sent`}
      headerRight={
        <TouchableOpacity onPress={onDownload} style={{ padding: 4 }}>
          <Ionicons name="camera-outline" size={22} color="#555" />
        </TouchableOpacity>
      }
    >
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <View style={{ backgroundColor: '#fff', paddingVertical: 8 }}>
        <ChartContainer isScrollable={range === 'monthly'} scrollRef={scrollRef} onTouchStart={() => setSwipeEnabled(false)} onTouchEnd={() => setSwipeEnabled(true)}>
          <SvgLineChart data={data} width={chartWidth} height={200} labels={labels} color="#4A90E2" />
        </ChartContainer>
        </View>
      </ViewShot>
    </PanelCard>
));

const NewRegistrationsCard: React.FC<{
  range: string;
  data: number[];
  labels: string[];
  chartWidth: number;
  scrollRef: React.RefObject<ScrollView | null>;
  setSwipeEnabled: (enabled: boolean) => void;
  viewShotRef: React.RefObject<ViewShot | null>;
  onDownload: () => void;
}> = memo(({ range, data, labels, chartWidth, scrollRef, setSwipeEnabled, viewShotRef, onDownload }) => (
    <PanelCard 
      title={`${range.charAt(0).toUpperCase() + range.slice(1)} New Registrations`}
      headerRight={
        <TouchableOpacity onPress={onDownload} style={{ padding: 4 }}>
          <Ionicons name="camera-outline" size={22} color="#555" />
        </TouchableOpacity>
      }
    >
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <View style={{ backgroundColor: '#fff', paddingVertical: 8 }}>
        <ChartContainer isScrollable={range === 'monthly'} scrollRef={scrollRef} onTouchStart={() => setSwipeEnabled(false)} onTouchEnd={() => setSwipeEnabled(true)}>
          <SvgBarChart data={data} width={chartWidth} height={200} labels={labels} color="#2ECC71" />
        </ChartContainer>
        </View>
      </ViewShot>
    </PanelCard>
));

const UserStatusCard: React.FC<{ users: any[], viewShotRef: React.RefObject<ViewShot | null>, onDownload: () => void }> = memo(({ users, viewShotRef, onDownload }) => {
    const { activeUsers, suspendedUsers, totalUsers } = useMemo(() => {
        const active = users.filter(u => u.status === 'active').length;
        const suspended = users.filter(u => u.status === 'suspended').length;
        return { activeUsers: active, suspendedUsers: suspended, totalUsers: users.length };
    }, [users]);

    const userStatusData = useMemo(() => [
        { label: "Active", value: activeUsers, color: "#44bd32" }, { label: "Suspended", value: suspendedUsers, color: "#E74C3C" }
    ], [activeUsers, suspendedUsers]);

    const title = "Overall User Status";

    return (
      <PanelCard 
        title={title}
        headerRight={
          <TouchableOpacity onPress={onDownload} style={{ padding: 4 }}>
            <Ionicons name="camera-outline" size={22} color="#555" />
          </TouchableOpacity>
        }
      >
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <View style={{ backgroundColor: '#fff', padding: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 16 }}>
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <SvgPieChart radius={80} innerRadius={40} data={userStatusData.filter(d => d.value > 0)} />
            <View style={styles.pieCenter}><Text style={styles.pieCenterNumber}>{totalUsers}</Text><Text style={styles.pieCenterLabel}>Total Users</Text></View>
          </View>
          <View style={styles.legendContainer}>
            {userStatusData.map((item, index) => (<View key={index} style={styles.pieLegendRow}><View style={[styles.legendDot, { backgroundColor: item.color }]} /><Text style={styles.legendText}>{`${item.label} (${item.value.toLocaleString()})`}</Text></View>))}
          </View>
        </View>
        </View>
        </ViewShot>
      </PanelCard>
    );
});

const ScreeningsCard: React.FC<{ range: "daily" | "weekly" | "monthly"; screenings: any[], viewShotRef: React.RefObject<ViewShot | null>, onDownload: () => void }> = memo(({ range, screenings, viewShotRef, onDownload }) => {
    const { passedCount, flaggedCount, totalScreenings } = useMemo(() => {
        const now = new Date();
        const relevantScreenings = screenings.filter(s => {
            const screenDate = new Date(s.date.replace(" ", "T"));
            if (isNaN(screenDate.getTime())) return false;

            const diffMs = now.getTime() - screenDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 3600 * 24));

            if (range === 'daily') return diffDays < 7;
            if (range === 'weekly') return diffDays < 28;
            if (range === 'monthly') {
                const diffMonths = (now.getFullYear() - screenDate.getFullYear()) * 12 + (now.getMonth() - screenDate.getMonth());
                return diffMonths >= 0 && diffMonths < 6;
            }
            return false;
        });

        const passed = relevantScreenings.filter(s => s.result === 'passed').length;
        return { passedCount: passed, flaggedCount: relevantScreenings.length - passed, totalScreenings: relevantScreenings.length };
    }, [range, screenings]);

    const dynamicScreeningsData = [{ label: "Passed", value: passedCount, color: "#4CAF50" }, { label: "Flagged", value: flaggedCount, color: "#F39C12" }];

    return (
      <PanelCard 
        title={`${range.charAt(0).toUpperCase() + range.slice(1)} Screening Results`}
        headerRight={
          <TouchableOpacity onPress={onDownload} style={{ padding: 4 }}>
            <Ionicons name="camera-outline" size={22} color="#555" />
          </TouchableOpacity>
        }
      >
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <View style={{ backgroundColor: '#fff', padding: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 16 }}>
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <SvgPieChart radius={80} innerRadius={40} data={dynamicScreeningsData} />
            <View style={styles.pieCenter}><Text style={styles.pieCenterNumber}>{totalScreenings.toLocaleString()}</Text><Text style={styles.pieCenterLabel}>Screenings</Text></View>
          </View>
          <View style={styles.legendContainer}>
            {dynamicScreeningsData.map((item, index) => (<View key={index} style={styles.pieLegendRow}><View style={[styles.legendDot, { backgroundColor: item.color }]} /><Text style={styles.legendText}>{`${item.label} (${item.value.toLocaleString()})`}</Text></View>))}
          </View>
        </View>
        </View>
        </ViewShot>
      </PanelCard>
    );
});

const ScreeningTrendCard: React.FC<{ range: "daily" | "weekly" | "monthly"; screeningTrend: any; chartWidth: number; labels: string[], viewShotRef: React.RefObject<ViewShot | null>, onDownload: () => void }> = memo(({ range, screeningTrend, chartWidth, labels, viewShotRef, onDownload }) => (
    <PanelCard 
      title={`${range.charAt(0).toUpperCase() + range.slice(1)} Screening Trend`}
      headerRight={
        <TouchableOpacity onPress={onDownload} style={{ padding: 4 }}>
          <Ionicons name="camera-outline" size={22} color="#555" />
        </TouchableOpacity>
      }
    >
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <View style={{ backgroundColor: '#fff', paddingVertical: 8 }}>
      <ChartContainer isScrollable={range === 'monthly'}>
        <SvgLineChart data={screeningTrend[range]} width={chartWidth} height={200} labels={labels} color="#F39C12" />
      </ChartContainer>
        </View>
      </ViewShot>
    </PanelCard>
));

const ViolationsCard: React.FC<{
  range: "daily" | "weekly" | "monthly";
  violationSeries: any;
  chartWidth: number;
  scrollRef: React.RefObject<ScrollView | null>;
  setSwipeEnabled: (enabled: boolean) => void;
  viewShotRef: React.RefObject<ViewShot | null>;
  onDownload: () => void;
}> = memo(({ range, violationSeries, chartWidth, scrollRef, setSwipeEnabled, viewShotRef, onDownload }) => (
    <PanelCard 
      title={`${range.charAt(0).toUpperCase() + range.slice(1)} Violation Breakdown`}
      headerRight={
        <TouchableOpacity onPress={onDownload} style={{ padding: 4 }}>
          <Ionicons name="camera-outline" size={22} color="#555" />
        </TouchableOpacity>
      }
    >
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <View style={{ backgroundColor: '#fff', paddingVertical: 8 }}>
      <View style={{ alignItems: 'center' }}>
        <ChartContainer isScrollable={range === 'monthly'} scrollRef={scrollRef} onTouchStart={() => setSwipeEnabled(false)} onTouchEnd={() => setSwipeEnabled(true)}>
          <SvgBarChart data={violationSeries[range].map((v: any) => ({ spam: v.spam, offensive: v.offensive, harassment: v.harassment }))} width={chartWidth} labels={violationSeries[range].map((v: any) => v.label)} height={250} stackColors={{ spam: "#E74C3C", offensive: "#F39C12", harassment: "#9B59B6" }} />
        </ChartContainer>
        <View style={styles.barChartLegend}>
          {Object.entries({ Spam: "#E74C3C", Offensive: "#F39C12", Harassment: "#9B59B6" }).map(([key, color]) => (<View key={key} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{key}</Text></View>))}
        </View>
      </View>
        </View>
      </ViewShot>
    </PanelCard>
));

const TopViolatorsCard: React.FC<{ range: "daily" | "weekly" | "monthly"; topViolators: any }> = memo(({ range, topViolators }) => {
    if (range === 'daily') return (<PanelCard title="Daily Top Violators"><Text style={styles.reportSummary}>Top violator data is aggregated weekly and monthly for more meaningful insights.</Text></PanelCard>);
    const currentViolators = topViolators[range];
    const totalViolations = useMemo(() => currentViolators.reduce((sum: number, user: any) => sum + user.violationCount, 0), [currentViolators]);
    return (
      <PanelCard title={`${range.charAt(0).toUpperCase() + range.slice(1)} Top 5 Violators`}>
        <Text style={styles.reportSummary}>A total of <Text style={{ fontWeight: 'bold' }}>{totalViolations} violations</Text> from the top 5 users this period.</Text>
        {currentViolators.map((user: any) => (
          <View key={user.id} style={styles.horizontalBarRow}>
            <Text style={styles.horizontalBarLabel}>{user.name}</Text>
            <View style={styles.horizontalBar}><Animated.View entering={FadeIn.duration(500)} style={[styles.horizontalBarFill, { width: `${(user.violationCount / currentViolators[0].violationCount) * 100}%` }]} /></View>
            <Text style={styles.horizontalBarValue}>{user.violationCount}</Text>
          </View>
        ))}
      </PanelCard>
    );
});

/* -------------------------- ReportsTab -------------------------- */
const ReportsTab: React.FC = memo(() => {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const { setSwipeEnabled, users, violations, screenings, loadingUsers } = useDashboardContext();
  const showAlert = useAlert();
  const [messageData, setMessageData] = useState<number[]>([]);
  const [userRegistrationData, setUserRegistrationData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCardCount, setVisibleCardCount] = useState(0);

  const monthlyMessagesScrollViewRef = useRef<ScrollView>(null);
  const monthlyUsersScrollViewRef = useRef<ScrollView>(null);
  const monthlyViolationsScrollViewRef = useRef<ScrollView>(null);
  const { chartsData, screeningTrend, violationSeries, topViolators } = MOCK_DATA.reports;

  const userStatusChartRef = useRef<ViewShot>(null);
  const newRegistrationsChartRef = useRef<ViewShot>(null);
  const messagesChartRef = useRef<ViewShot>(null);
  const screeningTrendChartRef = useRef<ViewShot>(null);
  const screeningsChartRef = useRef<ViewShot>(null);
  const violationsChartRef = useRef<ViewShot>(null);

  const handleSetRange = useCallback((r: "daily" | "weekly" | "monthly") => {
    setRange(r);
    // isLoading is set to true within the processData effect.
  }, []);

  const labels = useMemo(() => {
    const newLabels: string[] = [];
    if (range === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        newLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      }
    } else if (range === 'weekly') {
      for (let i = 3; i >= 0; i--) {
         newLabels.push(`W${4-i}`);
      }
    } else { // monthly
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        newLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
      }
    }
    return newLabels;
  }, [range]);

  const handleDownloadReport = useCallback(async () => {
    const exportCSV = async () => {
      try {
        const headers = "Section,Metric,Value\n";
        const rows: string[] = [];
        labels.forEach((label, i) => {
          rows.push(`Messages Sent (${range}),${label},${messageData[i] || 0}`);
          rows.push(`New Registrations (${range}),${label},${userRegistrationData[i] || 0}`);
        });
        const active = users.filter(u => u.status === 'active').length;
        const suspended = users.filter(u => u.status === 'suspended').length;
        rows.push(`User Status,Active,${active}`);
        rows.push(`User Status,Suspended,${suspended}`);
        ["Spam", "Offensive", "Harassment"].forEach(type => {
          const count = violations.filter((v: any) => v.type.toLowerCase() === type.toLowerCase()).length;
          rows.push(`Violations,${type},${count}`);
        });
        const csv = headers + rows.join('\n');
        const filename = `report_${range}_${new Date().toISOString().split('T')[0]}.csv`;

        if (Platform.OS === "android") {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, "text/csv");
            await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
            showAlert({ title: "Success", message: "CSV Report saved successfully.", buttons: [{ text: "OK" }] });
          }
        } else {
          const fileUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
          await Sharing.shareAsync(fileUri);
        }
      } catch (error) {
        showAlert({ title: "Error", message: "Failed to export CSV.", buttons: [{ text: "OK" }] });
      }
    };

    const exportPDF = async () => {
      try {
        const html = `
          <html>
            <head><style>body{font-family:Helvetica;padding:20px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.section{margin-top:30px}</style></head>
            <body>
              <h1>Report: ${range.toUpperCase()}</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <div class="section"><h2>Activity</h2><table><tr><th>Period</th><th>Messages</th><th>New Registrations</th></tr>${labels.map((l, i) => `<tr><td>${l}</td><td>${messageData[i] || 0}</td><td>${userRegistrationData[i] || 0}</td></tr>`).join('')}</table></div>
              <div class="section"><h2>Overall Status</h2><p>Active: ${users.filter(u => u.status === 'active').length}</p><p>Suspended: ${users.filter(u => u.status === 'suspended').length}</p></div>
              <div class="section"><h2>Violations</h2>${["Spam", "Offensive", "Harassment"].map(t => `<p>${t}: ${violations.filter((v: any) => v.type.toLowerCase() === t.toLowerCase()).length}</p>`).join('')}</div>
            </body>
          </html>`;
        const { uri } = await Print.printToFileAsync({ html });
        const filename = `report_${range}_${new Date().toISOString().split('T')[0]}.pdf`;

        if (Platform.OS === "android") {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const safUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, "application/pdf");
            await FileSystem.writeAsStringAsync(safUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            showAlert({ title: "Success", message: "PDF Report saved successfully.", buttons: [{ text: "OK" }] });
          }
        } else {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        }
      } catch (error) {
        showAlert({ title: "Error", message: "Failed to export PDF.", buttons: [{ text: "OK" }] });
      }
    };

    showAlert({
      title: "Export Report",
      message: "Choose a format",
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "CSV", onPress: exportCSV },
        { text: "PDF", onPress: exportPDF }
      ]
    });
  }, [range, labels, messageData, userRegistrationData, users, violations, showAlert]);

  const handleDownloadChart = useCallback(async (chartName: string, ref: React.RefObject<ViewShot | null>) => {
    if (!ref.current?.capture) {
        showAlert({ title: "Error", message: "Failed to capture chart. The component is not ready.", buttons: [{ text: "OK" }] });
        return;
    }
    try {
        const uri = await ref.current.capture();
        if (!uri) throw new Error("Failed to capture chart URI.");

        const filename = `${chartName}_${range}_${new Date().toISOString().split('T')[0]}.png`;

        if (Platform.OS === "android") {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const safUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, "image/png");
                await FileSystem.writeAsStringAsync(safUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                showAlert({ title: "Success", message: "Chart image saved successfully.", buttons: [{ text: "OK" }] });
            }
        } else {
            await Sharing.shareAsync(uri, { UTI: '.png', mimeType: 'image/png' });
        }
    } catch (error) {
        console.error("Chart download error:", error);
        showAlert({ title: "Error", message: "Failed to save chart image.", buttons: [{ text: "OK" }] });
    }
  }, [range, showAlert]);

  useEffect(() => {
    if (isLoading || loadingUsers) {
      return;
    }

    // Stagger the rendering of cards to improve perceived performance and prevent UI freezing.
    const totalCards = 7;
    const timers = Array.from({ length: totalCards }, (_, i) => 
      setTimeout(() => {
        setVisibleCardCount(i + 1);
      }, (i + 1) * 80) // Stagger by 80ms
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isLoading, loadingUsers]);

  const parseDate = useCallback((str: string) => {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }, []);

  useEffect(() => {
    const processData = async () => {
      setIsLoading(true);
      setVisibleCardCount(0); // Reset visible cards for staggered rendering
      
      // The API now returns arrays of the correct length, so we can fetch data directly.
      // Label generation is handled by the `useMemo` hook above.

      try {
        const [userRes, msgRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/reports.php?type=users&range=${range}`),
          axios.get(`${API_BASE_URL}/reports.php?type=messages&range=${range}`)
        ]);

        if (userRes.data?.success && Array.isArray(userRes.data.data)) {
          setUserRegistrationData(userRes.data.data);
        } else {
          setUserRegistrationData(new Array(labels.length).fill(0));
        }

        if (msgRes.data?.success && Array.isArray(msgRes.data.data)) {
          setMessageData(msgRes.data.data);
        } else {
          setMessageData(new Array(labels.length).fill(0));
        }
      } catch (e) {
        console.error("Failed to fetch report data", e);
        setUserRegistrationData(new Array(labels.length).fill(0));
        setMessageData(new Array(labels.length).fill(0));
      }

      setIsLoading(false);
    };
    processData();
  }, [range]);

  useEffect(() => {
    if (range === 'monthly') {
      setTimeout(() => { // A small delay to ensure layout is complete before scrolling
        monthlyMessagesScrollViewRef.current?.scrollToEnd({ animated: true });
        monthlyUsersScrollViewRef.current?.scrollToEnd({ animated: true });
        monthlyViolationsScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [range]);

  const screenWidth = Dimensions.get("window").width;
  const baseChartWidth = screenWidth - 32;

  const chartWidth = useMemo(() => {
    if (range === 'monthly') return Math.max(baseChartWidth, labels.length * 60);
    return baseChartWidth;
  }, [range, baseChartWidth, labels.length]);

  if (loadingUsers || isLoading) return <ReportsSkeleton />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <ReportsHeader range={range} setRange={handleSetRange} onDownload={handleDownloadReport} />
      <Animated.View key={range} entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)}>
        <UserStatusCard 
            users={users} 
            viewShotRef={userStatusChartRef} 
            onDownload={() => handleDownloadChart('user_status', userStatusChartRef)} 
        />
        <NewRegistrationsCard 
            range={range} 
            data={userRegistrationData} 
            labels={labels} 
            chartWidth={chartWidth} 
            scrollRef={monthlyUsersScrollViewRef} 
            setSwipeEnabled={setSwipeEnabled} 
            viewShotRef={newRegistrationsChartRef}
            onDownload={() => handleDownloadChart('new_registrations', newRegistrationsChartRef)}
        />
        <MessagesChartCard 
            range={range} 
            data={messageData} 
            labels={labels} 
            chartWidth={chartWidth} 
            scrollRef={monthlyMessagesScrollViewRef} 
            setSwipeEnabled={setSwipeEnabled} 
            viewShotRef={messagesChartRef}
            onDownload={() => handleDownloadChart('messages_sent', messagesChartRef)}
        />
        <ScreeningTrendCard 
            range={range} 
            screeningTrend={screeningTrend} 
            chartWidth={chartWidth} 
            labels={labels} 
            viewShotRef={screeningTrendChartRef}
            onDownload={() => handleDownloadChart('screening_trend', screeningTrendChartRef)}
        />
        <ScreeningsCard 
            range={range} 
            screenings={screenings} 
            viewShotRef={screeningsChartRef}
            onDownload={() => handleDownloadChart('screening_results', screeningsChartRef)}
        />
        <ViolationsCard 
            range={range} 
            violationSeries={violationSeries} 
            chartWidth={chartWidth} 
            scrollRef={monthlyViolationsScrollViewRef} 
            setSwipeEnabled={setSwipeEnabled} 
            viewShotRef={violationsChartRef}
            onDownload={() => handleDownloadChart('violation_breakdown', violationsChartRef)}
        />
        <TopViolatorsCard range={range} topViolators={topViolators} />
      </Animated.View>
    </ScrollView>
  );
});

export default ReportsTab;

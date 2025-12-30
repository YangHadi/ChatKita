// app/sadmindashboard.tsx
import React, { useLayoutEffect, useState, useEffect, useMemo, useCallback, useReducer, useRef, memo } from "react";
import {
  View,
  ViewStyle,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  Alert,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect, useRouter } from "expo-router";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Line, Rect, Circle, Path, Text as SvgText, G, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, { useAnimatedStyle, FadeIn, FadeOut, useSharedValue, withRepeat, withSequence, withTiming, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from "react-native-reanimated";


// --- Types & Interfaces --- //
type AppStackParamList = { sadmindashboard: undefined };
type SadminNavProp = NativeStackNavigationProp<AppStackParamList, "sadmindashboard">;

type Metric = {
  activeUsers: number;
  suspendedUsers: number;
  messagesPerSec: number;
  avgMessageSize: number;
  violationsToday: number;
  screeningsToday: number;
  totalUsers: number;
  totalGroups: number;
};

type Health = {
  backend: string | null | undefined;
  myphp: string | null | undefined;
  database: string | null | undefined;
  cpu: number | string;
  memory: number | string;
};

type StatusKey = "ok" | "warn" | "error" | "unknown";
type Violation = { id: number; userId: number; userName: string; type: string; date: string };
type Screening = { id: number; userId: number; userName: string; type: string; result: string; date: string };
type UserItem = {
  id: number;
  name: string;
  status: "active" | "suspended";
  suspensionEndDate?: string;
  suspensionReason?: string;
};
type SvgLineChartProps = { data: number[]; width: number; height: number; color?: string; labels?: string[] };
type PieItem = { value: number; color: string };
type BarChartDataPoint = number | Record<string, number>;

type CustomAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type CustomAlertOptions = { title: string; message: string; buttons: CustomAlertButton[] };

// --- Constants & Mock Data --- //
/* ========================
   Mock Data (Centralized)
   NOTE: Replace this with actual API calls.
======================== */
const MOCK_DATA = {
  initialMetrics: {
    activeUsers: 120,
    suspendedUsers: 15,
    messagesPerSec: 45,
    avgMessageSize: 256,
    violationsToday: 5,
    screeningsToday: 12,
    totalUsers: 135,
    totalGroups: 12,
  },
  violations: [
    { id: 1, userId: 3, userName: "User 3", type: "spam", date: "2025-12-07" },
    { id: 2, userId: 5, userName: "User 5", type: "offensive", date: "2025-12-07" },
    { id: 3, userId: 12, userName: "User 12", type: "harassment", date: "2025-12-08" },
    { id: 4, userId: 23, userName: "User 23", type: "spam", date: "2025-12-08" },
  ],
  screenings: [
    { id: 1, userId: 2, userName: "User 2", type: "profile", result: "passed", date: "2025-12-07" },
    { id: 2, userId: 5, userName: "User 5", type: "content", result: "flagged", date: "2025-12-07" },
    { id: 3, userId: 8, userName: "User 8", type: "profile", result: "flagged", date: "2025-12-08" },
  ],
  users: Array.from({ length: 200 }, (_, i): UserItem => ({
    id: i + 1,
    name: `User ${i + 1}`,
    status: i % 10 === 0 ? "suspended" : "active",
    suspensionEndDate: i % 10 === 0 ? "2025-12-31" : undefined,
    suspensionReason: i % 10 === 0 ? "Repeated spamming" : undefined,
  })),
  reports: {
    chartsData: {
      daily: { messages: [12, 5, 7, 10, 6, 14, 9], users: [70, 50, 55, 60, 58, 62, 65], labels: [{ label: "Sun" }, { label: "Mon" }, { label: "Tue" }, { label: "Wed" }, { label: "Thu" }, { label: "Fri" }, { label: "Sat" }] },
      weekly: { messages: [70, 55, 120, 90], users: [300, 320, 350, 330], labels: [{ label: "W1" }, { label: "W2" }, { label: "W3" }, { label: "W4" }] },
      monthly: { messages: [300, 420, 390, 520, 480, 610, 550, 720, 680, 750, 800, 850], users: [1200, 1350, 1250, 1400, 1300, 1500, 1600, 1750, 1700, 1800, 1850, 1900], labels: [{ label: "Jan" }, { label: "Feb" }, { label: "Mar" }, { label: "Apr" }, { label: "May" }, { label: "Jun" }, { label: "Jul" }, { label: "Aug" }, { label: "Sep" }, { label: "Oct" }, { label: "Nov" }, { label: "Dec" }] },
    },
    screeningsData: [
      { label: "Passed", value: 75, color: "#4CAF50" },
      { label: "Flagged", value: 25, color: "#F39C12" },
    ],
    screeningTrend: { daily: [50, 60, 70, 65, 80, 75, 90], weekly: [350, 400, 380, 420], monthly: [1500, 1600, 1550, 1700, 1650, 1800, 1750, 1900, 1850, 2000, 1950, 2100] },
    violationSeries: {
      daily: [
        { label: "Sun", spam: 5, offensive: 1, harassment: 0 }, { label: "Mon", spam: 5, offensive: 2, harassment: 1 }, { label: "Tue", spam: 3, offensive: 1, harassment: 2 }, { label: "Wed", spam: 4, offensive: 3, harassment: 1 }, { label: "Thu", spam: 2, offensive: 4, harassment: 3 }, { label: "Fri", spam: 6, offensive: 2, harassment: 2 }, { label: "Sat", spam: 3, offensive: 2, harassment: 1 },
      ],
      weekly: [
        { label: "W1", spam: 25, offensive: 10, harassment: 5 }, { label: "W2", spam: 30, offensive: 15, harassment: 8 }, { label: "W3", spam: 22, offensive: 12, harassment: 10 }, { label: "W4", spam: 28, offensive: 18, harassment: 7 },
      ],
      monthly: [
        { label: "Jan", spam: 120, offensive: 50, harassment: 30 }, { label: "Feb", spam: 130, offensive: 55, harassment: 35 }, { label: "Mar", spam: 110, offensive: 60, harassment: 40 }, { label: "Apr", spam: 140, offensive: 65, harassment: 45 }, { label: "May", spam: 150, offensive: 70, harassment: 50 }, { label: "Jun", spam: 160, offensive: 75, harassment: 55 }, { label: "Jul", spam: 170, offensive: 80, harassment: 60 }, { label: "Aug", spam: 180, offensive: 85, harassment: 65 }, { label: "Sep", spam: 175, offensive: 90, harassment: 70 }, { label: "Oct", spam: 190, offensive: 95, harassment: 75 }, { label: "Nov", spam: 200, offensive: 100, harassment: 80 }, { label: "Dec", spam: 210, offensive: 105, harassment: 85 },
      ],
    },
    topViolators: {
      daily: [
        { id: 1, name: "User 5", violationCount: 7 }, { id: 2, name: "User 12", violationCount: 5 }, { id: 3, name: "User 23", violationCount: 4 }, { id: 4, name: "User 3", violationCount: 3 }, { id: 5, name: "User 8", violationCount: 2 },
      ],
      weekly: [
        { id: 1, name: "User 12", violationCount: 25 }, { id: 2, name: "User 5", violationCount: 22 }, { id: 3, name: "User 42", violationCount: 18 }, { id: 4, name: "User 7", violationCount: 15 }, { id: 5, name: "User 23", violationCount: 11 },
      ],
      monthly: [
        { id: 1, name: "User 12", violationCount: 112 }, { id: 2, name: "User 42", violationCount: 98 }, { id: 3, name: "User 5", violationCount: 85 }, { id: 4, name: "User 99", violationCount: 76 }, { id: 5, name: "User 7", violationCount: 68 },
      ],
    },
  }
};

const STATUS_COLORS: Record<StatusKey, string> = {
  ok: "#2ECC71",
  warn: "#F39C12",
  error: "#E74C3C",
  unknown: "#555555",
};


// --- Helper Functions --- //

const parseStatus = (raw?: string | null): { key: StatusKey; label: string } => {
  if (!raw) return { key: "unknown", label: "Unknown" };

  const s = String(raw).trim().toLowerCase();

  // ❌ ERROR first (strong signals)
  if (
    s.includes("❌") ||
    s.includes("disconnected") ||
    s.includes("down") ||
    s.includes("failed") ||
    s.includes("error")
  ) {
    return { key: "error", label: raw };
  }

  // ⚠️ WARNING
  if (
    s.includes("⚠") ||
    s.includes("⚠️") ||
    s.includes("slow") ||
    s.includes("degraded") ||
    s.includes("warning")
  ) {
    return { key: "warn", label: raw };
  }

  // ✅ OK (use whole words, not substrings)
  if (
    s === "connected" ||
    s === "running" ||
    s.includes("✅") ||
    s.includes("ok")
  ) {
    return { key: "ok", label: raw };
  }

  return { key: "unknown", label: raw };
};

const getUsageColor = (usage: number) => {
  if (usage > 90) return STATUS_COLORS.error;
  if (usage > 70) return STATUS_COLORS.warn;
  return STATUS_COLORS.ok;
};

/**
 * Calculates control points for a smooth Bezier curve.
 * This is used to create the curved lines in the line chart.
 * @param current The current point.
 * @returns A tuple containing the [x, y] coordinates for the control point.
 */
const controlPoint = (
  current: { x: number; y: number },
  previous: { x: number; y: number } | undefined,
  next: { x: number; y: number } | undefined,
  isEnd?: boolean
): [number, number] => {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.2;
  const o = {
    x: n.x - p.x,
    y: n.y - p.y,
  };
  const angle = Math.atan2(o.y, o.x);
  const length = Math.sqrt(o.x * o.x + o.y * o.y) * smoothing;
  const x = current.x + Math.cos(angle + (isEnd ? Math.PI : 0)) * length;
  const y = current.y + Math.sin(angle + (isEnd ? Math.PI : 0)) * length;
  return [x, y];
};


// --- Reusable UI Components --- //

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  highlight?: boolean;
  color?: string;
  onPress?: () => void;
  badgeVisible?: boolean;
}> = memo(({ title, value, highlight, color, onPress, badgeVisible }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!badgeVisible) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, [badgeVisible]);

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[
        styles.dashboardCard,
        highlight && { backgroundColor: color || "#FFF3E0", borderWidth: 1, borderColor: "#ccc" },
        { overflow: "visible" },
      ]}
    >
      <View style={{ overflow: "visible" }}>
        <Text style={[styles.metricTitle, highlight && color ? { color: "#333" } : null]} numberOfLines={1} ellipsizeMode="tail">{title}</Text><Text style={[
            styles.metricValue,
            highlight && color
              ? { color: color === "#FFF3E0" ? "#F39C12" : "#E74C3C" }
              : null,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >{String(value)}</Text>{badgeVisible ? (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 5,
                right: -4,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#E74C3C",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
              },
              animatedBadgeStyle,
            ]}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 12 }}>!</Text>
          </Animated.View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const SvgLineChart: React.FC<SvgLineChartProps> = memo(({
  data,
  width,
  height,
  color = "#4A90E2",
  labels = [],
}) => {
  if (!data || data.length === 0) {
    return <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}><Text>No data</Text></View>;
  }

  const padding = { top: 30, bottom: 30, left: 35, right: 35 };
  const max = Math.max(...data, 1);

  const points = data.map((value, i) => {
    const x = padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const y = height - padding.bottom - (value / max) * (height - padding.top - padding.bottom);
    return { x, y, value };
  });

  const linePath = useMemo(() => {
    if (points.length < 2) return "";

    return points.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;

      const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
      const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);

      return `${acc} C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point.x},${point.y}`;
    }, "");
  }, [points]);

  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.2" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* axis */}
      <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#eee" />
      <Line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#eee" />

      {/* Y-axis labels and grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(tick => {
        const y = height - padding.bottom - tick * (height - padding.top - padding.bottom);
        const label = Math.round(tick * max);
        return (
          <G key={tick}>
            <SvgText x={padding.left - 12} y={y + 4} fill="#888" fontSize="10" textAnchor="end">
              {label}
            </SvgText>
            {tick > 0 && (
              <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeDasharray="2,2" />
            )}
          </G>
        );
      })}

      {/* X-axis labels */}
      {labels.map((label, i) => {
        if (data.length <= 1) return null;
        let x = padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
        let textAnchor: "start" | "middle" | "end" = "middle";
        if (i === 0) {
          textAnchor = "start";
        } else if (i === labels.length - 1) {
          textAnchor = "end";
        }
        return (
          <SvgText
            key={i}
            x={x}
            y={height - padding.bottom + 15}
            fill="#555"
            fontSize="12"
            textAnchor={textAnchor}
          >{label}</SvgText>
        );
      })}

      {/* Gradient Area */}
      <Path d={areaPath} fill="url(#grad)" />

      {/* line */}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2.5}
        fill="none"
      />

      {/* dots */}
      {points.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={6} fill={color} fillOpacity={0.2} />
          <Circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke={color} strokeWidth={1.5} />
          {/* Render stroke behind the fill for a "halo" effect to improve readability */}
          <SvgText x={p.x} y={p.y - 12} fill="transparent" fontSize="12" fontWeight="bold" textAnchor="middle" stroke="#fff" strokeWidth={3} strokeLinejoin="round">
            {p.value}
          </SvgText>
          <SvgText x={p.x} y={p.y - 12} fill="#333" fontSize="12" fontWeight="bold" textAnchor="middle">
            {p.value}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
});

const SvgPieChart: React.FC<{
  data: PieItem[];
  radius: number;
  innerRadius?: number;
}> = ({ data, radius, innerRadius = 0 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let startAngle = 0;

  const polarToCartesian = (cx: number, cy: number, r: number, a: number) => ({
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  });

  if (total === 0) {
    return (
      <Svg width={radius * 2} height={radius * 2}>
        <G transform={`translate(${radius}, ${radius})`}>
          <Circle cx={0} cy={0} r={radius} fill="#E0E0E0" />
          {innerRadius > 0 && <Circle cx={0} cy={0} r={innerRadius} fill="#fff" />}
        </G>
      </Svg>
    );
  }

  return (
    <Svg width={radius * 2} height={radius * 2}>
      <G transform={`translate(${radius}, ${radius})`}>
        {data.map((slice, i) => {
          const sliceAngle = (slice.value / total) * Math.PI * 2;
          const endAngle = startAngle + sliceAngle;
          const start = polarToCartesian(0, 0, radius, startAngle);
          const end = polarToCartesian(0, 0, radius, endAngle);
          const innerStart = polarToCartesian(0, 0, innerRadius, startAngle);
          const innerEnd = polarToCartesian(0, 0, innerRadius, endAngle);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;

          const path = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
          startAngle = endAngle;
          return <Path key={i} d={path} fill={slice.color} />;
        })}

        {innerRadius > 0 && (
          <Circle cx={0} cy={0} r={innerRadius} fill="#fff" />
        )}
      </G>
    </Svg>
  );
};
const SvgBarChart: React.FC<{
  data: BarChartDataPoint[];
  width: number;
  height: number;
  color?: string;
  stackColors?: Record<string, string>;
  labels?: string[];
}> = memo(({ data, width, height, color = "#E74C3C", labels = [], stackColors }) => {
  const padding = { top: 30, bottom: 30, left: 35, right: 20 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const barWidth = chartWidth / data.length;

  const totals = data.map(d => typeof d === 'number' ? d : Object.values(d).reduce((s, v) => s + v, 0));
  const max = Math.max(...totals, 1);

  return (
    <Svg width={width} height={height}>
      {/* Y-axis labels and grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(tick => {
        const y = height - padding.bottom - tick * chartHeight;
        const label = Math.round(tick * max);
        return (
          <G key={tick}>
            <SvgText x={padding.left - 8} y={y + 4} fill="#888" fontSize="10" textAnchor="end">
              {label}
            </SvgText>
            {tick > 0 && (
              <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeDasharray="2,2" />
            )}
          </G>
        );
      })}

      {data.map((v, i) => {
        const totalValue = totals[i];
        const totalHeight = (totalValue / max) * chartHeight;
        const x = padding.left + i * barWidth;

        const renderBar = () => {
          if (typeof v === 'number') {
            return <Rect x={x} y={height - padding.bottom - totalHeight} width={barWidth - 6} height={totalHeight} fill={color} rx={4} />;
          }

          if (stackColors) {
            let currentHeight = 0;
            return (
              <G>
                {Object.entries(v).map(([key, value]) => {
                  const segmentHeight = (value / max) * chartHeight;
                  const rect = (
                    <Rect
                      key={key}
                      x={x}
                      y={height - padding.bottom - currentHeight - segmentHeight}
                      width={barWidth - 6}
                      height={segmentHeight}
                      fill={stackColors[key] || color}
                    />
                  );
                  currentHeight += segmentHeight;
                  return rect;
                })}
                {/* Add a border to the stacked bar */}
                <Rect x={x} y={height - padding.bottom - totalHeight} width={barWidth - 6} height={totalHeight} fill="transparent" stroke="#fff" strokeWidth={0.5} rx={4} />
              </G>
            );
          }
          return null;
        };

        return (
          <G key={i}>
            {renderBar()}
            <SvgText
              x={x + (barWidth - 6) / 2}
              y={height - padding.bottom - totalHeight - 5}
              fill="#333"
              fontSize="12"
              textAnchor="middle"
            >
              {totalValue}
            </SvgText>
            {labels[i] && (
              <SvgText
                x={x + (barWidth - 6) / 2}
                y={height - padding.bottom + 15}
                fill="#555"
                fontSize="12"
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
});

const ReportCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.panelCard}>
    <Text style={styles.panelTitle}>{title}</Text>
    {children}
  </View>
);

const ChartContainer: React.FC<{
  children: React.ReactNode;
  isScrollable?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}> = ({ children, isScrollable, scrollRef, onTouchStart, onTouchEnd }) => {
  if (isScrollable) {
    // When the user touches the scrollable chart, we notify the parent to disable tab swiping.
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={scrollRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{children}</ScrollView>;
  }
  return <>{children}</>;
};

// --- User Management Components --- //

const UserCard: React.FC<{
  user: UserItem;
  violations: Violation[];
  screenings: Screening[];
  search: string;
  onPress: () => void;
  selected: boolean;
  onLongPress: () => void;
}> = memo(({ user, violations, screenings, search, onPress, selected, onLongPress }) => { // prettier-ignore
  const highlightName = useMemo(() => {
    if (!search) return <Text>{user.name}</Text>;
    return user.name.split(new RegExp(`(${search})`, "gi")).map((part, i) => (
      <Text
        key={i}
        style={{ backgroundColor: part.toLowerCase() === search.toLowerCase() ? "#FFD700" : "transparent" }}
      >
        {part}
      </Text>
    ));
  }, [user.name, search]);

  const animatedValue = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    animatedValue.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected]);

  const animatedCardStyle = useAnimatedStyle(() => {
    const borderColor = animatedValue.value === 1 ? "#4A90E2" : "transparent"; // Animate only the color
    return { borderColor };
  });

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      {({ pressed }) => ( // prettier-ignore
        <Animated.View style={[styles.userCard, animatedCardStyle, { opacity: pressed ? 0.6 : 1 }]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {highlightName}
            </View>
            <Text style={[styles.userStatus, { color: user.status === "active" ? "green" : "red" }]}>
              {user.status}
            </Text>
          </View>

          <View style={{ flexDirection: "row" }}>
            {violations.length > 0 && (
              <View style={[styles.userCardBadge, selected && { opacity: 0.5 }]}>
                <Text style={styles.userCardBadgeText}>V</Text>
              </View>
            )}
            {screenings.length > 0 && (
              <View style={[styles.userCardBadge, { backgroundColor: "#F39C12" }, selected && { opacity: 0.5 }]}>
                <Text style={styles.userCardBadgeText}>S</Text>
              </View>
            )}
          </View>

          {selected && (
            <Animated.View
              style={[{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(74, 144, 226, 0.2)",
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
              }]}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
            />
          )}
        </Animated.View>
      )} 
    </Pressable>
  );
});

const ProgressBar: React.FC<{ progress: number; color: string }> = memo(({ progress, color }) => {
  const width = `${Math.max(0, Math.min(100, progress))}%` as ViewStyle["width"];

  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width, backgroundColor: color }]} />
    </View>
  );
});

const SuspendUserModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (duration: number, reason: string) => void;
}> = memo(({ visible, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(7); // Default to 7 days
  const durations = [
    { label: '1 Day', value: 1 },
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: 'Permanent', value: -1 },
  ];

  const handleSubmit = () => {
    if (!reason.trim()) {
      // In a real app, you might show a small validation error.
      return;
    }
    onSubmit(duration, reason);
    onClose(); // Close the modal on successful submission
    setReason(''); // Reset for next time
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalSectionTitle}>Suspend User</Text>
          <Text style={{ marginBottom: 16, color: '#555' }}>Select a duration and provide a reason for the suspension.</Text>
          <View style={styles.durationSelector}>
            {durations.map(d => (
              <TouchableOpacity
                key={d.value}
                style={[styles.durationButton, duration === d.value && styles.durationButtonSelected]}
                onPress={() => setDuration(d.value)}
              >
                <Text style={[styles.durationButtonText, duration === d.value && styles.durationButtonTextSelected]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.reasonInput} placeholder="Reason for suspension..." value={reason} onChangeText={setReason} multiline />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#e0e0e0' }]} onPress={onClose}>
              <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E74C3C' }]} onPress={handleSubmit}>
              <Text style={styles.modalButtonText}>Confirm Suspension</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
});

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

const UserModal: React.FC<{
  visible: boolean;
  user: UserItem | null;
  violations: Violation[];
  screenings: Screening[];
  onClose: () => void;
  onSuspend: (userId: number) => void;
  onLiftSuspension: (userId: number) => void;
  onRemove: (userId: number) => void;
}> = memo(({ visible, user, violations, screenings, onClose, onSuspend, onLiftSuspension, onRemove }) => {
  if (!user) return null;
  const showAlert = useAlert();

  const userViolations = violations.filter((v) => v.userId === user.id);
  const userScreenings = screenings.filter((s) => s.userId === user.id);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.modalContent}>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>

              {/* --- Modal Header --- */}
              <View style={styles.modalHeader}>
                <Ionicons name="person-circle" size={50} color="#4A90E2" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.modalUserName}>{user.name}</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: user.status === 'active' ? '#2ECC71' : '#E74C3C' }]}>
                    <Text style={styles.modalStatusBadgeText}>{user.status}</Text>
                  </View>
                </View>
              </View>

              {/* --- Modal Content --- */}
              <ScrollView style={{ maxHeight: 300, marginVertical: 16 }}>
                {userViolations.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Violations ({userViolations.length})</Text>
                    {userViolations.map(v => (
                      <View key={`v-${v.id}`} style={styles.modalListItem}>
                        <Ionicons name="alert-circle-outline" size={16} color="#E74C3C" style={{ marginRight: 8 }} />
                        <Text style={styles.modalListItemText}>{v.type} on {v.date}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {userScreenings.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Screening History ({userScreenings.length})</Text>
                    {userScreenings.map(s => (
                      <View key={`s-${s.id}`} style={styles.modalListItem}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#F39C12" style={{ marginRight: 8 }} />
                        <Text style={styles.modalListItemText}>{s.type} - <Text style={{ color: s.result === 'passed' ? 'green' : 'orange' }}>{s.result}</Text> on {s.date}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {user.status === 'suspended' && (user.suspensionReason || user.suspensionEndDate) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Suspension Details</Text>
                    {user.suspensionReason && <Text style={styles.modalListItemText}><Text style={{fontWeight: 'bold'}}>Reason:</Text> {user.suspensionReason}</Text>}
                    {user.suspensionEndDate && <Text style={styles.modalListItemText}><Text style={{fontWeight: 'bold'}}>Ends on:</Text> {user.suspensionEndDate}</Text>}
                  </View>
                )}
                {userViolations.length === 0 && userScreenings.length === 0 && user.status !== 'suspended' && (
                  <View style={styles.emptyListContainer}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#2ECC71" />
                    <Text style={styles.emptyStateText}>This user has a clean record.</Text>
                  </View>
                )}
              </ScrollView>

              {/* --- Modal Actions --- */}
              <View style={styles.modalActions}>
                {user.status === 'active' ? (
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#F39C12' }]} onPress={() => onSuspend(user.id)}>
                    <Ionicons name="ban-outline" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Suspend User</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#2ECC71' }]} onPress={() => onLiftSuspension(user.id)}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Lift Suspension</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#E74C3C' }]}
                  onPress={() =>
                    showAlert({
                      title: "Remove User",
                      message: `Are you sure you want to remove ${user.name}? This action cannot be undone.`,
                      buttons: [
                        { text: "Cancel", style: "cancel" },
                        { text: "Yes, Remove", style: "destructive", onPress: () => { onRemove(user.id); onClose(); } },
                      ]
                    })
                  }
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

/* ========================
   Tabs
======================== */
const Tab = createMaterialTopTabNavigator();

/* -------------------------- DashboardTab -------------------------- */
const DashboardTab: React.FC<{ // prettier-ignore
  metrics: Metric;
  violations: Violation[];
  screenings: Screening[];
}> = memo(({ metrics, violations, screenings }) => {
  const [modalType, setModalType] = useState<"screenings" | "violations" | null>( // prettier-ignore
    null
  );
  const [reviewed, dispatchReviewed] = useReducer(
    (
      state: { screenings: boolean; violations: boolean },
      action: "view_screenings" | "view_violations" | "reset_screenings" | "reset_violations"
    ) => {
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

  // reset badge if new items arrive
  // API_INTEGRATION_POINT: This effect runs when new metrics arrive.
  // You might fetch `metrics.screeningsToday` and `metrics.violationsToday`
  // from a real-time API endpoint (e.g., using WebSockets or polling).
  // When new data comes in, this logic correctly resets the "reviewed"
  // status to show the notification badge again.
  // You could also store the `reviewed` state in AsyncStorage if you want
  // it to persist across app launches for the admin.
  useEffect(() => {
    if (metrics.screeningsToday > 0 && reviewed.screenings) dispatchReviewed("reset_screenings");
  }, [metrics.screeningsToday, reviewed.screenings]);

  useEffect(() => {
    if (metrics.violationsToday > 0 && reviewed.violations) dispatchReviewed("reset_violations");
  }, [metrics.violationsToday, reviewed.violations]);

  // API_INTEGRATION_POINT: This `useEffect` simulates real-time health checks.
  // Replace the `setInterval` with a call to your backend health-check endpoint.
  // For example: `fetch('/api/health-check.php')`.
  // This would return the status of your backend, database, etc.
  useEffect(() => {
    const randomFrom = (list: string[]) =>
      list[Math.floor(Math.random() * list.length)];

    const interval = setInterval(() => {
      setHealth((prev) => ({
        backend: randomFrom(["Connected", "Disconnected"]),
        myphp: randomFrom(["Running", "Stopped"]),
        database: randomFrom(["OK", "Response Slow", "Down"]),
        cpu: Math.max(
          0,
          Math.min(
            100,
            Number(prev.cpu) + Math.floor(Math.random() * 15 - 7)
          )
        ),
        memory: Math.max(
          0,
          Math.min(
            100,
            Number(prev.memory) + Math.floor(Math.random() * 10 - 5)
          )
        ),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const totalUsers = Math.max(1, metrics.activeUsers + metrics.suspendedUsers);
  const radius = 95;
  const labelOffset = 12;

  const [health, setHealth] = useState<Health>({
    backend: "Connected",
    myphp: "Running",
    database: "Response Slow",
    cpu: 35,
    memory: 68,
  });

  const items = [
    { label: "Backend", value: health.backend },
    { label: "MyPHP", value: health.myphp },
    { label: "Database", value: health.database },
  ];

  const userStatusData = [
    { value: metrics.activeUsers, color: "#4A90E2" },
    { value: metrics.suspendedUsers, color: "#E74C3C" },
  ];

  const recentFlagged = violations.slice(-5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.sectionTitle}>Live Metrics</Text>

      <View style={styles.metricsContainer}>
        <MetricCard title="Active Users" value={metrics.activeUsers} /><MetricCard title="Suspended Users" value={metrics.suspendedUsers} /><MetricCard title="Msgs/min" value={metrics.messagesPerSec} /><MetricCard title="Avg Msg Size" value={`${metrics.avgMessageSize} B`} /><MetricCard title="Total Users" value={metrics.totalUsers} /><MetricCard title="Total Groups" value={metrics.totalGroups} />

        <MetricCard
          title="Screenings Today"
          value={metrics.screeningsToday}
          highlight
          color="#FFF3E0"
          onPress={() => {
            console.log("ADMIN_ACTION: Viewed today's screenings modal.");
            setModalType("screenings");
            dispatchReviewed("view_screenings");
          }}
          badgeVisible={!reviewed.screenings && metrics.screeningsToday > 0}
        />

        <MetricCard
          title="Violations Today"
          value={metrics.violationsToday}
          highlight
          color="#FDEDEC"
          onPress={() => {
            console.log("ADMIN_ACTION: Viewed today's violations modal.");
            setModalType("violations");
            dispatchReviewed("view_violations");
          }}
          badgeVisible={!reviewed.violations && metrics.violationsToday > 0}
        />
      </View>

      {/* Pie Chart */}
      <View style={[styles.panelCard, { padding: 16 }]}>
        <Text style={styles.panelTitle}>User Status</Text>
        <View style={styles.pieRow}>
          <View style={{ width: radius * 2, height: radius * 2, overflow: 'visible', justifyContent: "center", alignItems: "center" }}>
            <SvgPieChart
              radius={90}
              innerRadius={45}
              data={userStatusData.filter(d => d.value > 0)}
            />
            <View style={styles.pieCenter}>
              <Text style={styles.pieCenterNumber}>{totalUsers}</Text>
              <Text style={styles.pieCenterLabel}>Users</Text>
            </View>
          </View>

          <View style={styles.legendContainer}>
            {userStatusData.map((item, index) => (
              <View key={index} style={styles.pieLegendRow}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>
                  {index === 0 ? `Active (${metrics.activeUsers})` : `Suspended (${metrics.suspendedUsers})`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Modal transparent visible={!!modalType} animationType="fade" onRequestClose={() => setModalType(null)}>
        <TouchableWithoutFeedback onPress={() => setModalType(null)}>
          <View style={styles.modalBackdrop}>
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalContent}>
                <TouchableOpacity onPress={() => setModalType(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
                <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 12 }}>
                  {modalType === "screenings" ? "Screenings Today" : "Violations Today"}
                </Text>

                <ScrollView contentContainerStyle={{ paddingBottom: 20, maxHeight: 300 }}>
                  {(modalType === "screenings" ? screenings : violations).map((item, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: modalType === "violations" ? "#FDEDEC" : "#FFF3E0",
                        padding: 12,
                        borderRadius: 10,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: modalType === "violations" ? "#E74C3C" : "#F39C12",
                      }}
                    >
                      <Text style={{ fontWeight: "600" }}>{item.userName}</Text>
                      <Text style={{ fontSize: 12, color: "#555" }}>
                        {modalType === "screenings"
                          ? `Type: ${(item as Screening).type} | Result: ${(item as Screening).result}`
                          : `Type: ${(item as Violation).type} | Date: ${(item as Violation).date}`}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- Improved System Health UI --- */}
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>System Health</Text>
        <View style={styles.healthGrid}>
          {items.map((item, index) => {
            const status = parseStatus(item.value);
            return (
              <View key={index} style={styles.healthGridItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={[styles.healthStatusDot, { backgroundColor: STATUS_COLORS[status.key] }]} />
                  <Text style={styles.healthLabel}>{item.label}</Text>
                </View>
                <Text style={styles.healthStatus} numberOfLines={1}>{status.label}</Text>
              </View>
            );
          })}
        </View>

        {/* CPU */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.healthUsageRow}>
            <Text style={styles.healthLabel}>CPU Usage</Text>
            <Text style={{ color: getUsageColor(Number(health.cpu)), fontWeight: '600' }}>
              {health.cpu}%
            </Text>
          </View>
          <ProgressBar
            progress={Number(health.cpu)}
            color={getUsageColor(Number(health.cpu))}
          />
        </View>

        {/* Memory */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.healthUsageRow}>
            <Text style={styles.healthLabel}>Memory Usage</Text>
            <Text style={{ color: getUsageColor(Number(health.memory)), fontWeight: '600' }}>
              {health.memory}%
            </Text>
          </View>
          <ProgressBar
            progress={Number(health.memory)}
            color={getUsageColor(Number(health.memory))}
          />
        </View>
      </View>

      {/* Violation Breakdown */}
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Violation Breakdown</Text>
        <View>
          {(() => {
            const violationTypes = { Spam: "#E74C3C", Offensive: "#F39C12", Harassment: "#9B59B6" };
            const counts = Object.keys(violationTypes).reduce((acc, type) => {
              acc[type] = violations.filter(v => v.type.toLowerCase() === type.toLowerCase()).length;
              return acc;
            }, {} as Record<string, number>);

            const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

            return Object.entries(counts).map(([type, count]) => {
              const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return (
                <View key={type} style={styles.violationRow}>
                  <Text style={styles.violationLabel}>{type}</Text>
                  <View style={styles.violationBarContainer}>
                    <View style={[styles.violationBar, { width: `${percentage}%`, backgroundColor: violationTypes[type as keyof typeof violationTypes] }]}>
                      {percentage > 15 && <Text style={styles.violationBarText}>{`${Math.round(percentage)}%`}</Text>}
                    </View>
                  </View>
                  <Text style={styles.violationCount}>{count}</Text>
                </View>
              );
            });
          })()}
        </View>
      </View>

      {/* Recent Flagged Items */}
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Recent Flagged Activity</Text>
        {recentFlagged.length > 0 ? (
          recentFlagged.map((item, index) => {
            const violationColors: Record<string, string> = { spam: "#E74C3C", offensive: "#F39C12", harassment: "#9B59B6" };
            const tagColor = violationColors[item.type.toLowerCase()] || '#555';
            return (
              <View key={item.id} style={[styles.flaggedItem, index === recentFlagged.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.flaggedItemIcon}>
                  <Ionicons name="person-circle-outline" size={32} color="#555" />
                </View>
                <View style={styles.flaggedItemContent}>
                  <Text style={styles.flaggedItemUser}>{item.userName}</Text>
                  <Text style={styles.flaggedItemDate}>{item.date}</Text>
                </View>
                <View style={[styles.flaggedItemTag, { backgroundColor: tagColor }]}>
                  <Text style={styles.flaggedItemTagText}>{item.type}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyStateText}>No recent violations found.</Text>
        )}
      </View>
    </ScrollView>
  );
});

/* -------------------------- UsersTab -------------------------- */
const UsersTab: React.FC<{
  users: UserItem[];
  violations: Violation[];
  screenings: Screening[];
}> = memo(({ users, violations, screenings }) => {
  /* --------------------------
     State & Hooks
  -------------------------- */
  // State for `users` is now passed via props.
  // The functions to update users are accessed from context.
  const { suspendUser, liftSuspension, removeUser, removeUsersBulk } = useDashboardContext();

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSuspendModalVisible, setIsSuspendModalVisible] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<number | null>(null);
  const [usersToSuspend, setUsersToSuspend] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const showAlert = useAlert();
  const [isProcessingList, setIsProcessingList] = useState(false);
  const [sortMode, setSortMode] = useState<"alphabetical" | "status">("alphabetical");

  const ITEMS_PER_PAGE = 20;
  const EMPTY_VIOLATIONS: Violation[] = useMemo(() => [], []);
  const EMPTY_SCREENINGS: Screening[] = useMemo(() => [], []);

  /* --------------------------
     Effects
  -------------------------- */
  useEffect(() => {
    // When search or sort changes, show loader and reset to page 1
    setIsProcessingList(true);
    setCurrentPage(1);
    // A timeout allows the UI to show the loader before the potentially blocking filter/sort operation
    const timer = setTimeout(() => setIsProcessingList(false), 100);
    return () => clearTimeout(timer);
  }, [searchQuery, sortMode]);

  // Exit selection mode if no users selected
  useEffect(() => {
    if (selectedUserIds.size === 0 && selectionMode) {
      setSelectionMode(false);
    }
  }, [selectedUserIds, selectionMode]);

  // Clear selection when the user navigates away from the tab
  useFocusEffect(
    useCallback(() => {
      // The cleanup function runs when the tab loses focus.
      return () => {
        setSelectionMode(false);
        setSelectedUserIds(new Set());
      };
    }, []) // Empty dependency array ensures the effect callback is stable.
  );

  /* --------------------------
     Memoized Maps
  -------------------------- */
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

  /* --------------------------
     Filter & Sort Users
  -------------------------- */
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Create a shallow copy before sorting. The `sort()` method mutates the array,
    // so we create a copy to ensure a new array reference is returned, which is
    // necessary for React to detect changes and re-render the list.
    const sorted = [...filtered];
    
    if (sortMode === "alphabetical") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => {
        if (a.status === b.status) {
          return a.name.localeCompare(b.name); // Secondary sort: alphabetical
        }
        return a.status === "active" ? -1 : 1; // Primary sort: active users first
      });
    }
    return sorted;
  }, [users, searchQuery, sortMode]);

  const displayedUsers = useMemo(
    () => filteredUsers.slice(0, currentPage * ITEMS_PER_PAGE),
    [filteredUsers, currentPage]
  );

  const modalUser = useMemo(
    () => users.find(u => u.id === selectedUser?.id) || selectedUser,
    [users, selectedUser]
  );

  const openUserModal = useCallback((user: UserItem) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  }, []);

  const closeUserModal = useCallback(() => {
    setSelectedUser(null);
    setIsModalVisible(false);
  }, []);

  const toggleUserSelection = useCallback((userId: number) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(userId) ? newSet.delete(userId) : newSet.add(userId);
      return newSet;
    });
  }, []);

  const handleLongPressUser = useCallback(
    (userId: number) => {
      if (!selectionMode) {
        setSelectionMode(true);
      }
      toggleUserSelection(userId);
    },
    [selectionMode, toggleUserSelection]
  );

  const handlePressUser = useCallback((user: UserItem) => {
      if (selectionMode) {
        toggleUserSelection(user.id);
      } else {
        openUserModal(user);
      }
    },
    [selectionMode, openUserModal, toggleUserSelection]
  );

  const handleSuspendUser = useCallback((userId: number) => {
    setIsModalVisible(false); // Close the details modal
    setUserToSuspend(userId);
    setIsSuspendModalVisible(true);
  }, []);

  const handleBulkSuspend = useCallback((userIds: Set<number>) => {
    setUsersToSuspend(userIds);
    setIsSuspendModalVisible(true);
  }, []);

  const handleConfirmBulkSuspension = useCallback((duration: number, reason: string) => {
    usersToSuspend.forEach(userId => {
      suspendUser(userId, duration, reason);
    });
    setIsSuspendModalVisible(false);
    setUsersToSuspend(new Set());
    setSelectedUserIds(new Set()); // Clear selection after action
  }, [usersToSuspend, suspendUser]);



  const handleConfirmSuspension = useCallback((duration: number, reason: string) => {
    if (userToSuspend) {
      suspendUser(userToSuspend, duration, reason);
    }
    setIsSuspendModalVisible(false);
    setUserToSuspend(null);
  }, [userToSuspend, suspendUser]);

  // --- Bulk Action Logic ---
  const { canSuspend, canLift, toggleActionLabel } = useMemo(() => {
    if (selectedUserIds.size === 0) {
      return { canSuspend: false, canLift: false, toggleActionLabel: 'Toggle' };
    }
    const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
    const allActive = selectedUsers.every(u => u.status === 'active');
    const allSuspended = selectedUsers.every(u => u.status === 'suspended');

    if (allActive) return { canSuspend: true, canLift: false, toggleActionLabel: 'Suspend' };
    if (allSuspended) return { canSuspend: false, canLift: true, toggleActionLabel: 'Lift' };

    return { canSuspend: false, canLift: false, toggleActionLabel: 'Toggle' }; // Mixed state
  }, [selectedUserIds, users]);

  /* --------------------------
     JSX
  -------------------------- */
  return (
    <View style={styles.container}>
      {/* Search & Sort */}
      <View style={styles.userListControls}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <TextInput
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { paddingRight: 35 }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchButton}
            > 
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        {/* --- Improved Sort Button --- */}
        <Pressable
          onPress={() => setSortMode(p => (p === "alphabetical" ? "status" : "alphabetical"))}
          style={({ pressed }) => [
            styles.sortButton,
            { backgroundColor: pressed ? '#3B7BC2' : '#4A90E2' },
          ]}
        >
          <MaterialIcons name="swap-vert" size={18} color="#fff" />
          <Text style={styles.sortButtonText}>{sortMode === "alphabetical" ? "A-Z" : "Status"}</Text>
        </Pressable>
      </View>

      {/* Bulk Actions */}
      {selectionMode && selectedUserIds.size > 0 && ( // prettier-ignore
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.userListBulkActions}>
          <TouchableOpacity
            disabled={!canSuspend && !canLift}
            onPress={() => {
              if (canSuspend) {
                const usersToSuspend = users.filter(user => selectedUserIds.has(user.id));
                const namesToShow = usersToSuspend.map(u => u.name).slice(0, 3).join(', ');
                const remainingCount = Math.max(0, usersToSuspend.length - 3);
                const userListMessage = remainingCount > 0
                  ? `${namesToShow}, and ${remainingCount} more`
                  : namesToShow;

                showAlert({
                  title: "Confirm Bulk Suspension",
                  message: `You are about to suspend ${selectedUserIds.size} user(s):\n\n${userListMessage}`,
                  buttons: [
                    { text: "Cancel", style: "cancel" },
                    { text: "Proceed", onPress: () => handleBulkSuspend(selectedUserIds) },
                  ],
                });
              } else if (canLift) {
                showAlert({
                  title: "Confirm Bulk Action",
                  message: `Are you sure you want to lift the suspension for ${selectedUserIds.size} user(s)?`,
                  buttons: [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Yes, Lift All",
                      onPress: () => {
                        selectedUserIds.forEach(liftSuspension);
                        setSelectedUserIds(new Set());
                      },
                    },
                  ],
                });
              }
            }}
            style={[
              styles.bulkActionButton,
              { backgroundColor: canLift ? '#2ECC71' : '#F39C12' },
              !canSuspend && !canLift && { backgroundColor: '#aaa', opacity: 0.6 }
            ]}
          >
            <Ionicons name={canLift ? 'checkmark-circle-outline' : 'ban-outline'} size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.bulkActionButtonText}>{toggleActionLabel} ({selectedUserIds.size})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
            {
              const usersToRemove = users.filter(user => selectedUserIds.has(user.id));
              const namesToShow = usersToRemove.map(u => u.name).slice(0, 3).join(', ');
              const remainingCount = Math.max(0, usersToRemove.length - 3);
              const userListMessage = remainingCount > 0
                ? `${namesToShow}, and ${remainingCount} more`
                : namesToShow;

              showAlert({
                title: "Confirm Bulk Removal",
                message: `This will permanently remove ${selectedUserIds.size} user(s):\n\n${userListMessage}`,
                buttons: [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Yes, Remove All",
                    style: "destructive",
                    onPress: () => { removeUsersBulk(selectedUserIds); setSelectedUserIds(new Set()); },
                  },
                ]
              });
            }}
            style={[styles.bulkActionButton, { backgroundColor: "#E74C3C" }]}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.bulkActionButtonText}>Remove ({selectedUserIds.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedUserIds(new Set())} style={styles.cancelBulkActionButton}>
            <Text style={styles.cancelBulkActionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Users List */}
      <View style={styles.userListContainer}>
        <View style={{ flex: 1 }}>
          <FlatList
            data={displayedUsers}
            keyExtractor={item => item.id.toString()}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            onEndReached={() => {
              if (displayedUsers.length < filteredUsers.length) {
                setCurrentPage(p => p + 1);
              }
            }}
            contentContainerStyle={{ paddingBottom: 32 }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              !isProcessingList ? (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListText}>No users found matching your search.</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              displayedUsers.length < filteredUsers.length ? <ActivityIndicator size="small" color="#4A90E2" style={{ padding: 10 }} /> : null
            }
            renderItem={useCallback(({ item }: { item: UserItem }) => (
                <UserCard
                  user={item}
                  violations={violationsMap[item.id] || EMPTY_VIOLATIONS}
                  screenings={screeningsMap[item.id] || EMPTY_SCREENINGS}
                  search={searchQuery}
                  selected={selectedUserIds.has(item.id)}
                  onLongPress={() => handleLongPressUser(item.id)}
                  onPress={() => handlePressUser(item)}
                />
              ), [violationsMap, screeningsMap, searchQuery, selectedUserIds, handleLongPressUser, handlePressUser, EMPTY_VIOLATIONS, EMPTY_SCREENINGS]
            )}
          />
          {isProcessingList && (
            <View style={styles.listOverlay}>
              <ActivityIndicator size="large" color="#4A90E2" />
            </View>
          )}
        </View>
      </View>

      {/* User Modal */}
      <UserModal
        visible={isModalVisible}
        user={modalUser}
        violations={violations}
        screenings={screenings}
        onClose={closeUserModal}
        onSuspend={handleSuspendUser}
        onLiftSuspension={liftSuspension}
        onRemove={removeUser}
      />
      <SuspendUserModal
        visible={isSuspendModalVisible}
        onClose={() => setIsSuspendModalVisible(false)}
        onSubmit={(duration, reason) => {
          // Determine if it's a single or bulk suspension
          if (userToSuspend) handleConfirmSuspension(duration, reason);
          else if (usersToSuspend.size > 0) handleConfirmBulkSuspension(duration, reason);
        }}
      />
    </View>
  );
});

/* -------------------------- ReportsTab -------------------------- */
const ReportsTab: React.FC = memo(() => {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const { setSwipeEnabled } = useDashboardContext();
  const previousRangeIndex = useRef(0);

  const RANGES = ["daily", "weekly", "monthly"] as const;
  const currentRangeIndex = RANGES.indexOf(range);

  const monthlyScrollViewRef = useRef<ScrollView>(null);
  const monthlyUsersScrollViewRef = useRef<ScrollView>(null);
  const monthlyViolationsScrollViewRef = useRef<ScrollView>(null);
  const { chartsData, screeningTrend, violationSeries, topViolators } = MOCK_DATA.reports;

  // API_INTEGRATION_POINT: When the `range` changes, you should fetch new report data.
  // You can also use AsyncStorage to remember the user's last selected range.
  useEffect(() => {
    // const fetchReportData = async () => {
    //   // e.g., const data = await fetch(`/api/reports.php?range=${range}`);
    //   // setChartData(data);
    //   // await AsyncStorage.setItem('adminReportRange', range);
    // };
    // fetchReportData();
    if (range === 'monthly') {
      // When switching to monthly, scroll to the end of the chart
      setTimeout(() => {
        monthlyScrollViewRef.current?.scrollToEnd({ animated: true });
        monthlyUsersScrollViewRef.current?.scrollToEnd({ animated: true });
        monthlyViolationsScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
      previousRangeIndex.current = currentRangeIndex;
    }
  }, [range]);


  const screenWidth = Dimensions.get("window").width;
  const baseChartWidth = screenWidth - 32;

  // Make chart wider for monthly data to allow scrolling
  const chartWidth = useMemo(() => {
    if (range === 'monthly') {
      return Math.max(baseChartWidth, chartsData.monthly.labels.length * 60);
    }
    return baseChartWidth;
  }, [range, baseChartWidth]);

  const ReportsHeader = () => (
    <View style={styles.reportsHeader}>
        {/* Range Selector */}
        <View style={styles.rangeSelectorContainer}>
          {(["daily", "weekly", "monthly"] as const).map((r) => {
            const active = range === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRange(r)}
                style={[styles.rangeButton, active && styles.rangeButtonActive, { flex: 1 }]}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Download Button */}
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => {
            console.log(`ADMIN_ACTION: Triggered report download for range: ${range}.`);
            Alert.alert(
              "Download Report",
              "This feature is not yet implemented. Add logic here to generate and download a CSV or PDF file.",
              [{ text: "OK" }],
              { cancelable: true }
            );
          }}
        >
          <Ionicons name="download-outline" size={20} color="#ffffffff" />
        </TouchableOpacity>
    </View>
  );

  const ActivityCharts = () => (
    <>
      <ReportCard title={`${range.charAt(0).toUpperCase() + range.slice(1)} Messages Sent`}>
        <ChartContainer
          isScrollable={range === 'monthly'}
          scrollRef={monthlyScrollViewRef}
          onTouchStart={() => setSwipeEnabled(false)}
          onTouchEnd={() => setSwipeEnabled(true)}
        >
          <SvgLineChart data={chartsData[range].messages} width={chartWidth} height={200} labels={chartsData[range].labels.map(l => l.label)} color="#4A90E2" />
        </ChartContainer>
      </ReportCard>
      <ReportCard title={`${range.charAt(0).toUpperCase() + range.slice(1)} Active Users`}>
        <ChartContainer
          isScrollable={range === 'monthly'}
          scrollRef={monthlyUsersScrollViewRef}
          onTouchStart={() => setSwipeEnabled(false)}
          onTouchEnd={() => setSwipeEnabled(true)}
        >
          <SvgLineChart data={chartsData[range].users} width={chartWidth} height={200} labels={chartsData[range].labels.map(l => l.label)} color="#2ECC71" />
        </ChartContainer>
      </ReportCard>
    </>
  );

  const ScreeningsCard = () => {
    const totalScreenings = useMemo(() => screeningTrend[range].reduce((sum, count) => sum + count, 0), [range]);
    
    // Simulate a dynamic passed/flagged ratio. In a real app, this would come from the API.
    const passedCount = useMemo(() => Math.round(totalScreenings * 0.75), [totalScreenings]);
    const flaggedCount = totalScreenings - passedCount;

    const dynamicScreeningsData = [
      { label: "Passed", value: passedCount, color: "#4CAF50" },
      { label: "Flagged", value: flaggedCount, color: "#F39C12" },
    ];

    return (
      <ReportCard title={`${range.charAt(0).toUpperCase() + range.slice(1)} Screening Results`}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 16 }}>
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
          <SvgPieChart
            radius={80}
            innerRadius={40}
            data={dynamicScreeningsData}
          />
          <View style={styles.pieCenter}>
            <Text style={styles.pieCenterNumber}>{totalScreenings.toLocaleString()}</Text>
            <Text style={styles.pieCenterLabel}>Screenings</Text>
          </View>
        </View>
        <View style={styles.legendContainer}>
          {dynamicScreeningsData.map((item, index) => (
            <View key={index} style={styles.pieLegendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{`${item.label} (${item.value.toLocaleString()})`}</Text>
            </View>
          ))}
        </View>
      </View>
    </ReportCard>);
  };

  const ScreeningTrendCard = () => (
    <ReportCard title={`${range.charAt(0).toUpperCase() + range.slice(1)} Screening Trend`}>
      <ChartContainer isScrollable={range === 'monthly'}>
        <SvgLineChart data={screeningTrend[range]} width={chartWidth} height={200} labels={chartsData[range].labels.map(l => l.label)} color="#F39C12" />
      </ChartContainer>
    </ReportCard>
  );


  const ViolationsCard = () => (
    <ReportCard title={`${range.charAt(0).toUpperCase() + range.slice(1)} Violation Breakdown`}>
      <View style={{ alignItems: 'center' }}>
        <ChartContainer
          isScrollable={range === 'monthly'}
          scrollRef={monthlyViolationsScrollViewRef}
          onTouchStart={() => setSwipeEnabled(false)}
          onTouchEnd={() => setSwipeEnabled(true)}
        >
          <SvgBarChart
            data={violationSeries[range].map(v => ({ spam: v.spam, offensive: v.offensive, harassment: v.harassment }))}
            width={chartWidth}
            labels={violationSeries[range].map(v => v.label)}
            height={250}
            stackColors={{ spam: "#E74C3C", offensive: "#F39C12", harassment: "#9B59B6" }}
          />
        </ChartContainer>
        <View style={styles.barChartLegend}>
          {Object.entries({ Spam: "#E74C3C", Offensive: "#F39C12", Harassment: "#9B59B6" }).map(([key, color]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{key}</Text>
            </View>
          ))}
        </View>
      </View>
    </ReportCard>
  );

  const TopViolatorsCard = () => {
    if (range === 'daily') {
      return (
        <ReportCard title="Daily Top Violators">
          <Text style={styles.reportSummary}>
            Top violator data is aggregated weekly and monthly for more meaningful insights.
          </Text>
        </ReportCard>
      );
    }
    const currentViolators = topViolators[range];
    const totalViolations = currentViolators.reduce((sum, user) => sum + user.violationCount, 0);
    return (
      <ReportCard title={`${range.charAt(0).toUpperCase() + range.slice(1)} Top 5 Violators`}>
        <Text style={styles.reportSummary}>
          A total of <Text style={{ fontWeight: 'bold' }}>{totalViolations} violations</Text> from the top 5 users this period.
        </Text>
        {currentViolators.map((user) => (
          <View
            key={user.id}
            style={styles.horizontalBarRow}
          >
            <Text style={styles.horizontalBarLabel}>{user.name}</Text>
            <View style={styles.horizontalBar}>
              <Animated.View
                entering={FadeIn.duration(500)}
                style={[styles.horizontalBarFill, { width: `${(user.violationCount / currentViolators[0].violationCount) * 100}%` }]}
              />
            </View>
            <Text style={styles.horizontalBarValue}>{user.violationCount}</Text>
          </View>
        ))}
      </ReportCard>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <ReportsHeader />
      <Animated.View
        key={range}
        entering={currentRangeIndex > previousRangeIndex.current ? SlideInRight.duration(300) : SlideInLeft.duration(300)}
        exiting={currentRangeIndex > previousRangeIndex.current ? SlideOutLeft.duration(300) : SlideOutRight.duration(300)}
      >
        <ActivityCharts />
        <ScreeningTrendCard />
        <ScreeningsCard />
        <ViolationsCard />
        <TopViolatorsCard />
      </Animated.View>
    </ScrollView>
  );
});

/* --- Contexts --- */
const DashboardContext = React.createContext<{
  metrics: Metric;
  violations: Violation[];
  users: UserItem[];
  screenings: Screening[];
  swipeEnabled: boolean;
  setSwipeEnabled: (enabled: boolean) => void;
  suspendUser: (userId: number, durationDays: number, reason: string) => void;
  liftSuspension: (userId: number) => void;
  // suspendUsersBulk: (userIds: Set<number>, durationDays: number, reason: string) => void;
  removeUsersBulk: (userIds: Set<number>) => void;
  removeUser: (userId: number) => void;
  refreshData: () => void;
}>({
  metrics: MOCK_DATA.initialMetrics,
  violations: [],
  users: [],
  screenings: [],
  swipeEnabled: true,
  setSwipeEnabled: () => {},
  suspendUser: () => {},
  liftSuspension: () => {},
  // suspendUsersBulk: () => {},
  removeUser: () => {},
  removeUsersBulk: () => {},
  refreshData: () => {},
});

const useDashboardContext = () => React.useContext(DashboardContext);

const AlertContext = React.createContext<(options: CustomAlertOptions) => void>(() => {});
const useAlert = () => React.useContext(AlertContext);

/* ========================
   Dashboard UI - The main component with all the tabs
======================== */
function DashboardUI() {
  const router = useRouter();
  const navigation = useNavigation<SadminNavProp>();
  const { metrics, violations, users, screenings, swipeEnabled, refreshData } = useDashboardContext();
  const showAlert = useAlert();
  
  // The logout button is now part of the DashboardTab UI, so this effect is no longer needed.
  // We still set the title for clarity.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Admin Dashboard",
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={() => showAlert({
            title: "Confirm Logout",
            message: "Are you sure you want to log out?",
            buttons: [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: async () => { await AsyncStorage.removeItem("superadmin"); router.replace("/auth"); } },
            ]
          })}
        >
          <MaterialIcons name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, showAlert]);

  return (
    <Tab.Navigator screenOptions={{ lazy: true }}>
        <Tab.Screen
          name="Dashboard"
          // By passing a stable `refreshData` function, we avoid re-renders.
          listeners={{ tabPress: refreshData }}
          options={{ swipeEnabled: true }}
        >
          {() => (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
              <DashboardTab
                metrics={metrics} violations={violations} screenings={screenings}
              />
            </Animated.View>
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Users"
          listeners={{ tabPress: refreshData }}
          options={{ swipeEnabled: true }}
        >
          {() => (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
              <UsersTab users={users} violations={violations} screenings={screenings} />
            </Animated.View>
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Reports"
          listeners={{ tabPress: refreshData }}
          options={{ swipeEnabled: swipeEnabled }}
        >
          {() => <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}><ReportsTab /></Animated.View>}
        </Tab.Screen>
      </Tab.Navigator>
  );
}

/* ========================
   Main Screen - The top-level component that provides context
======================== */
export default function SadminDashboardScreen() {
  const [metrics, setMetrics] = useState<Metric>(MOCK_DATA.initialMetrics);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [alertOptions, setAlertOptions] = useState<CustomAlertOptions | null>(null);
  const [violations, setViolations] = useState<Violation[]>(MOCK_DATA.violations);
  const [users, setUsers] = useState<UserItem[]>(MOCK_DATA.users);
  const [screenings] = useState<Screening[]>(MOCK_DATA.screenings);

  const refreshData = useCallback(() => {
    setMetrics(MOCK_DATA.initialMetrics);
    setUsers(MOCK_DATA.users);
    setViolations(MOCK_DATA.violations);
  }, []);

  const showAlert = useCallback((options: CustomAlertOptions) => {
    setAlertOptions(options);
  }, []);

  const suspendUser = useCallback((userId: number, durationDays: number, reason: string) => {
    const endDate = durationDays === -1 ? 'Permanent' : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, status: 'suspended', suspensionEndDate: endDate, suspensionReason: reason }
        : user
    ));
  }, []);

  const liftSuspension = useCallback((userId: number) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, status: 'active', suspensionEndDate: undefined, suspensionReason: undefined }
        : user
    ));
  }, []);

  const removeUser = useCallback((userId: number) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  }, []);

  const removeUsersBulk = useCallback((userIds: Set<number>) => {
    setUsers(prev => prev.filter(user => !userIds.has(user.id)));
  }, []);

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

  const contextValue = useMemo(() => ({
    metrics,
    violations,
    users,
    screenings,
    swipeEnabled,
    setSwipeEnabled,
    suspendUser,
    liftSuspension,
    removeUser,
    removeUsersBulk,
    refreshData,
  }), [metrics, violations, users, screenings, swipeEnabled, suspendUser, liftSuspension, removeUser, removeUsersBulk, refreshData]);

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

/* ========================
   Styles
======================== */
const styles = StyleSheet.create({
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
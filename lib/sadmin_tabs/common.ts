// app/sadmin_tabs/common.ts
import React from 'react';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// --- Types & Interfaces --- //
export type AppStackParamList = { sadmindashboard: undefined };
export type SadminNavProp = NativeStackNavigationProp<AppStackParamList, "sadmindashboard">;

export type Metric = {
  activeUsers: number;
  suspendedUsers: number;
  messagesPerSec: number;
  avgMessageSize: number;
  violationsToday: number;
  screeningsToday: number;
  totalUsers: number;
  totalGroups: number;
};

export type Health = {
  backend: string | null | undefined;
  myphp: string | null | undefined;
  database: string | null | undefined;
  cpu: number | string;
  memory: number | string;
};

export type StatusKey = "ok" | "warn" | "error" | "unknown";
export type Violation = { id: number; userId: number; userName: string; type: string; date: string };
export type Screening = { id: number; userId: number; userName: string; type: string; result: string; date: string };
export type UserItem = {
  id: number;
  name: string;
  status: "active" | "suspended";
  role?: 'user' | 'superadmin';
  joinedDate?: string;
  suspensionEndDate?: string | null;
  suspensionReason?: string | null;
};
export type SvgLineChartProps = { data: number[]; width: number; height: number; color?: string; labels?: string[] };
export type PieItem = { value: number; color: string };
export type BarChartDataPoint = number | Record<string, number>;

export type CustomAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type CustomAlertOptions = { title: string; message: string; buttons: CustomAlertButton[] };

// --- Constants & Mock Data --- //
export const MOCK_DATA = {
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
      daily: { messages: [12, 5, 7, 10, 6, 14, 9], users: [70, 50, 55, 60, 58, 62, 65], labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
      weekly: { messages: [70, 55, 120, 90], users: [300, 320, 350, 330], labels: ["W1", "W2", "W3", "W4"] },
      monthly: { messages: [300, 420, 390, 520, 480, 610, 550, 720, 680, 750, 800, 850], users: [1200, 1350, 1250, 1400, 1300, 1500, 1600, 1750, 1700, 1800, 1850, 1900], labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
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

export const STATUS_COLORS: Record<StatusKey, string> = {
  ok: "#2ECC71",
  warn: "#F39C12",
  error: "#E74C3C",
  unknown: "#555555",
};

// --- Helper Functions --- //
export const parseStatus = (raw?: string | null): { key: StatusKey; label: string } => {
  if (!raw) return { key: "unknown", label: "Unknown" };
  const s = String(raw).trim().toLowerCase();
  if (s.includes("❌") || s.includes("disconnected") || s.includes("down") || s.includes("failed") || s.includes("error")) return { key: "error", label: raw };
  if (s.includes("⚠") || s.includes("⚠️") || s.includes("slow") || s.includes("degraded") || s.includes("warning")) return { key: "warn", label: raw };
  if (s === "connected" || s === "running" || s.includes("✅") || s.includes("ok")) return { key: "ok", label: raw };
  return { key: "unknown", label: raw };
};

export const getUsageColor = (usage: number) => {
  if (usage > 90) return STATUS_COLORS.error;
  if (usage > 70) return STATUS_COLORS.warn;
  return STATUS_COLORS.ok;
};

export const controlPoint = (current: { x: number; y: number }, previous: { x: number; y: number } | undefined, next: { x: number; y: number } | undefined, isEnd?: boolean): [number, number] => {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.2;
  const o = { x: n.x - p.x, y: n.y - p.y };
  const angle = Math.atan2(o.y, o.x);
  const length = Math.sqrt(o.x * o.x + o.y * o.y) * smoothing;
  const x = current.x + Math.cos(angle + (isEnd ? Math.PI : 0)) * length;
  const y = current.y + Math.sin(angle + (isEnd ? Math.PI : 0)) * length;
  return [x, y];
};

// --- Contexts --- //
export const DashboardContext = React.createContext<{
  metrics: Metric;
  violations: Violation[];
  users: UserItem[];
  screenings: Screening[];
  swipeEnabled: boolean;
  loadingUsers: boolean;
  setSwipeEnabled: (enabled: boolean) => void;
  suspendUser: (userId: number, durationDays: number, reason: string) => void;
  liftSuspension: (userId: number) => void;
  removeUsersBulk: (userIds: Set<number>) => void;
  removeUser: (userId: number) => void;
  refreshData: () => Promise<UserItem[] | undefined>;
}>({
  metrics: MOCK_DATA.initialMetrics,
  violations: [],
  users: [],
  screenings: [],
  swipeEnabled: true,
  loadingUsers: false,
  setSwipeEnabled: () => {},
  suspendUser: () => {},
  liftSuspension: () => {},
  removeUser: () => {},
  removeUsersBulk: () => {},
  refreshData: async () => undefined,
});

export const useDashboardContext = () => React.useContext(DashboardContext);

export const AlertContext = React.createContext<(options: CustomAlertOptions) => void>(() => {});
export const useAlert = () => React.useContext(AlertContext);

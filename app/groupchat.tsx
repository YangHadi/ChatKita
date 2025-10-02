// app/groupchat.tsx
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Types ---
type Message = {
  id: number;
  sender_id: number;
  senderName: string;
  text: string;
  createdAt: string;
};

type DateSeparator = {
  type: "separator";
  dateLabel: string;
};

type MessageOrSeparator = Message | DateSeparator;

type RootStackParamList = {
  groupchat: { id: number };
  groupinfo: { id: number };
};

type GroupChatRouteProp = RouteProp<RootStackParamList, "groupchat">;
type GroupChatNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "groupchat"
>;

// --- API Response Types ---
interface GroupNameResponse {
  success: boolean;
  group_name?: string;
  [key: string]: any;
}

interface GroupMessagesResponse {
  success?: boolean;
  total_messages?: number;
  messages?: {
    id: string | number;
    sender_id: string | number;
    sender_name: string;
    message: string;
    created_at: string;
  }[];
  message?: string;
  [key: string]: any;
}

// --- Constants ---
const API_BASE = "http://192.168.1.25/simplechat-backend";
const PAGE_SIZE = 20;

const COLORS = {
  background: "#F9F9F9",
  myMessage: "#ebf8c6ff",
  otherMessage: "#E5E5E5",
  senderName: "#555",
  text: "#000",
  timestamp: "#999",
  border: "#CCC",
  tint: "#2196F3",
  placeholder: "#888",
};

// --- Helper: format date labels ---
const formatDateLabel = (dateInput: string | number) => {
  const parseDate = (src: string | number) => {
    if (typeof src === "number") return new Date(src);
    if (typeof src !== "string") return new Date(String(src));

    const dbLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    let s = src;
    if (dbLike.test(s)) s = s.replace(" ", "T");

    return new Date(s);
  };

  const msgDate = parseDate(dateInput);
  if (isNaN(msgDate.getTime())) return "";

  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(msgDate, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(msgDate, yesterday)) return "Yesterday";

  const diffTime = now.getTime() - msgDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 6) return msgDate.toLocaleDateString(undefined, { weekday: "long" });

  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: msgDate.getFullYear() === now.getFullYear() ? undefined : "numeric",
  };
  return msgDate.toLocaleDateString(undefined, opts);
};

// --- Date Separator Component ---
const DateSeparatorComponent = ({ label }: { label: string }) => (
  <View style={styles.dateSeparator}>
    <Text style={styles.dateSeparatorText}>{label}</Text>
  </View>
);

// --- Animated Message Component ---
const AnimatedMessage = ({
  item,
  userId,
  index,
}: {
  item: Message;
  userId: number;
  index: number;
}) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 30),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.message,
        item.sender_id === userId
          ? { ...styles.myMessage, backgroundColor: COLORS.myMessage }
          : { ...styles.otherMessage, backgroundColor: COLORS.otherMessage },
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      {item.sender_id !== userId && (
        <Text style={styles.senderNameText}>{item.senderName}</Text>
      )}
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.timestampText}>
        {new Date(item.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
      </Text>
    </Animated.View>
  );
};

// --- Main Chat Page ---
export default function GroupChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isFetchingNewRef = useRef(false);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const [inputHeight, setInputHeight] = useState(44);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<GroupChatNavigationProp>();
  const route = useRoute<GroupChatRouteProp>();
  const { id: groupId } = route.params;

  // Load user ID
  useEffect(() => {
    const loadUserId = async () => {
      const stored = await AsyncStorage.getItem("userID");
      if (stored) setUserId(parseInt(stored, 10));
    };
    loadUserId();
  }, []);

  // Fetch group name
  useEffect(() => {
    const fetchGroupName = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/groups.php?group_id=${groupId}`
        );
        const data = (await response.json()) as GroupNameResponse;

        if (data.success && data.group_name) {
          navigation.setOptions({
            title: data.group_name,
            headerRight: () => (
              <TouchableOpacity
                style={{ marginRight: 12 }}
                onPress={() => navigation.navigate("groupinfo", { id: groupId })}
              >
                <MaterialIcons name="info" size={24} color={COLORS.tint} />
              </TouchableOpacity>
            ),
          });
        }
      } catch (error) {
        console.error("Error fetching group name:", error);
      }
    };
    fetchGroupName();
  }, [groupId]);

  // Keyboard animation
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll helper
  const scrollToBottom = (animated = true) => {
    if (!flatListRef.current) return;
    flatListRef.current.scrollToOffset({ offset: 0, animated });
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollButton(offsetY > 100);
  };

  // Fetch messages
  useFocusEffect(
    useCallback(() => {
      loadInitialMessages();
      const interval = setInterval(fetchNewMessages, 2000);
      return () => clearInterval(interval);
    }, [groupId, userId])
  );

  const loadInitialMessages = async () => {
    try {
      const headRes = await fetch(
        `${API_BASE}/group_messages.php?group_id=${groupId}&limit=1&offset=0`
      );
      const headData = (await headRes.json()) as GroupMessagesResponse;
      const totalMessages = headData.total_messages || 0;
      const lastPageOffset = Math.max(0, totalMessages - PAGE_SIZE);

      const res = await fetch(
        `${API_BASE}/group_messages.php?group_id=${groupId}&limit=${PAGE_SIZE}&offset=${lastPageOffset}`
      );
      const data = (await res.json()) as GroupMessagesResponse;

      const formatted: Message[] = (data.messages || []).map((m) => ({
        id: parseInt(String(m.id)),
        sender_id: parseInt(String(m.sender_id)),
        senderName: m.sender_name,
        text: m.message,
        createdAt: m.created_at,
      }));

      setMessages(formatted.slice().reverse());
      setTotal(totalMessages);
      setOffset(lastPageOffset);

      setTimeout(() => scrollToBottom(false), 100);
    } catch (err) {
      console.error("Load initial messages error:", err);
      Alert.alert("Error", "Failed to load messages.");
    }
  };

  const fetchNewMessages = async () => {
    if (isFetchingNewRef.current) return;
    isFetchingNewRef.current = true;

    try {
      const headRes = await fetch(
        `${API_BASE}/group_messages.php?group_id=${groupId}&limit=1&offset=0`
      );
      const headData = (await headRes.json()) as GroupMessagesResponse;
      const newTotal = headData.total_messages || 0;
      if (newTotal <= total) return;

      const newOffset = Math.max(0, newTotal - PAGE_SIZE);
      const res = await fetch(
        `${API_BASE}/group_messages.php?group_id=${groupId}&limit=${PAGE_SIZE}&offset=${newOffset}`
      );
      const data = (await res.json()) as GroupMessagesResponse;

      const formatted: Message[] = (data.messages || []).map((m) => ({
        id: parseInt(String(m.id)),
        sender_id: parseInt(String(m.sender_id)),
        senderName: m.sender_name,
        text: m.message,
        createdAt: m.created_at,
      }));

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const toAdd = formatted
          .slice()
          .reverse()
          .filter((m) => !existingIds.has(m.id));
        if (toAdd.length === 0) return prev;
        const updated = [...toAdd, ...prev];
        setTimeout(() => scrollToBottom(false), 50);
        return updated;
      });

      setTotal(newTotal);
      setOffset(newOffset);
    } catch (err) {
      console.error("Fetch new messages error:", err);
    } finally {
      isFetchingNewRef.current = false;
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!text.trim() || !userId) return;

    try {
      const payload = { group_id: groupId, sender_id: userId, message: text };
      const response = await fetch(`${API_BASE}/group_messages.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GroupMessagesResponse;

      if (data.success) {
        setText("");
        setInputHeight(44);
        fetchNewMessages();
      } else {
        Alert.alert("Error", data.message || "Failed to send message.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Something went wrong while sending.");
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchNewMessages();
    setRefreshing(false);
  };

  const loadMoreMessages = async () => {
    if (loadingMore || offset <= 0) return;
    setLoadingMore(true);

    try {
      const newOffset = Math.max(0, offset - PAGE_SIZE);
      const res = await fetch(
        `${API_BASE}/group_messages.php?group_id=${groupId}&limit=${PAGE_SIZE}&offset=${newOffset}`
      );
      const data = (await res.json()) as GroupMessagesResponse;

      const formatted: Message[] = (data.messages || []).map((m) => ({
        id: parseInt(String(m.id)),
        sender_id: parseInt(String(m.sender_id)),
        senderName: m.sender_name,
        text: m.message,
        createdAt: m.created_at,
      }));

      setMessages((prev) => [...prev, ...formatted.slice().reverse()]);
      setOffset(newOffset);
    } catch (err) {
      console.error("Load more messages error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Prepare messages with separators
  const messagesWithSeparators: MessageOrSeparator[] = [];
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let lastLabel = "";
  for (const msg of sorted) {
    const label = formatDateLabel(msg.createdAt);
    if (label && label !== lastLabel) {
      messagesWithSeparators.push({ type: "separator", dateLabel: label });
      lastLabel = label;
    }
    messagesWithSeparators.push(msg);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        inverted
        data={messagesWithSeparators.slice().reverse()}
        keyExtractor={(item, idx) =>
          "type" in item ? `sep-${item.dateLabel}-${idx}` : item.id.toString()
        }
        renderItem={({ item, index }) =>
          "type" in item ? (
            <DateSeparatorComponent label={item.dateLabel} />
          ) : (
            <AnimatedMessage item={item} userId={userId || 0} index={index} />
          )
        }
        contentContainerStyle={{
          padding: 12,
          paddingBottom: 120,
        }}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {showScrollButton && (
        <TouchableOpacity
          style={styles.scrollButton}
          onPress={() => scrollToBottom(true)}
        >
          <MaterialIcons name="arrow-downward" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Input */}
      <Animated.View
        style={[
          styles.inputContainer,
          { marginBottom: keyboardHeight, paddingBottom: insets.bottom || 12 },
        ]}
      >
        <TextInput
          style={[styles.input, { height: Math.max(44, inputHeight) }]}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.placeholder}
          value={text}
          onChangeText={setText}
          multiline
          onContentSizeChange={(e) => {
            const newHeight = e.nativeEvent.contentSize.height;
            setInputHeight(Math.min(Math.max(newHeight, 44), 120));
          }}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: text.trim() ? COLORS.tint : "#ccc" },
          ]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <MaterialIcons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  message: {
    marginVertical: 4,
    padding: 10,
    borderRadius: 8,
    maxWidth: "80%",
  },
  myMessage: { alignSelf: "flex-end" },
  otherMessage: { alignSelf: "flex-start" },
  senderNameText: { fontWeight: "bold", color: COLORS.senderName, marginBottom: 2 },
  messageText: { color: COLORS.text },
  timestampText: { fontSize: 10, color: COLORS.timestamp, marginTop: 4, alignSelf: "flex-end" },
  inputContainer: { flexDirection: "row", padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: "#fff" },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 0, marginRight: 8, maxHeight: 120, textAlignVertical: "center" },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dateSeparator: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "#ddd", borderRadius: 12, marginVertical: 8 },
  dateSeparatorText: { fontSize: 12, fontWeight: "600", color: "#555" },
  scrollButton: {
    position: "absolute",
    right: 16,
    bottom: 80,
    backgroundColor: COLORS.tint,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});

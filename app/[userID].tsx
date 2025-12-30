import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../lib/apiConfig";

type ApiMessage = {
  id: number | string;
  sender_id: number;
  receiver_id: number;
  message: string;
  created_at: string;
  sender_name?: string;
};

export default function ChatScreen() {
  const { userID: paramUserID, username, profilePic } = useLocalSearchParams<{
    userID: string;
    username?: string;
    profilePic?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const partnerId = Number(paramUserID);

  useEffect(() => {
    if (username) {
      navigation.setOptions({
        title: username,
        headerRight: () =>
          profilePic ? (
            <Ionicons
              name="person-circle"
              size={32}
              color="#0078fe"
              style={{ marginRight: 12 }}
            />
          ) : null,
      });
    }
  }, [username, profilePic, navigation]);

  const MESSAGES_API = `${API_BASE_URL}/messages.php`;

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const listRef = useRef<FlatList<ApiMessage>>(null);

  useEffect(() => {
    (async () => {
      const uid = await AsyncStorage.getItem("userID");
      if (uid) setCurrentUserId(Number(uid));
      else {
        Alert.alert("Not logged in", "Please login again.");
        router.replace("/auth");
      }
    })();
  }, []);

  const fetchMessages = async () => {
    if (!currentUserId || !partnerId) return;
    try {
      const res = await axios.get<{ messages: ApiMessage[] }>(MESSAGES_API, {
        params: { sender_id: currentUserId, receiver_id: partnerId },
        timeout: 5000,
      });
      const msgs = res.data?.messages ?? [];
      setMessages(msgs.map((m) => ({ ...m, id: String(m.id) })));
    } catch (err) {
      console.warn("fetchMessages error:", err);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;
    fetchMessages();
    const iv = setInterval(fetchMessages, 2500);
    return () => clearInterval(iv);
  }, [currentUserId, partnerId]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!currentUserId) return Alert.alert("Not logged in");
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: ApiMessage = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: partnerId,
      message: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setInputHeight(40);

    try {
      const res = await axios.post(
        MESSAGES_API,
        {
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: trimmed,
        },
        { headers: { "Content-Type": "application/json" }, timeout: 7000 }
      );

      if (res.data?.success) {
        await fetchMessages();
      } else {
        Alert.alert("Send failed", res.data?.error || "Server rejected message.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err) {
      console.warn("Send error:", err);
      Alert.alert("Send error", "Could not send message. Check connection.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const renderItem = ({ item }: { item: ApiMessage }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View
        style={[
          styles.messageRow,
          { justifyContent: isMe ? "flex-end" : "flex-start" },
        ]}
      >
        {!isMe &&
          (profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {username ? username.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
          ))}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.bubbleText, !isMe && { color: "#000" }]}>
            {item.message}
          </Text>
          <Text style={styles.timestampText}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <View style={{ flex: 1, backgroundColor: "#f7f7f7" }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* ✅ Input Bar always visible above taskbar */}
        <SafeAreaView edges={["bottom"]} style={styles.safeInputBar}>
          <View style={[styles.inputBar, { height: Math.min(inputHeight + 16, 120) }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              style={[styles.input, { height: inputHeight }]}
              multiline
              onContentSizeChange={(e) =>
                setInputHeight(e.nativeEvent.contentSize.height)
              }
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 6,
  },
  avatarText: { fontWeight: "bold", color: "#fff" },
  bubble: {
    maxWidth: "75%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: "#0078fe",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#e9e9ef",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: "#fff", fontSize: 16 },
  timestampText: {
    fontSize: 10,
    color: "#eee",
    marginTop: 6,
    alignSelf: "flex-end",
  },
  safeInputBar: {
    backgroundColor: "#fff",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  input: {
    flex: 1,
    backgroundColor: "#f4f4f6",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 6,
    color: "#111",
    textAlignVertical: "top",
    fontSize: 16,
    maxHeight: 100, // prevent overflow
  },
  sendBtn: {
    backgroundColor: "#0078fe",
    padding: 10,
    borderRadius: 22,
  },
});
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as SecureStore from "expo-secure-store";
import Logo from "../assets/logo.png";
import { API_BASE_URL } from '../lib/apiConfig';

export default function AuthScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [suspensionMessage, setSuspensionMessage] = useState<string | null>(null);

  const SUPERADMIN_KEY = "secretadmin";

  const BASE_URL = API_BASE_URL;


  // const clearInputs = () => {
  //   setUsername('');
  //   setPassword('');
  // };

  const passwordRules = [
    { test: (pwd: string) => pwd.length >= 8, message: "At least 8 characters" },
    { test: (pwd: string) => /[A-Z]/.test(pwd), message: "Include an uppercase letter" },
    { test: (pwd: string) => /[0-9]/.test(pwd), message: "Include a number" },
    { test: (pwd: string) => /[!@#$%^&*_]/.test(pwd), message: "Include a special character (!@#$%^&*_)" },
  ];

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
  const checkLogin = async () => {
    const savedUser = await SecureStore.getItemAsync("user");
    if (savedUser) {
      router.replace('/home');
    }
  };
  checkLogin();
}, []);


  const handleRegister = async () => {
    if (!username) {
      setMessage("Please enter a username.");
      setMessageType('error');
      return;
    }

    const failedRules = passwordRules.filter(r => !r.test(password));
    if (failedRules.length > 0) {
      setMessage("Password does not meet requirements. See rules above.");
      setMessageType('error');
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/register.php`,
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res?.data?.status === 'success') {
        setMessage("Registered successfully! You can now log in.");
        setMessageType('success');
        // clearInputs();
      } else {
        setMessage(res?.data?.message || "Registration failed. Username may already exist.");
        setMessageType('error');
        // clearInputs();
      }
    } catch (err: any) {
      setMessage("Login failed. Please try again.");
      setMessageType('error');

      if (err.response) {
        console.log("📡 Server responded with:", err.response.data);
        console.log("Status:", err.response.status);
      } else if (err.request) {
        console.log("❌ No response received:", err.request);
      } else {
        console.log("⚠️ Error setting up request:", err.message);
      }
    }

  };

  const handleLogin = async () => {
    if (!username || !password) {
      setMessage("Please enter both username and password.");
      setMessageType('error');
      return;
    }

  // 🔥 SUPERADMIN LOGIN (no backend check)
  if (username.includes(SUPERADMIN_KEY) || password.includes(SUPERADMIN_KEY)) {
    console.log("Superadmin keyword detected — redirecting to dashboard...");

    await AsyncStorage.setItem("superadmin", "true");

    setShowWelcome(true);
    setTimeout(() => {
      router.replace('/sadmindashboard');   // make sure this screen exists
    }, 1500);

    return; // stop normal login flow
  }

    try {
      const res = await axios.post(`${BASE_URL}/login.php`,
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Login attempt from username:", username);
      console.log("Login response:", res.data);

      const userID = res?.data?.id;

      if (res?.data?.status === 'success' && userID) {
        await AsyncStorage.setItem('userID', userID.toString());
        await AsyncStorage.setItem('username', username);
        await SecureStore.setItemAsync("user", JSON.stringify({
          id: res.data.id,
          username: res.data.username
        }));
        setShowWelcome(true);
        setTimeout(() => {
          router.replace('/home');
        }, 2000);
      } else if (res?.data?.status === 'suspended') {
        // Show the new suspension modal instead of the small text message
        setSuspensionMessage(res?.data?.message || "Your account is suspended.");
      } else {
        setMessage(res?.data?.message || "Incorrect username or password. Try again.");
        setMessageType('error');
        // clearInputs();
      }
    } catch (err: any) {
      setMessage("Login failed. Please try again.");
      setMessageType('error');
      // clearInputs();
      console.log(err);
    }
  };

  if (showWelcome) {
    return (
      <View style={styles.container}>
        <Animated.Text
          entering={FadeIn.duration(800)}
          exiting={FadeOut.duration(800)}
          style={styles.welcomeText}
        >
          Welcome, {username}!
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={Logo} style={styles.logo} />

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={styles.inputFlex}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.icon}>
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="gray"
          />
        </TouchableOpacity>
      </View>

      {password.length > 0 && (
        <View style={styles.passwordHintContainer}>
          {passwordRules.map((rule, index) => {
            const passed = rule.test(password);
            return (
              <Text
                key={index}
                style={{
                  color: passed ? 'green' : 'red',
                  fontSize: 12,
                }}
              >
                {passed ? '✔️' : '❌'} {rule.message}
              </Text>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>LOGIN</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>REGISTER</Text>
      </TouchableOpacity>

      {message ? (
        <Animated.View
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(500)}
          style={{ width: '80%', marginTop: 10 }}
        >
          <Text
            style={[
              styles.message,
              messageType === 'success' ? styles.success : styles.error,
            ]}
          >
            {message}
          </Text>
        </Animated.View>
      ) : null}

      {/* Suspension Modal */}
      <Modal
        transparent
        visible={!!suspensionMessage}
        animationType="fade"
        onRequestClose={() => setSuspensionMessage(null)}
      >
        <Pressable style={styles.alertBackdrop} onPress={() => setSuspensionMessage(null)}>
          <Pressable>
            <Animated.View entering={FadeIn.duration(200)} style={styles.alertContainer}>
              <Ionicons name="ban" size={48} color="#E74C3C" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.alertTitle}>Account Suspended</Text>
              <Text style={styles.alertMessage}>{suspensionMessage}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setSuspensionMessage(null)}
              ><Text style={styles.alertButtonText}>OK</Text></TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffa600ac'
  },
  logo: { width: 250, height: 250, resizeMode: 'contain', marginBottom: 10 },
  input: { width: '80%', borderWidth: 1, marginBottom: 10, padding: 8, borderRadius: 5, backgroundColor: '#f0f0f0' },
  inputContainer: { width: '80%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 5, backgroundColor: '#f0f0f0', marginBottom: 10, paddingHorizontal: 8 },
  inputFlex: { flex: 1, padding: 8 },
  icon: { padding: 8 },
  passwordHintContainer: { width: '80%', marginBottom: 10 },
  button: { width: '80%', backgroundColor: '#2196F3', padding: 12, borderRadius: 5, alignItems: 'center', marginVertical: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  message: { fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  success: { color: 'green' },
  error: { color: 'red' },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  // Suspension Alert Styles
  alertBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertContainer: { width: '100%', backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  alertTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  alertMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  alertButton: { backgroundColor: '#4A90E2', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8, alignSelf: 'stretch' },
  alertButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
});

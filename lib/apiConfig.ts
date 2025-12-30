// lib/apiConfig.ts
import { Platform } from 'react-native';

// --- Centralized API Configuration ---

// Replace with your computer's local IP address.
// On Windows, run `ipconfig` in Command Prompt.
// On macOS/Linux, run `ifconfig` in Terminal.
const PC_LOCAL_IP = "192.168.88.212";

// The base URL for your backend API.
// It uses the local IP for Android development and 'localhost' for others (like web).
export const API_BASE_URL = Platform.OS === 'android'
  ? `http://${PC_LOCAL_IP}/simplechat-backend`
  : `http://localhost/simplechat-backend`;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const userID = await AsyncStorage.getItem('userID');
      const token = await AsyncStorage.getItem('token');

      if (userID && token) {
        // Already logged in → go to Home
        router.replace('/home');
        console.log('User already logged in, navigating to Home...');
      } else {
        // Not logged in → go to Auth
        router.replace('/auth');
      }
    };
    checkLogin();
  }, []);

  return null; // Nothing to render
}


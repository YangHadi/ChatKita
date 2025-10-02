// app/_layout.tsx
import { Stack } from "expo-router";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#ffa600ac",
        },
        headerTintColor: "#fff", // white text
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      {/* Login */}
      <Stack.Screen name="auth" options={{ headerShown: false }}  />

      {/* Home */}
      <Stack.Screen name="home" options={{ title: "Home", headerLeft: () => null }} />

      {/* Contacts Chat */}
      <Stack.Screen name="contactchat" />

      {/* Group Chat */}
      <Stack.Screen name="[userID]" />

      {/* Group Info */}
      <Stack.Screen
        name="groupinfo"
        options={{
          title: "Group Info",
          headerBackTitle: "Back",
        }}
      />

      {/* Not Found */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

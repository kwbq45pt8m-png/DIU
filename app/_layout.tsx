
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { colors } from "@/styles/commonStyles";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    console.log('RootLayoutNav: Navigation check', { user: !!user, segments });

    // No automatic redirects - users can browse without auth
    // Auth is only required when they try to interact (handled in individual screens)
    
    setIsNavigationReady(true);
  }, [user, loading, segments]);

  if (loading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="username-setup" options={{ headerShown: false }} />
      <Stack.Screen 
        name="create-post" 
        options={{ 
          presentation: "modal",
          headerShown: true,
          title: "Create Post",
          headerStyle: { backgroundColor: "#1C1C1E" },
          headerTintColor: "#FFFFFF",
        }} 
      />
      <Stack.Screen 
        name="post/[id]" 
        options={{ 
          headerShown: true,
          title: "Post",
          headerStyle: { backgroundColor: "#1C1C1E" },
          headerTintColor: "#FFFFFF",
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "#FF3B30",
      background: "#000000",
      card: "#1C1C1E",
      text: "#FFFFFF",
      border: "#38383A",
      notification: "#FF3B30",
    },
  };

  return (
    <>
      <StatusBar style="light" animated />
      <ThemeProvider value={CustomDarkTheme}>
        <LanguageProvider>
          <AuthProvider>
            <WidgetProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
                <SystemBars style="light" />
              </GestureHandlerRootView>
            </WidgetProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </>
  );
}

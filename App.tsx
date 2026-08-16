import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from "./src/screens/HomeScreen";
import ChartsScreen from "./src/screens/ChartsScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import SplashScreen from "./src/screens/SplashScreen";

const Drawer = createDrawerNavigator();

const G = {
  p100: "#0dbf69", p200: "#24db86", bg100: "#0d0d0d", bg200: "#141414", bg300: "#1c1c1c",
  t100: "#f0fdf4", t200: "#d3f8e7", t300: "#7beab6", t400: "#3a5a47"
};

function CustomDrawerContent(props: any) {
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(13,13,13, 0.96)" }}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 40 }}>
        
        {/* Profile / Header in Drawer */}
        <View style={styles.drawerHeader}>
          <Image source={require("./assets/icon.png")} style={styles.logoImage} resizeMode="contain" />
          <View>
            <Text style={styles.drawerTitle}>FinanzasIA</Text>
            <Text style={styles.drawerSubtitle}>Premium Edition</Text>
          </View>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Drawer Items */}
        <View style={{ paddingHorizontal: 16 }}>
          <DrawerItemList {...props} />
        </View>

      </DrawerContentScrollView>
    </View>
  );
}

export default function App() {
  const [isChecking, setIsChecking] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const value = await AsyncStorage.getItem('@first_launch');
        if (value === null) {
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        setIsFirstLaunch(false);
      } finally {
        setIsChecking(false);
      }
    }
    checkFirstLaunch();
  }, []);

  if (isChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: G.bg100, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={G.p200} />
      </View>
    );
  }

  if (isFirstLaunch) {
    return <OnboardingScreen onFinish={() => setIsFirstLaunch(false)} />;
  }

  if (!isSplashFinished) {
    return <SplashScreen onFinish={() => setIsSplashFinished(true)} />;
  }

  return (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: "transparent",
            width: 300,
          },
          drawerActiveTintColor: G.p200,
          drawerInactiveTintColor: G.t200,
          drawerActiveBackgroundColor: "rgba(36, 219, 134, 0.15)",
          drawerItemStyle: {
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginVertical: 6,
          },
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: "700",
            marginLeft: 8,
          },
        }}
      >
        <Drawer.Screen 
          name="Conversor" 
          component={HomeScreen} 
          options={{ drawerIcon: ({ color }) => <Ionicons name="calculator-outline" size={24} color={color} /> }} 
        />
        <Drawer.Screen 
          name="Histórico" 
          component={CalendarScreen} 
          options={{ drawerIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} /> }} 
        />
        <Drawer.Screen 
          name="Gráficas" 
          component={ChartsScreen} 
          options={{ drawerIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={24} color={color} /> }} 
        />
        <Drawer.Screen 
          name="Notificaciones" 
          component={NotificationsScreen} 
          options={{ drawerIcon: ({ color }) => <Ionicons name="notifications-outline" size={24} color={color} /> }} 
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 20,
  },
  logoImage: { width: 56, height: 56, borderRadius: 12 },
  logoOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(36, 219, 134, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(36, 219, 134, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: G.p200,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  drawerTitle: {
    color: G.t100,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  drawerSubtitle: {
    color: G.p200,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 20,
    marginBottom: 20,
  }
});

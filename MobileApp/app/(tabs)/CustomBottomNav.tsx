import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const tabs: Array<{
  name: string;
  href: Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { name: "home", href: "/home", label: "Overview", icon: "grid-outline" },
  { name: "news", href: { pathname: "/welcome", params: { module: "news" } }, label: "News", icon: "newspaper-outline" },
  { name: "welcome", href: "/welcome", label: "Home", icon: "home" },
  { name: "gallery", href: { pathname: "/welcome", params: { module: "gallery" } }, label: "Gallery", icon: "image-outline" },
];

export default function CustomBottomNav() {
  const router = useRouter();
  const segments = useSegments();

  // Determine active tab based on current route segment
  const activeTab = segments[1] ?? "home";

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        const isHome = tab.name === "welcome";
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(tab.href)}
            style={[
              styles.tabButton,
              isActive && styles.tabButtonActive,
              isHome && styles.homeTab,
              isHome && isActive && styles.homeTabActive,
            ]}
          >
            <View style={[styles.iconWrap, isHome && styles.homeIconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={tab.icon as any}
                size={isHome ? 24 : 21}
                color={isActive ? "#5523D2" : isHome ? "#FFFFFF" : "#E9D5FF"}
              />
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#5523D2",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 22,
    marginHorizontal: 14,
    marginBottom: 12,
    minHeight: 72,
    justifyContent: "space-between",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: "#5523D2",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  homeTab: {
    transform: [{ translateY: -8 }],
  },
  homeTabActive: {
    backgroundColor: "transparent",
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#FFFFFF",
  },
  homeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7C3AED",
    borderWidth: 4,
    borderColor: "#F6F3FF",
    shadowColor: "#111827",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  label: {
    fontSize: 10,
    color: "#E9D5FF",
    marginTop: 2,
    fontWeight: "900",
    textAlign: "center",
  },
  activeLabel: {
    color: "#fff",
    fontWeight: "bold",
  },
});

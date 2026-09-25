import { Tabs, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { useStudentAuthGuard } from "@/hooks/use-student-auth-guard";
import api from "@/services/api";

const HOME_PATH = "/welcome";
const NO_SWIPE_PATHS = new Set(["/", HOME_PATH, "/dashboard", "/loginform", "/register", "/public-overview"]);
const INACTIVITY_LIMIT = 5 * 60 * 1000;
const STUDENT_FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScO29CvpRNB0057OxNROPr0IVPH6dAZZpueHFRRespT0g1E_A/viewform";
const STUDENT_FEEDBACK_INTERVAL_MS = 20 * 24 * 60 * 60 * 1000;
const STUDENT_FEEDBACK_LAST_PROMPT_KEY = "iie_student_feedback_last_prompt_at";
const appLogo = require("../../assets/images/icon.png");

const drawerItems: Array<{
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  module?: string;
}> = [
  { key: "overview", label: "Overview", icon: "grid-outline", route: "/home" },
  { key: "attendance", label: "Attendance", icon: "time-outline", route: "/attendance" },
  { key: "logsheet", label: "Logsheet", icon: "document-text-outline", route: "/logsheet" },
  { key: "quizzes", label: "Quizzes", icon: "school-outline", route: "/quizzes" },
  { key: "practice", label: "Practice Test", icon: "clipboard-outline", module: "practice" },
  { key: "calendar", label: "Calendar", icon: "calendar-outline", module: "calendar" },
  { key: "materials", label: "Materials", icon: "book-outline", route: "/materials" },
  { key: "leave", label: "Leave", icon: "calendar-outline", route: "/leaveapply" },
  { key: "support", label: "Support", icon: "help-buoy-outline", route: "/support" },
  { key: "gallery", label: "Gallery", icon: "image-outline", module: "gallery" },
  { key: "vlogs", label: "Vlogs", icon: "videocam-outline", module: "vlogs" },
  { key: "news", label: "News", icon: "newspaper-outline", module: "news" },
  { key: "contact", label: "Contact Us", icon: "business-outline", module: "contact" },
];

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const authReady = useStudentAuthGuard();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);
  const { mode } = useGlobalSearchParams<{ mode?: string }>();
  const routeMode = Array.isArray(mode) ? mode[0] : mode;
  const canGoHome = !NO_SWIPE_PATHS.has(pathname);
  const showAppHeader = canGoHome && authReady;

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const scheduleFeedbackPrompt = useCallback((delay = STUDENT_FEEDBACK_INTERVAL_MS) => {
    clearFeedbackTimer();
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackVisible(true);
    }, delay);
  }, [clearFeedbackTimer]);

  const markFeedbackPromptSeen = useCallback(async () => {
    await AsyncStorage.setItem(STUDENT_FEEDBACK_LAST_PROMPT_KEY, String(Date.now()));
    setFeedbackVisible(false);
    scheduleFeedbackPrompt();
  }, [scheduleFeedbackPrompt]);

  const openFeedbackForm = useCallback(async () => {
    await markFeedbackPromptSeen();
    WebBrowser.openBrowserAsync(STUDENT_FEEDBACK_FORM_URL);
  }, [markFeedbackPromptSeen]);

  useEffect(() => {
    if (feedbackVisible) {
      openFeedbackForm();
    }
  }, [feedbackVisible, openFeedbackForm]);

  const logoutForInactivity = useCallback(async () => {
    if (loggingOutRef.current) return;
    const access = await AsyncStorage.getItem("access_token");
    if (!access) return;

    loggingOutRef.current = true;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    try {
      const refresh = await AsyncStorage.getItem("refresh_token");
      await api.post("auth/logout/", { refresh });
    } catch {
      // Backend stale-session cleanup still closes inactive monitoring records.
    } finally {
      await AsyncStorage.setItem("session_paused", "true");
      loggingOutRef.current = false;
      router.replace("/dashboard" as any);
    }
  }, [router]);

  const resetInactivityTimer = useCallback(async () => {
    const access = await AsyncStorage.getItem("access_token");
    if (!access) return;

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      logoutForInactivity();
    }, INACTIVITY_LIMIT);
  }, [logoutForInactivity]);

  const openDrawerItem = (item: (typeof drawerItems)[number]) => {
    setDrawerOpen(false);
    if (item.route) {
      router.replace(item.route as any);
      return;
    }
    if (item.module) {
      router.replace({ pathname: "/welcome", params: { module: item.module } } as any);
    }
  };

  const goBackTarget = () => {
    if (pathname === "/app") {
      if (routeMode === "practice") {
        router.replace({ pathname: "/welcome", params: { module: "practice" } } as any);
        return;
      }
      router.replace("/quizzes" as any);
      return;
    }

    router.replace(HOME_PATH as any);
  };

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const scheduleInitialFeedbackPrompt = async () => {
      const access = await AsyncStorage.getItem("access_token");
      if (!access || cancelled) return;

      const lastRaw = await AsyncStorage.getItem(STUDENT_FEEDBACK_LAST_PROMPT_KEY);
      const lastPromptAt = Number(lastRaw || 0);
      const elapsed = Date.now() - lastPromptAt;
      const delay = lastPromptAt ? Math.max(STUDENT_FEEDBACK_INTERVAL_MS - elapsed, 0) : STUDENT_FEEDBACK_INTERVAL_MS;

      scheduleFeedbackPrompt(delay);
    };

    scheduleInitialFeedbackPrompt();

    return () => {
      cancelled = true;
      clearFeedbackTimer();
    };
  }, [authReady, clearFeedbackTimer, scheduleFeedbackPrompt]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoHome) return false;
      goBackTarget();
      return true;
    });

    return () => subscription.remove();
  }, [canGoHome, pathname, routeMode]);

  useEffect(() => {
    if (!authReady) return;
    resetInactivityTimer();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        backgroundedAtRef.current = Date.now();
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
          logoutForInactivity();
        }, INACTIVITY_LIMIT);
        return;
      }

      if (state === "active") {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;

        if (backgroundedAt && Date.now() - backgroundedAt >= INACTIVITY_LIMIT) {
          logoutForInactivity();
          return;
        }

        resetInactivityTimer();
      }
    });

    return () => {
      subscription.remove();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [authReady, logoutForInactivity, resetInactivityTimer]);

  const edgeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!canGoHome) return false;
          const horizontalMove = Math.abs(gestureState.dx);
          const verticalMove = Math.abs(gestureState.dy);
          return gestureState.dx > 10 && horizontalMove > verticalMove * 1.15;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (!canGoHome) return false;
          const horizontalMove = Math.abs(gestureState.dx);
          const verticalMove = Math.abs(gestureState.dy);
          return gestureState.dx > 10 && horizontalMove > verticalMove * 1.15;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 46 || gestureState.vx > 0.35) {
            goBackTarget();
          }
        },
      }),
    [canGoHome, pathname, routeMode]
  );

  return (
    <View
      style={styles.shell}
      onStartShouldSetResponderCapture={() => {
        resetInactivityTimer();
        return false;
      }}
    >
      {!authReady ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#5523D2" />
        </View>
      ) : (
        <>
          {showAppHeader ? (
            <View style={styles.appHeader}>
              <Pressable style={styles.headerIconButton} onPress={() => setDrawerOpen(true)}>
                <Ionicons name="menu-outline" size={25} color="#5523D2" />
              </Pressable>
              <View style={styles.headerBrand}>
                <Text style={styles.headerTitle}>IIE Pulse</Text>
              </View>
              <Pressable style={styles.headerIconButton} onPress={() => router.push("/announcement" as any)}>
                <Ionicons name="notifications-outline" size={23} color="#5523D2" />
              </Pressable>
            </View>
          ) : null}
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: "none" },
            }}
          >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="loginform" />
            <Tabs.Screen name="register" />
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="welcome" />
            <Tabs.Screen name="public-overview" />
            <Tabs.Screen name="home" />
            <Tabs.Screen name="attendance/index" />
            <Tabs.Screen name="announcement" />
            <Tabs.Screen name="login-rating-history" />
            <Tabs.Screen name="leaveapply" />
            <Tabs.Screen name="leavehistory" />
            <Tabs.Screen name="logsheet" />
            <Tabs.Screen name="materials" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen name="quizzes" />
            <Tabs.Screen name="app" />
            <Tabs.Screen name="challenge" />
            <Tabs.Screen name="support" />
          </Tabs>
        </>
      )}

      {drawerOpen && showAppHeader ? (
        <View style={styles.drawerLayer}>
          <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrand}>
                <View style={styles.drawerLogoMark}>
                  <Image source={appLogo} style={styles.drawerLogoImage} resizeMode="contain" />
                </View>
                <View>
                <Text style={styles.drawerTitle}>IIE Pulse</Text>
                <Text style={styles.drawerSubtitle}>Student Portal</Text>
                </View>
              </View>
              <Pressable style={styles.drawerClose} onPress={() => setDrawerOpen(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.drawerList} showsVerticalScrollIndicator={false}>
              {drawerItems.map((item) => {
                const active = item.route ? pathname === item.route : false;
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.drawerItem, active && styles.drawerItemActive]}
                    onPress={() => openDrawerItem(item)}
                  >
                    <Ionicons name={item.icon} size={21} color={active ? "#5523D2" : "#FFFFFF"} />
                    <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {canGoHome && authReady ? (
        <View
          {...edgeSwipeResponder.panHandlers}
          pointerEvents="box-only"
          style={styles.edgeSwipeZone}
        />
      ) : null}

      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={markFeedbackPromptSeen}>
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackIcon}>
              <Ionicons name="chatbubbles-outline" size={28} color="#5523D2" />
            </View>
            <Text style={styles.feedbackTitle}>Student Feedback</Text>
            <Text style={styles.feedbackText}>Please share your feedback about your learning experience.</Text>
            <View style={styles.feedbackActions}>
              <Pressable style={styles.feedbackSecondaryButton} onPress={markFeedbackPromptSeen}>
                <Text style={styles.feedbackSecondaryText}>Later</Text>
              </Pressable>
              <Pressable style={styles.feedbackPrimaryButton} onPress={openFeedbackForm}>
                <Text style={styles.feedbackPrimaryText}>Open Form</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F7FF",
  },
  feedbackOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(15, 10, 30, 0.55)",
  },
  feedbackCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    backgroundColor: "#FFFFFF",
  },
  feedbackIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: "#F5F3FF",
  },
  feedbackTitle: {
    marginBottom: 8,
    color: "#1F1335",
    fontSize: 20,
    fontWeight: "800",
  },
  feedbackText: {
    marginBottom: 20,
    color: "#5B526E",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  feedbackActions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 10,
  },
  feedbackSecondaryButton: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DED7FF",
    backgroundColor: "#FFFFFF",
  },
  feedbackSecondaryText: {
    color: "#5523D2",
    fontWeight: "700",
  },
  feedbackPrimaryButton: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#5523D2",
  },
  feedbackPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  appHeader: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7FF",
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#1F1335",
    fontSize: 18,
    fontWeight: "800",
  },
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 1200,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.36)",
  },
  drawer: {
    width: 286,
    height: "100%",
    backgroundColor: "#5523D2",
    paddingTop: 22,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.16)",
  },
  drawerBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  drawerLogoMark: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  drawerLogoImage: {
    width: 68,
    height: 68,
  },
  drawerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  drawerSubtitle: {
    color: "#DDD6FE",
    fontSize: 12,
    marginTop: 2,
  },
  drawerClose: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  drawerList: {
    paddingVertical: 16,
    gap: 8,
  },
  drawerItem: {
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  drawerItemActive: {
    backgroundColor: "#FFFFFF",
  },
  drawerItemText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  drawerItemTextActive: {
    color: "#5523D2",
  },
  edgeSwipeZone: {
    position: "absolute",
    left: 0,
    top: 64,
    bottom: 0,
    width: 56,
    zIndex: 999,
    elevation: 999,
  },
});

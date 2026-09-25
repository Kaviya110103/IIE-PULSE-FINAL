import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Href, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "@/services/api";

const PUBLIC_PRACTICE_RESULTS_KEY = "public_practice_results";
const googleFormUrl = "https://forms.gle/nKXHiEnnZHZeegig7";
const OVERVIEW_STALE_MS = 60_000;

type PracticeQuiz = {
  id: number;
  title: string;
  total_questions?: number;
  duration_minutes?: number;
  passing_marks?: number;
  status?: string;
};

type PublicPracticeResult = {
  username: string;
  quiz_id: number;
  quiz_title: string;
  score: number;
  total_marks: number;
  percentage: number;
  is_passed: boolean;
  correct_count?: number;
  attempted_count?: number;
  total_questions?: number;
  completed_at: string;
};

type PublicBottomNavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: Href;
  privateOnly?: boolean;
};

const bottomNavItems: PublicBottomNavItem[] = [
  { key: "overview", label: "Overview", icon: "grid-outline" },
  { key: "news", label: "News", icon: "newspaper-outline", route: { pathname: "/welcome", params: { module: "news" } } as Href },
  { key: "home", label: "Home", icon: "home", route: "/welcome" },
  { key: "gallery", label: "Gallery", icon: "image-outline", route: { pathname: "/welcome", params: { module: "gallery" } } as Href },
  { key: "vlogs", label: "Vlogs", icon: "videocam-outline", route: { pathname: "/welcome", params: { module: "vlogs" } } as Href },
  { key: "contact", label: "Contact Us", icon: "business-outline", route: { pathname: "/welcome", params: { module: "contact" } } as Href },
];

export default function PublicOverview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayName, setDisplayName] = useState("Learner");
  const [quizzes, setQuizzes] = useState<PracticeQuiz[]>([]);
  const [results, setResults] = useState<PublicPracticeResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(0);

  const loadOverview = useCallback(async (force = false) => {
    if (!force && lastLoadedAt && Date.now() - lastLoadedAt < OVERVIEW_STALE_MS) {
      return;
    }

    try {
      setErrorMsg("");
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        router.replace("/home" as Href);
        return;
      }

      const sessionRaw = await AsyncStorage.getItem("guest_session");
      const session = sessionRaw ? JSON.parse(sessionRaw) : {};
      const sessionUsername = session?.username || "public";
      setDisplayName(session?.name || session?.username || "Learner");

      const storedRaw = await AsyncStorage.getItem(PUBLIC_PRACTICE_RESULTS_KEY);
      const stored = storedRaw ? JSON.parse(storedRaw) : [];
      const allResults: PublicPracticeResult[] = Array.isArray(stored) ? stored : [];
      setResults(
        allResults
          .filter((item) => item.username === sessionUsername || item.username === "public")
          .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      );

      try {
        const response = await api.get("/quiz/practice/");
        setQuizzes(response.data?.results || []);
      } catch (error: any) {
        setQuizzes([]);
        setErrorMsg(error?.response?.data?.error || "Practice tests not loaded.");
      }
      setLastLoadedAt(Date.now());
    } catch (error: any) {
      setErrorMsg(error?.message || "Could not load overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastLoadedAt, router]);

  useFocusEffect(
    useCallback(() => {
      loadOverview();
    }, [loadOverview])
  );

  const stats = useMemo(() => {
    const attemptedQuizIds = new Set(results.map((item) => item.quiz_id));
    const attempts = results.length;
    const completed = attemptedQuizIds.size;
    const totalTests = quizzes.length;
    const avg = attempts
      ? Math.round(results.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / attempts)
      : 0;
    const best = attempts
      ? Math.round(Math.max(...results.map((item) => Number(item.percentage || 0))))
      : 0;
    const passCount = results.filter((item) => item.is_passed).length;
    const progress = totalTests ? Math.round((completed / totalTests) * 100) : 0;

    return { attempts, completed, totalTests, avg, best, passCount, progress };
  }, [quizzes.length, results]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOverview(true);
  };

  const showRegisterPrompt = () => {
    Alert.alert("Access restricted", "kindly register here to access this page", [
      { text: "Cancel", style: "cancel" },
      { text: "Register", onPress: () => Linking.openURL(googleFormUrl) },
    ]);
  };

  const handleBottomNav = (item: PublicBottomNavItem) => {
    if (item.privateOnly) {
      showRegisterPrompt();
      return;
    }

    if (item.route) {
      setDrawerOpen(false);
      router.push(item.route as Href);
      return;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={styles.helperText}>Loading overview...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {drawerOpen ? (
        <View style={styles.drawerLayer}>
          <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>IIE Pulse</Text>
              <Text style={styles.drawerSubtitle}>Public Access</Text>
            </View>
            {bottomNavItems.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.drawerItem, item.key === "overview" && styles.drawerItemActive]}
                onPress={() => handleBottomNav(item)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={21}
                  color={item.key === "overview" ? "#5523D2" : "#FFFFFF"}
                />
                <Text style={[styles.drawerItemText, item.key === "overview" && styles.drawerItemTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.topHeader}>
        <Pressable style={styles.headerIconButton} onPress={() => setDrawerOpen(true)}>
          <Ionicons name="menu-outline" size={25} color="#5523D2" />
        </Pressable>
        <Text style={styles.headerTitle}>IIE Pulse</Text>
        <Pressable
          style={styles.headerIconButton}
          onPress={() => router.push({ pathname: "/welcome", params: { module: "news" } } as any)}
        >
          <Ionicons name="notifications-outline" size={23} color="#5523D2" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="person-circle-outline" size={30} color="#FFFFFF" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>Public Learner</Text>
              <Text style={styles.heroTitle}>Welcome, {displayName}</Text>
            </View>
          </View>
          <Text style={styles.heroText}>
            Track your practice test journey and keep improving with every attempt.
          </Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => router.push({ pathname: "/welcome", params: { module: "practice" } } as any)}
          >
            <Text style={styles.heroButtonText}>Start Practice Test</Text>
            <Ionicons name="arrow-forward" size={18} color="#5523D2" />
          </TouchableOpacity>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.cardKicker}>Test Progress</Text>
              <Text style={styles.progressValue}>{stats.progress}%</Text>
            </View>
            <View style={styles.progressBadge}>
              <Ionicons name="clipboard-outline" size={16} color="#5523D2" />
              <Text style={styles.progressBadgeText}>
                {stats.completed}/{stats.totalTests || 0} Tests
              </Text>
            </View>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(stats.progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {stats.totalTests
              ? `${stats.totalTests - stats.completed} practice test${stats.totalTests - stats.completed === 1 ? "" : "s"} pending.`
              : "Practice tests will appear once published."}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="repeat-outline" label="Attempts" value={stats.attempts} />
          <StatCard icon="trophy-outline" label="Best Score" value={`${stats.best}%`} />
          <StatCard icon="analytics-outline" label="Average" value={`${stats.avg}%`} />
          <StatCard icon="checkmark-done-outline" label="Passed" value={stats.passCount} />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Attempts</Text>
            <Text style={styles.sectionCount}>{results.length}</Text>
          </View>

          {results.length ? (
            results.slice(0, 5).map((item) => (
              <View key={`${item.quiz_id}-${item.completed_at}`} style={styles.resultRow}>
                <View style={[styles.resultIcon, item.is_passed ? styles.resultIconPass : styles.resultIconFail]}>
                  <Ionicons
                    name={item.is_passed ? "checkmark" : "close"}
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{item.quiz_title}</Text>
                  <Text style={styles.resultMeta}>
                    {formatDate(item.completed_at)} · {item.score}/{item.total_marks} marks
                  </Text>
                </View>
                <Text style={[styles.resultScore, item.is_passed ? styles.passText : styles.failText]}>
                  {Math.round(item.percentage || 0)}%
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={28} color="#A78BFA" />
              <Text style={styles.emptyTitle}>No attempts yet</Text>
              <Text style={styles.emptyText}>Attend a practice test to see progress here.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        {bottomNavItems.map((item) => {
          const active = item.key === "overview";
          const isHome = item.key === "home";
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, active && styles.navItemActive, isHome && styles.homeNavItem]}
              onPress={() => handleBottomNav(item)}
            >
              <View style={[styles.navIcon, isHome && styles.homeNavIcon, active && styles.navIconActive]}>
                <Ionicons
                  name={item.icon as any}
                  size={isHome ? 24 : 21}
                  color={active ? "#5523D2" : isHome ? "#FFFFFF" : "#E9D5FF"}
                />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color="#5523D2" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  content: {
    padding: 18,
    paddingTop: 14,
    paddingBottom: 112,
  },
  topHeader: {
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
  headerTitle: {
    color: "#1F1335",
    fontSize: 18,
    fontWeight: "900",
  },
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.36)",
  },
  drawer: {
    width: 286,
    height: "100%",
    backgroundColor: "#5523D2",
    paddingTop: 52,
    paddingHorizontal: 18,
  },
  drawerHeader: {
    paddingBottom: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
  },
  drawerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  drawerSubtitle: {
    color: "#DDD6FE",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  drawerItem: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 8,
  },
  drawerItemActive: {
    backgroundColor: "#FFFFFF",
  },
  drawerItemText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  drawerItemTextActive: {
    color: "#5523D2",
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F3FF",
  },
  helperText: {
    marginTop: 12,
    color: "#6B21A8",
    fontWeight: "800",
  },
  hero: {
    borderRadius: 26,
    backgroundColor: "#5523D2",
    padding: 18,
    overflow: "hidden",
    shadowColor: "#5523D2",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
  },
  kicker: {
    color: "#DDD6FE",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
  },
  heroText: {
    color: "#EDE9FE",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 14,
  },
  heroButton: {
    alignSelf: "flex-start",
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  heroButtonText: {
    color: "#5523D2",
    fontSize: 13,
    fontWeight: "900",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardKicker: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  progressValue: {
    color: "#111827",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
  },
  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressBadgeText: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
  },
  track: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E9D5FF",
    overflow: "hidden",
    marginTop: 12,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#5523D2",
  },
  progressHint: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 122,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 14,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#111827",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    marginTop: 10,
  },
  statLabel: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "900",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionCount: {
    color: "#5523D2",
    fontSize: 13,
    fontWeight: "900",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#FBF9FF",
    padding: 12,
    marginTop: 10,
  },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIconPass: {
    backgroundColor: "#16A34A",
  },
  resultIconFail: {
    backgroundColor: "#DC2626",
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  resultMeta: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  resultScore: {
    fontSize: 15,
    fontWeight: "900",
  },
  passText: {
    color: "#15803D",
  },
  failText: {
    color: "#DC2626",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#FBF9FF",
    padding: 22,
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },
  bottomNav: {
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
  navItem: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  homeNavItem: {
    transform: [{ translateY: -8 }],
  },
  navIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: {
    backgroundColor: "#FFFFFF",
  },
  homeNavIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7C3AED",
    borderWidth: 4,
    borderColor: "#F6F3FF",
  },
  navLabel: {
    fontSize: 10,
    color: "#E9D5FF",
    marginTop: 2,
    fontWeight: "900",
    textAlign: "center",
  },
  navLabelActive: {
    color: "#FFFFFF",
  },
});

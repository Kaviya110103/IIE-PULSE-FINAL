import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "@/services/api";
import CustomBottomNav from "./CustomBottomNav";

type WeeklyLoginRating = {
  week_start: string;
  week_end: string;
  stars: number;
  max_stars: number;
  days: {
    date: string;
    day: string;
    login_count: number;
    earned: boolean;
  }[];
};

export default function LoginRatingHistory() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<WeeklyLoginRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, weeks.length]);

  const loadHistory = async () => {
    try {
      setErrorMsg("");
      const response = await api.get("/student/login-rating/history/?limit=8");
      setWeeks(Array.isArray(response.data?.weeks) ? response.data.weeks : []);
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Failed to load weekly ratings"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadHistory();
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.helperText}>Loading weekly ratings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7C3AED" />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#2E1065" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Previous Weeks</Text>
            <Text style={styles.title}>Login Star History</Text>
          </View>
        </View>

        <View style={styles.ruleCard}>
          <Ionicons name="information-circle-outline" size={20} color="#7C3AED" />
          <Text style={styles.ruleText}>
            Starts at 5 stars. Low login usage reduces 1 star per weekday. Rating resets every week.
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.emptyCard}>
            <Ionicons name="warning-outline" size={26} color="#DC2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadHistory}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : weeks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="star-outline" size={32} color="#A78BFA" />
            <Text style={styles.emptyTitle}>No previous ratings yet</Text>
            <Text style={styles.emptyText}>Completed week ratings will appear here.</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {weeks.map((week) => (
              <View key={week.week_start} style={styles.weekCard}>
                <View style={styles.weekTop}>
                  <View>
                    <Text style={styles.weekLabel}>{formatWeekRange(week.week_start, week.week_end)}</Text>
                    <Text style={styles.weekSub}>Weekly login performance</Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{week.stars}/5</Text>
                  </View>
                </View>

                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Ionicons
                      key={index}
                      name={index < week.stars ? "star" : "star-outline"}
                      size={24}
                      color={index < week.stars ? "#F59E0B" : "#D8CFF6"}
                    />
                  ))}
                </View>

                <View style={styles.daysRow}>
                  {week.days.map((day) => (
                    <View key={day.date} style={[styles.dayPill, day.earned && styles.dayPillEarned]}>
                      <Text style={[styles.dayName, day.earned && styles.dayNameEarned]}>{day.day}</Text>
                      <Text style={[styles.dayCount, day.earned && styles.dayCountEarned]}>
                        {day.login_count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      <CustomBottomNav />
    </View>
  );
}

function formatWeekRange(start: string, end: string) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatShortDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 112,
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F6F3FF",
  },
  helperText: {
    marginTop: 12,
    color: "#6D28D9",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 2,
    color: "#24113F",
    fontSize: 25,
    fontWeight: "900",
  },
  ruleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  ruleText: {
    flex: 1,
    color: "#5B526E",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  weekCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EEE7FF",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    shadowColor: "#5523D2",
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  weekTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  weekLabel: {
    color: "#24113F",
    fontSize: 16,
    fontWeight: "900",
  },
  weekSub: {
    marginTop: 3,
    color: "#8B7BA7",
    fontSize: 12,
    fontWeight: "700",
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
  },
  scoreText: {
    color: "#92400E",
    fontSize: 15,
    fontWeight: "900",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
  },
  daysRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#F4F0FF",
  },
  dayPillEarned: {
    backgroundColor: "#FFF7D6",
  },
  dayName: {
    color: "#7A6A95",
    fontSize: 10,
    fontWeight: "900",
  },
  dayNameEarned: {
    color: "#92400E",
  },
  dayCount: {
    marginTop: 3,
    color: "#4C1D95",
    fontSize: 15,
    fontWeight: "900",
  },
  dayCountEarned: {
    color: "#B45309",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EEE7FF",
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    marginTop: 10,
    color: "#24113F",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    color: "#7A6A95",
    textAlign: "center",
    fontWeight: "700",
  },
  errorText: {
    marginTop: 10,
    color: "#DC2626",
    textAlign: "center",
    fontWeight: "800",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});

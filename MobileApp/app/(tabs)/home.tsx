import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import api, {
  getStudentBatches,
  getStudentChallenges,
  StudentBatchSummary,
  StudentChallengeSummary,
} from "@/services/api";
import CustomBottomNav from "./CustomBottomNav";

type StudentData = {
  first_name?: string;
  last_name?: string;
  student_id?: string;
  course?: string;
  email?: string;
  assigned_batch_number?: string;
  assigned_batch_code?: string;
  assigned_staff_name?: string;
};

type DashboardData = {
  student?: StudentData;
  attendance_percentage?: number;
  total_classes?: number;
  present_classes?: number;
  sessions_completed?: number;
  total_sessions?: number;
};

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

type SessionItem = {
  id: number;
  batch_id?: number;
  batch_number?: string;
  batch_code?: string;
  session_number: number;
  title: string;
  topics?: string | null;
  staff_completed: boolean;
  student_status: "not_started" | "pending" | "completed" | "doubt";
  completed_date?: string | null;
  student_confirmed_at?: string | null;
};

type CourseContext = {
  key: string;
  courseId?: number;
  batchId?: number;
  courseName: string;
  batchNumber: string;
  mentorName: string;
  timing: string;
  completedSessions: number;
  totalSessions: number;
  progressPercentage: number;
  challenge?: StudentChallengeSummary;
};

type SettledResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: any };

async function settle<T>(promise: Promise<T>): Promise<SettledResult<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loginRating, setLoginRating] = useState<WeeklyLoginRating | null>(null);
  const [challenges, setChallenges] = useState<StudentChallengeSummary[]>([]);
  const [studentBatches, setStudentBatches] = useState<StudentBatchSummary[]>([]);
  const [activeCourseKey, setActiveCourseKey] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [starAnim] = useState(() => new Animated.Value(0));
  const dashboardLoadedRef = useRef(false);

  const loadOverviewData = useCallback(async () => {
    try {
      setErrorMsg("");
      const [dashboardResult, ratingResult, challengeResult, batchResult] = await Promise.all([
        settle(api.get("/dashboard/student/")),
        settle(api.get("/student/login-rating/")),
        settle(getStudentChallenges()),
        settle(getStudentBatches()),
      ]);

      if (dashboardResult.ok) {
        setDashboard(dashboardResult.value.data);
        dashboardLoadedRef.current = true;
      } else {
        const [challengeFallback, batchFallback] = [challengeResult, batchResult];
        const hasFallbackData =
          challengeFallback.ok &&
          challengeFallback.value.success &&
          batchFallback.ok &&
          batchFallback.value.success;

        if (!hasFallbackData) {
          throw dashboardResult.error;
        }
      }

      if (ratingResult.ok) {
        setLoginRating(ratingResult.value.data?.current_week || null);
      }

      if (challengeResult.ok && challengeResult.value.success) {
        setChallenges(challengeResult.value.data);
      }

      if (batchResult.ok && batchResult.value.success) {
        setStudentBatches(batchResult.value.data);
      }
    } catch (error: any) {
      console.log("OVERVIEW LOAD ERROR:", error?.response?.status, error?.response?.data || error?.message || error);
      setErrorMsg(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Failed to load overview"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOverviewData();
  };

  const courseContexts = useMemo(() => {
    const challengeByPair = new Map<string, StudentChallengeSummary>();
    challenges.forEach((challenge) => {
      challengeByPair.set(`${challenge.course}-${challenge.batch}`, challenge);
    });

    const contexts: CourseContext[] = [];
    const seenCourses = new Set<string>();
    const sortedBatches = [...studentBatches].sort((a, b) => {
      const aCurrent = a.is_current_assignment === false || a.assignment_role === "previous" ? 1 : 0;
      const bCurrent = b.is_current_assignment === false || b.assignment_role === "previous" ? 1 : 0;
      return aCurrent - bCurrent;
    });

    sortedBatches.forEach((batch) => {
      const courseId = batch.course_id;
      const courseKey = courseId ? String(courseId) : batch.course_name_display || batch.course_name || String(batch.id);
      if (seenCourses.has(courseKey)) return;
      seenCourses.add(courseKey);
      const challenge = courseId
        ? challenges.find((item) => item.course === courseId && item.batch === batch.id)
        : challengeByPair.get(`${courseKey}-${batch.id}`);

      contexts.push({
        key: `course-${courseKey}`,
        courseId,
        batchId: batch.id,
        courseName: batch.course_name_display || batch.course_name || challenge?.course_name || "Course",
        batchNumber: batch.batch_code || batch.batch_number || challenge?.batch_code || challenge?.batch_number || "Assigned Batch",
        mentorName: formatMentorNames(batch),
        timing: batch.batch_time || batch.timing || "Timing not assigned",
        completedSessions: Number(challenge?.completed_sessions ?? batch.completed_sessions ?? 0),
        totalSessions: Number(challenge?.total_sessions ?? batch.total_sessions ?? 0),
        progressPercentage: clampPercent(batch.progress_percentage),
        challenge,
      });
    });

    challenges.forEach((challenge) => {
      const courseKey = String(challenge.course);
      if (seenCourses.has(courseKey)) return;
      seenCourses.add(courseKey);
      contexts.push({
        key: `course-${courseKey}`,
        courseId: challenge.course,
        batchId: challenge.batch,
        courseName: challenge.course_name || "Course Challenge",
        batchNumber: challenge.batch_code || challenge.batch_number || "Assigned Batch",
        mentorName: "Assigned mentor",
        timing: "Timing not assigned",
        completedSessions: 0,
        totalSessions: 0,
        progressPercentage: 0,
        challenge,
      });
    });

    if (!contexts.length && dashboard?.student) {
      contexts.push({
        key: "legacy-course",
        courseName: dashboard.student.course || "Course not assigned",
        batchNumber: dashboard.student.assigned_batch_code || dashboard.student.assigned_batch_number || "Not assigned",
        mentorName: dashboard.student.assigned_staff_name || "Not assigned",
        timing: "Timing not assigned",
        completedSessions: 0,
        totalSessions: 0,
        progressPercentage: 0,
      });
    }

    return contexts;
  }, [challenges, dashboard?.student, studentBatches]);

  const activeContext = useMemo(() => {
    return courseContexts.find((context) => context.key === activeCourseKey) || courseContexts[0] || null;
  }, [activeCourseKey, courseContexts]);

  useEffect(() => {
    if (!courseContexts.length) return;
    if (!activeCourseKey || !courseContexts.some((context) => context.key === activeCourseKey)) {
      setActiveCourseKey(courseContexts[0].key);
    }
  }, [activeCourseKey, courseContexts]);

  useEffect(() => {
    let cancelled = false;

    const loadSessionsForCourse = async () => {
      if (!activeContext?.courseId && !activeContext?.batchId) {
        setSessions([]);
        return;
      }

      try {
        setSessionsLoading(true);
        const response = await api.get("sessions/student/", {
          params: {
            course_id: activeContext.courseId,
            batch_id: activeContext.batchId,
          },
        });
        const sessionData = response.data;
        const list = Array.isArray(sessionData)
          ? sessionData
          : Array.isArray(sessionData?.results)
          ? sessionData.results
          : [];
        if (!cancelled) setSessions(list);
      } catch (sessionError) {
        console.log("OVERVIEW SESSION LOAD ERROR:", sessionError);
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    };

    loadSessionsForCourse();

    return () => {
      cancelled = true;
    };
  }, [activeContext?.batchId, activeContext?.courseId]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => Number(a.session_number || 0) - Number(b.session_number || 0)
      ),
    [sessions]
  );

  const previousClass = useMemo(() => {
    const finished = sortedSessions.filter(
      (session) =>
        session.staff_completed ||
        session.student_status === "completed" ||
        session.student_status === "pending" ||
        session.student_status === "doubt"
    );
    return finished[finished.length - 1] || null;
  }, [sortedSessions]);

  const upcomingClass = useMemo(() => {
    if (!sortedSessions.length) return null;
    const next = sortedSessions.find(
      (session) =>
        !session.staff_completed &&
        session.student_status !== "completed" &&
        session.student_status !== "pending" &&
        session.student_status !== "doubt"
    );
    return next || null;
  }, [sortedSessions]);

  const weeklyStars = loginRating?.stars ?? 0;

  useEffect(() => {
    Animated.spring(starAnim, {
      toValue: weeklyStars,
      friction: 6,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [starAnim, weeklyStars]);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.helperText}>Loading overview...</Text>
      </View>
    );
  }

  if (errorMsg && !dashboard) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOverviewData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const student = dashboard?.student;
  const studentName =
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Student";
  const attendancePercentage = clampPercent(dashboard?.attendance_percentage);
  const presentClasses = dashboard?.present_classes ?? 0;
  const totalClasses = dashboard?.total_classes ?? 0;
  const completedSessions = activeContext
    ? activeContext.completedSessions
    : dashboard?.sessions_completed ??
      sortedSessions.filter((session) => session.student_status === "completed")
        .length;
  const totalSessions = activeContext
    ? activeContext.totalSessions || sortedSessions.length
    : dashboard?.total_sessions || sortedSessions.length;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#5523D2"
          />
        }
      >
        <WeeklyStarRating
          rating={loginRating}
          animatedValue={starAnim}
          onPress={() => router.push("/login-rating-history" as any)}
        />

        {errorMsg ? <Text style={styles.inlineErrorText}>{errorMsg}</Text> : null}

        {courseContexts.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.courseTabs}
          >
            {courseContexts.map((context) => {
              const active = context.key === activeContext?.key;
              return (
                <TouchableOpacity
                  key={context.key}
                  activeOpacity={0.86}
                  style={[styles.courseTab, active && styles.courseTabActive]}
                  onPress={() => setActiveCourseKey(context.key)}
                >
                  <Text style={[styles.courseTabText, active && styles.courseTabTextActive]} numberOfLines={1}>
                    {context.courseName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="analytics-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>Student Overview</Text>
              <Text style={styles.heroTitle}>Hello, {studentName}</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.courseRow}>
            <View style={styles.courseIcon}>
              <Ionicons name="school-outline" size={24} color="#2E1065" />
            </View>
            <View style={styles.courseTextBlock}>
              <Text style={styles.courseLabel}>Course Enrolled</Text>
              <Text style={styles.courseTitle}>{activeContext?.courseName || student?.course || "Course not assigned"}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <InfoTile
              label="Batch"
              value={activeContext?.batchNumber || student?.assigned_batch_code || student?.assigned_batch_number || "Not assigned"}
              icon="layers-outline"
            />
            <InfoTile
              label="Mentor"
              value={activeContext?.mentorName || student?.assigned_staff_name || "Not assigned"}
              icon="person-outline"
            />
          </View>
          <View style={styles.timingPill}>
            <Ionicons name="time-outline" size={15} color="#DDD6FE" />
            <Text style={styles.timingPillText}>{activeContext?.timing || "Timing not assigned"}</Text>
          </View>
        </View>

        <View style={styles.progressPanel}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.panelKicker}>Attendance Progress</Text>
              <Text style={styles.progressTitle}>{attendancePercentage}%</Text>
            </View>
            <View style={styles.progressBadge}>
              <Ionicons name="trending-up-outline" size={16} color="#6D28D9" />
              <Text style={styles.progressBadgeText}>
                {presentClasses}/{totalClasses}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${attendancePercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            Classes attended from your assigned batch schedule.
          </Text>
        </View>

        <View style={styles.challengePanel}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIcon}>
              <Ionicons name="flash-outline" size={23} color="#FFFFFF" />
            </View>
            <View style={styles.challengeHeaderText}>
              <Text style={styles.panelKicker}>Daily Practice</Text>
              <Text style={styles.challengeTitle}>15-Day Challenge</Text>
            </View>
          </View>

          {activeContext?.challenge ? (
              <ChallengeCard
                challenge={activeContext.challenge}
                onPress={() =>
                  router.push({
                    pathname: "/challenge",
                    params: {
                      courseId: String(activeContext.challenge?.course),
                      batchId: String(activeContext.challenge?.batch),
                    },
                  } as any)
                }
              />
          ) : (
            <View style={styles.challengeEmpty}>
              <Text style={styles.challengeEmptyTitle}>No challenge assigned yet</Text>
              <Text style={styles.challengeEmptyText}>
                Your 15-day challenge will appear after completed sessions have question pools.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sessionSummaryRow}>
          <View style={styles.sessionMiniCard}>
            <Text style={styles.sessionMiniNumber}>{sessionsLoading ? "-" : completedSessions}</Text>
            <Text style={styles.sessionMiniText}>Completed</Text>
          </View>
          <View style={styles.sessionMiniCard}>
            <Text style={styles.sessionMiniNumber}>{sessionsLoading ? "-" : totalSessions}</Text>
            <Text style={styles.sessionMiniText}>Total Sessions</Text>
          </View>
        </View>

        <View style={styles.timelinePanel}>
          <View style={styles.timelineHeader}>
            <View>
              <Text style={styles.panelKicker}>Session Sheet</Text>
              <Text style={styles.sectionTitle}>Class Timeline</Text>
            </View>
            <TouchableOpacity
              style={styles.logsheetButton}
              onPress={() => router.push("/logsheet" as any)}
            >
              <Text style={styles.logsheetButtonText}>View All</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <SessionCard
            variant="upcoming"
            label="Upcoming Class"
            session={upcomingClass}
            fallbackTitle="No upcoming session"
            fallbackText="Your next topic will appear after the session sheet is updated."
          />

          <SessionCard
            variant="previous"
            label="Previous Class"
            session={previousClass}
            fallbackTitle="No previous class yet"
            fallbackText="Completed class topics will show here from the session sheet."
          />
        </View>
      </ScrollView>

      <CustomBottomNav />
    </View>
  );
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.infoTile}>
      <Ionicons name={icon} size={17} color="#C4B5FD" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function WeeklyStarRating({
  rating,
  animatedValue,
  onPress,
}: {
  rating: WeeklyLoginRating | null;
  animatedValue: Animated.Value;
  onPress: () => void;
}) {
  const stars = rating?.stars ?? 0;
  const scale = animatedValue.interpolate({
    inputRange: [0, 5],
    outputRange: [0.96, 1.04],
    extrapolate: "clamp",
  });

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.ratingCard} onPress={onPress}>
      <View style={styles.ratingHeader}>
        <View style={styles.ratingIcon}>
          <Ionicons name="sparkles" size={17} color="#B45309" />
        </View>
        <View>
          <Text style={styles.ratingKicker}>Weekly Login</Text>
          <Text style={styles.ratingTitle}>{stars}/5 Stars</Text>
        </View>
      </View>
      <Animated.View style={[styles.starRow, { transform: [{ scale }] }]}>
        {Array.from({ length: 5 }).map((_, index) => {
          const active = index < stars;
          return (
            <Ionicons
              key={index}
              name={active ? "star" : "star-outline"}
              size={22}
              color={active ? "#F59E0B" : "#D8CFF6"}
            />
          );
        })}
      </Animated.View>
      <View style={styles.ratingFooter}>
        <Text style={styles.ratingHint}>2 logins/day earns 1 star</Text>
        <Ionicons name="chevron-forward" size={16} color="#7C3AED" />
      </View>
    </TouchableOpacity>
  );
}

function ChallengeCard({
  challenge,
  onPress,
}: {
  challenge: StudentChallengeSummary;
  onPress: () => void;
}) {
  const completedDays = Math.max(0, Math.min(Number(challenge.completed_days || 0), 15));
  const isCompleted = challenge.status === "completed";
  const nextDay = isCompleted ? 15 : Number(challenge.next_day || Math.min(completedDays + 1, 15));
  const progress = Math.round((completedDays / 15) * 100);
  const buttonText = isCompleted ? "View Achievement" : challenge.start_date ? "Continue Challenge" : "Start Challenge";
  const completedLearningSessions = Number(challenge.completed_sessions || 0);
  const totalLearningSessions = Number(challenge.total_sessions || 0);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.challengeCard, isCompleted && styles.challengeCardCompleted]}
      onPress={onPress}
    >
      <View style={styles.challengeCardTop}>
        <View style={styles.challengeGameIcon}>
          <Ionicons name={isCompleted ? "trophy-outline" : "game-controller-outline"} size={25} color="#FFFFFF" />
        </View>
        <View style={styles.challengeCourseBlock}>
          <Text style={styles.challengeCourse} numberOfLines={1}>
            {isCompleted ? "Challenge Completed" : "15-Day Challenge"}
          </Text>
          <Text style={styles.challengeBatch} numberOfLines={1}>
            {challenge.course_name || "Course"} · {challenge.batch_code || challenge.batch_number || "Batch"}
          </Text>
        </View>
        <View style={styles.challengeDayBadge}>
          <Text style={styles.challengeDayText}>{completedDays}/15</Text>
        </View>
      </View>
      {isCompleted ? (
        <View style={styles.achievementBanner}>
          <Ionicons name="ribbon-outline" size={18} color="#92400E" />
          <Text style={styles.achievementBannerText}>
            {challenge.achievement?.badge_title || "Excellent Student"}
          </Text>
        </View>
      ) : null}
      <View style={styles.challengeStageRow}>
        {Array.from({ length: 15 }).map((_, index) => {
          const active = index < completedDays;
          const current = index + 1 === nextDay && !isCompleted;
          return (
            <View
              key={index}
              style={[
                styles.challengeStageDot,
                active && styles.challengeStageDotDone,
                current && styles.challengeStageDotCurrent,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.challengeStats}>
        <View style={styles.challengeStat}>
          <Ionicons name="flag-outline" size={17} color="#FDE68A" />
          <Text style={styles.challengeStatValue}>{completedDays}/15</Text>
          <Text style={styles.challengeStatLabel}>Challenge Days</Text>
        </View>
        <View style={styles.challengeStat}>
          <Ionicons name="book-outline" size={17} color="#C4B5FD" />
          <Text style={styles.challengeStatValue}>{completedLearningSessions}/{totalLearningSessions}</Text>
          <Text style={styles.challengeStatLabel}>Completed Sessions</Text>
        </View>
      </View>
      <View style={styles.challengeStats}>
        <View style={styles.challengeStat}>
          <Ionicons name="flame-outline" size={17} color="#FDE68A" />
          <Text style={styles.challengeStatValue}>{challenge.current_streak || 0}</Text>
          <Text style={styles.challengeStatLabel}>Streak</Text>
        </View>
        <View style={styles.challengeStat}>
          <Ionicons name="play-forward-outline" size={17} color="#C4B5FD" />
          <Text style={styles.challengeStatValue}>{isCompleted ? "Done" : `Day ${nextDay}`}</Text>
          <Text style={styles.challengeStatLabel}>Next Step</Text>
        </View>
      </View>
      <View style={styles.challengeTrack}>
        <View style={[styles.challengeFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.challengeActionRow}>
        <Text style={styles.challengeActionText}>{buttonText}</Text>
        <Ionicons name="arrow-forward-circle" size={22} color="#5523D2" />
      </View>
    </TouchableOpacity>
  );
}

function SessionCard({
  label,
  session,
  variant,
  fallbackTitle,
  fallbackText,
}: {
  label: string;
  session: SessionItem | null;
  variant: "previous" | "upcoming";
  fallbackTitle: string;
  fallbackText: string;
}) {
  const isUpcoming = variant === "upcoming";
  const title = session ? getSessionTitle(session) : fallbackTitle;
  const topics = session ? cleanTopics(session.topics) : fallbackText;
  const dateText = session
    ? formatSessionDate(session.completed_date || session.student_confirmed_at)
    : "Waiting for update";

  return (
    <View style={styles.sessionCard}>
      <View
        style={[
          styles.timelineDot,
          isUpcoming ? styles.timelineDotUpcoming : styles.timelineDotPrevious,
        ]}
      >
        <Ionicons
          name={isUpcoming ? "radio-button-on" : "checkmark-circle"}
          size={18}
          color={isUpcoming ? "#FDE68A" : "#86EFAC"}
        />
      </View>
      <View style={styles.sessionBody}>
        <View style={styles.sessionTopLine}>
          <Text style={styles.sessionLabel}>{label}</Text>
          <Text style={styles.sessionDate}>{dateText}</Text>
        </View>
        <Text style={styles.sessionTitle}>{title}</Text>
        <View style={styles.topicBox}>
          <Ionicons name="book-outline" size={15} color="#A78BFA" />
          <Text style={styles.topicText}>{topics}</Text>
        </View>
      </View>
    </View>
  );
}

function clampPercent(value?: number) {
  const parsed = Number(value || 0);
  return Math.max(0, Math.min(Math.round(parsed), 100));
}

function formatMentorNames(batch: StudentBatchSummary) {
  const names = Array.isArray(batch.trainer_names)
    ? batch.trainer_names.filter(Boolean)
    : [];
  if (names.length) return names.join(", ");
  return batch.faculty_name || "Not assigned";
}

function getSessionTitle(session: SessionItem) {
  const title = session.title?.trim() || "Session";
  if (title.toLowerCase().startsWith("session")) return title;
  return `Session ${session.session_number}: ${title}`;
}

function cleanTopics(topics?: string | null) {
  const cleaned = (topics || "")
    .replace(/\s+/g, " ")
    .replace(/^[-:,\s]+/, "")
    .trim();
  if (!cleaned) return "Topics will be updated from the session sheet.";
  return cleaned.length > 150 ? `${cleaned.slice(0, 147)}...` : cleaned;
}

function formatSessionDate(date?: string | null) {
  if (!date) return "Session sheet";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Session sheet";
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
    backgroundColor: "#F6F3FF",
    padding: 24,
  },
  helperText: {
    marginTop: 12,
    color: "#6D28D9",
  },
  errorText: {
    color: "#DC2626",
    textAlign: "center",
  },
  inlineErrorText: {
    color: "#B91C1C",
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "800",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#FFFFFF",
  },
  courseTabs: {
    gap: 10,
    paddingBottom: 14,
  },
  courseTab: {
    maxWidth: 190,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DED7FF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  courseTabActive: {
    borderColor: "#5523D2",
    backgroundColor: "#5523D2",
  },
  courseTabText: {
    color: "#6B5A80",
    fontSize: 13,
    fontWeight: "800",
  },
  courseTabTextActive: {
    color: "#FFFFFF",
  },
  ratingCard: {
    alignSelf: "flex-start",
    minWidth: 210,
    marginBottom: 14,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFFFF",
    shadowColor: "#B45309",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ratingIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
  },
  ratingKicker: {
    color: "#9A6A04",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  ratingTitle: {
    marginTop: 1,
    color: "#2E1065",
    fontSize: 18,
    fontWeight: "900",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  ratingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 10,
  },
  ratingHint: {
    flex: 1,
    color: "#6B5A80",
    fontSize: 11,
    fontWeight: "700",
  },
  hero: {
    backgroundColor: "#5523D2",
    borderRadius: 28,
    padding: 18,
    shadowColor: "#5523D2",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroCopy: {
    flex: 1,
    marginLeft: 12,
  },
  kicker: {
    color: "#DDD6FE",
    fontSize: 11,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 31,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 16,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  courseIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  courseTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  courseLabel: {
    color: "#C4B5FD",
    fontSize: 12,
  },
  courseTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 23,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  timingPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  timingPillText: {
    flexShrink: 1,
    color: "#F5F3FF",
    fontSize: 12,
    fontWeight: "800",
  },
  infoTile: {
    flex: 1,
    minHeight: 94,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  infoLabel: {
    color: "#C4B5FD",
    fontSize: 11,
    marginTop: 8,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
  progressPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelKicker: {
    color: "#A78BFA",
    fontSize: 11,
    textTransform: "uppercase",
  },
  progressTitle: {
    color: "#2E1065",
    fontSize: 34,
    lineHeight: 42,
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
    color: "#4C1D95",
    fontSize: 12,
  },
  progressTrack: {
    height: 13,
    borderRadius: 999,
    backgroundColor: "#EDE9FE",
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#A855F7",
  },
  progressHint: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 11,
  },
  challengePanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5523D2",
  },
  challengeHeaderText: {
    flex: 1,
    marginLeft: 11,
  },
  challengeTitle: {
    color: "#2E1065",
    fontSize: 22,
    lineHeight: 29,
  },
  challengeCard: {
    borderRadius: 20,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    backgroundColor: "#2E1065",
  },
  challengeCardCompleted: {
    borderColor: "#FBBF24",
    backgroundColor: "#24104F",
  },
  challengeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  challengeGameIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  challengeCourseBlock: {
    flex: 1,
    minWidth: 0,
  },
  challengeCourse: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  challengeBatch: {
    color: "#DDD6FE",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  challengeDayBadge: {
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  challengeDayText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "900",
  },
  achievementBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 15,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  achievementBannerText: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
    fontWeight: "900",
  },
  challengeStageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  challengeStageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  challengeStageDotDone: {
    backgroundColor: "#FBBF24",
  },
  challengeStageDotCurrent: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#A78BFA",
  },
  challengeStats: {
    flexDirection: "row",
    gap: 9,
    marginTop: 12,
  },
  challengeStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 11,
  },
  challengeStatValue: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  challengeStatLabel: {
    color: "#DDD6FE",
    fontSize: 11,
    fontWeight: "700",
  },
  challengeTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    marginTop: 12,
  },
  challengeFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FBBF24",
  },
  challengeActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  challengeActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  challengeEmpty: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FBF9FF",
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  challengeEmptyTitle: {
    color: "#2E1065",
    fontSize: 15,
    fontWeight: "900",
  },
  challengeEmptyText: {
    color: "#6B5A80",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  sessionSummaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  sessionMiniCard: {
    flex: 1,
    backgroundColor: "#FBF9FF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  sessionMiniNumber: {
    color: "#2E1065",
    fontSize: 27,
    lineHeight: 34,
  },
  sessionMiniText: {
    color: "#6B7280",
    fontSize: 12,
  },
  timelinePanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#2E1065",
    fontSize: 22,
    lineHeight: 29,
  },
  logsheetButton: {
    minHeight: 38,
    borderRadius: 14,
    backgroundColor: "#6D28D9",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logsheetButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  sessionCard: {
    flexDirection: "row",
    backgroundColor: "#FBF9FF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE7FF",
    marginTop: 11,
  },
  timelineDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timelineDotUpcoming: {
    backgroundColor: "rgba(253,230,138,0.14)",
  },
  timelineDotPrevious: {
    backgroundColor: "rgba(134,239,172,0.13)",
  },
  sessionBody: {
    flex: 1,
    minWidth: 0,
  },
  sessionTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sessionLabel: {
    color: "#A78BFA",
    fontSize: 11,
    textTransform: "uppercase",
  },
  sessionDate: {
    color: "#7C3AED",
    fontSize: 11,
  },
  sessionTitle: {
    color: "#1F1335",
    fontSize: 16,
    lineHeight: 22,
    marginTop: 5,
  },
  topicBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F5F3FF",
    borderRadius: 15,
    padding: 11,
    marginTop: 10,
  },
  topicText: {
    flex: 1,
    color: "#4B5563",
    fontSize: 12,
    lineHeight: 18,
  },
});

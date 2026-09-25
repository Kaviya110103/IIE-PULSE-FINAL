import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getTodayChallenge,
  StudentChallengeDay,
  StudentChallengeSummary,
  StudentChallengeToday,
  submitChallengeDay,
} from "@/services/api";

type AnswerMap = Record<number, string>;

export default function ChallengeScreen() {
  const { courseId, batchId } = useLocalSearchParams<{ courseId?: string; batchId?: string }>();
  const resolvedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;
  const resolvedBatchId = Array.isArray(batchId) ? batchId[0] : batchId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<StudentChallengeToday | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const day = payload?.day || null;
  const challenge = payload?.challenge || null;
  const questions = day?.questions || [];
  const currentQuestion = questions[currentIndex] || null;
  const answeredCount = Object.keys(answers).length;
  const isCompleted = submitted || payload?.state === "completed" || day?.status === "completed";
  const canSubmit = questions.length === 5 && answeredCount === 5 && !submitting && !isCompleted;

  const loadChallenge = useCallback(async (isRefresh = false) => {
    if (!resolvedCourseId || !resolvedBatchId) {
      setError("Challenge course and batch details are missing.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const result = await getTodayChallenge(resolvedCourseId, resolvedBatchId);
      if (!result.success || !result.data) {
        setError(cleanError(result.error));
        return;
      }
      setPayload(result.data);
      setAnswers({});
      setCurrentIndex(0);
      setSubmitted(result.data.day?.status === "completed" || result.data.state === "completed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolvedCourseId, resolvedBatchId]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const selectAnswer = (questionId: number, key: string) => {
    if (isCompleted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: key }));
  };

  const handleSubmit = () => {
    if (!day) return;
    if (!canSubmit) {
      Alert.alert("Complete all questions", "Please answer all 5 questions before submitting.");
      return;
    }

    Alert.alert("Submit Challenge", "Submit today's 15-Day Challenge answers?", [
      { text: "Cancel", style: "cancel" },
      { text: "Submit", onPress: submitAnswers },
    ]);
  };

  const submitAnswers = async () => {
    if (!day) return;
    try {
      setSubmitting(true);
      const answerList = questions.map((question) => ({
        question_id: question.question,
        selected_answer: answers[question.question],
      }));
      const result = await submitChallengeDay(day.id, answerList);
      if (!result.success || !result.data) {
        Alert.alert("Submit failed", cleanError(result.error));
        return;
      }
      setPayload(result.data);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const statusView = useMemo(() => {
    if (!payload || !challenge) return null;
    if (payload.state === "insufficient_questions") {
      return (
        <StateCard
          icon="hourglass-outline"
          title="Challenge Not Ready"
          text="Your completed sessions do not have enough challenge questions yet. Please try again later."
          challenge={challenge}
        />
      );
    }
    if (payload.state === "outside_window") {
      return (
        <StateCard
          icon="calendar-outline"
          title="Challenge Window Closed"
          text="This 15-day challenge is outside the active window."
          challenge={challenge}
        />
      );
    }
    if (payload.state === "completed" && !day) {
      return (
        <StateCard
          icon="trophy-outline"
          title="Challenge Completed"
          text="You have completed the full 15-day challenge."
          challenge={challenge}
        />
      );
    }
    if (day?.status === "completed") {
      return <ResultCard challenge={challenge} day={day} onContinue={() => loadChallenge(true)} />;
    }
    if (day && questions.length !== 5) {
      return (
        <StateCard
          icon="alert-circle-outline"
          title="Questions Unavailable"
          text="Today's challenge must contain exactly 5 questions. Please try again later."
          challenge={challenge}
        />
      );
    }
    return null;
  }, [payload, challenge, day, questions.length, loadChallenge]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F6F3FF" barStyle="dark-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5523D2" />
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F6F3FF" barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadChallenge(true)} tintColor="#5523D2" />
        }
      >
        <View style={styles.hero}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/home" as any)}>
            <Ionicons name="chevron-back" size={22} color="#5523D2" />
          </Pressable>
          <View style={styles.heroText}>
            <Text style={styles.kicker}>15-Day Challenge</Text>
            <Text style={styles.title}>{challenge?.course_name || "Daily Practice"}</Text>
            <Text style={styles.subtitle}>{challenge?.batch_code || challenge?.batch_number || "Assigned batch"}</Text>
          </View>
        </View>

        {error ? (
          <StateCard
            icon="cloud-offline-outline"
            title="Unable to Load"
            text={error}
            actionText="Retry"
            onAction={() => loadChallenge()}
          />
        ) : statusView ? (
          statusView
        ) : day && currentQuestion ? (
          <>
            <View style={styles.progressCard}>
              <View>
                <Text style={styles.progressLabel}>Day {day.day_number}/15</Text>
                <Text style={styles.progressTitle}>Question {currentIndex + 1} of 5</Text>
              </View>
              <View style={styles.streakPill}>
                <Ionicons name="flame-outline" size={16} color="#B45309" />
                <Text style={styles.streakText}>{challenge?.current_streak || 0} Streak</Text>
              </View>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.sessionTag}>
                Session {currentQuestion.source_session_number || "-"} · {currentQuestion.source_session_title || "Completed topic"}
              </Text>
              <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
              <View style={styles.optionList}>
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.question] === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => selectAnswer(currentQuestion.question, option.key)}
                    >
                      <View style={[styles.optionKey, selected && styles.optionKeySelected]}>
                        <Text style={[styles.optionKeyText, selected && styles.optionKeyTextSelected]}>{option.key}</Text>
                      </View>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.navRow}>
              <Pressable
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                disabled={currentIndex === 0}
                onPress={() => setCurrentIndex((value) => Math.max(value - 1, 0))}
              >
                <Ionicons name="arrow-back" size={17} color={currentIndex === 0 ? "#A7A3B3" : "#5523D2"} />
                <Text style={[styles.navText, currentIndex === 0 && styles.navTextDisabled]}>Previous</Text>
              </Pressable>
              {currentIndex < questions.length - 1 ? (
                <Pressable style={styles.primaryButton} onPress={() => setCurrentIndex((value) => value + 1)}>
                  <Text style={styles.primaryButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]} onPress={handleSubmit}>
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Submit</Text>}
                </Pressable>
              )}
            </View>

            <Text style={styles.answerHint}>{answeredCount}/5 answered</Text>
          </>
        ) : (
          <StateCard
            icon="help-circle-outline"
            title="No Challenge Today"
            text="There is no active challenge available for this course and batch."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({
  challenge,
  day,
  onContinue,
}: {
  challenge: StudentChallengeSummary;
  day: StudentChallengeDay;
  onContinue: () => void;
}) {
  const isFinal = challenge.status === "completed" || day.day_number >= 15;
  const scorePercent = Number(challenge.final_score_percentage || 0);
  const completedAt = challenge.completion_date || challenge.achievement?.completed_at || day.completed_at;
  const completionDate = completedAt ? formatDisplayDate(completedAt) : "Today";
  const daysTaken = challenge.calendar_days_taken || challenge.achievement?.calendar_days_taken;

  return (
    <View style={[styles.resultCard, isFinal && styles.achievementCard]}>
      <View style={[styles.resultIcon, isFinal && styles.achievementIcon]}>
        <Ionicons name={isFinal ? "trophy-outline" : "checkmark-done"} size={34} color="#FFFFFF" />
      </View>
      <Text style={styles.resultTitle}>
        {isFinal ? "Challenge Completed!" : `Day ${day.day_number} Complete`}
      </Text>
      <Text style={styles.resultScore}>Score {day.score}/{day.total_questions || 5}</Text>
      {isFinal ? (
        <>
          <Text style={styles.achievementText}>
            {challenge.quick_completion
              ? `You completed the challenges quickly${daysTaken ? ` in ${daysTaken} days` : ""}! Keep up the great work.`
              : "Congratulations! You completed the 15-Day Challenge."}
          </Text>
          <View style={styles.badgePill}>
            <Ionicons name="ribbon-outline" size={18} color="#92400E" />
            <Text style={styles.badgePillText}>{challenge.achievement?.badge_title || "Excellent Student"}</Text>
          </View>
        </>
      ) : null}
      <View style={styles.resultStats}>
        <MiniStat label="Day" value={`${day.day_number}/15`} />
        <MiniStat label="Streak" value={String(challenge.current_streak || 0)} />
        <MiniStat label="Progress" value={`${challenge.completed_days || 0}/15`} />
      </View>
      {isFinal ? (
        <View style={styles.resultStats}>
          <MiniStat label="Final Score" value={`${scorePercent || Math.round((day.score / (day.total_questions || 5)) * 100)}%`} />
          <MiniStat label="Longest" value={`${challenge.longest_streak || 0} days`} />
          <MiniStat label="Completed" value={completionDate} />
        </View>
      ) : null}
      <Pressable style={styles.fullButton} onPress={isFinal ? () => router.replace("/home" as any) : onContinue}>
        <Text style={styles.fullButtonText}>{isFinal ? "Back to Dashboard" : "Continue to Next Challenge"}</Text>
      </Pressable>
    </View>
  );
}

function StateCard({
  icon,
  title,
  text,
  challenge,
  actionText,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  challenge?: StudentChallengeSummary;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={30} color="#5523D2" />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {challenge ? (
        <View style={styles.resultStats}>
          <MiniStat label="Streak" value={String(challenge.current_streak || 0)} />
          <MiniStat label="Completed" value={`${challenge.completed_days || 0}/15`} />
        </View>
      ) : null}
      <Pressable style={styles.fullButton} onPress={onAction || (() => router.replace("/home" as any))}>
        <Text style={styles.fullButtonText}>{actionText || "Back to Dashboard"}</Text>
      </Pressable>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function cleanError(message: string) {
  if (!message) return "Something went wrong. Please try again.";
  if (message.toLowerCase().includes("not enough eligible")) {
    return "Your completed sessions do not have enough challenge questions yet.";
  }
  if (message.toLowerCase().includes("not enrolled")) {
    return "This challenge is not available for your assigned course and batch.";
  }
  return message;
}

function formatDisplayDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Today";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 34,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#5523D2",
    fontWeight: "700",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#5523D2",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: "#DDD6FE",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  subtitle: {
    color: "#EDE9FE",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE7FF",
    marginBottom: 14,
  },
  progressLabel: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  progressTitle: {
    color: "#2E1065",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  streakText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900",
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  sessionTag: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
  },
  questionText: {
    color: "#1F1335",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 28,
  },
  optionList: {
    gap: 10,
    marginTop: 18,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    backgroundColor: "#FBF9FF",
    padding: 12,
  },
  optionSelected: {
    borderColor: "#5523D2",
    backgroundColor: "#F5F3FF",
  },
  optionKey: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE9FE",
  },
  optionKeySelected: {
    backgroundColor: "#5523D2",
  },
  optionKeyText: {
    color: "#5523D2",
    fontWeight: "900",
  },
  optionKeyTextSelected: {
    color: "#FFFFFF",
  },
  optionText: {
    flex: 1,
    color: "#3D334F",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  optionTextSelected: {
    color: "#2E1065",
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  navButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DED7FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "#FFFFFF",
  },
  navButtonDisabled: {
    backgroundColor: "#F3F0FA",
  },
  navText: {
    color: "#5523D2",
    fontWeight: "900",
  },
  navTextDisabled: {
    color: "#A7A3B3",
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  answerHint: {
    color: "#6B5A80",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
  },
  resultCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  achievementCard: {
    borderColor: "#FBBF24",
    backgroundColor: "#FFFDF7",
  },
  resultIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  achievementIcon: {
    backgroundColor: "#F59E0B",
  },
  resultTitle: {
    color: "#2E1065",
    fontSize: 23,
    fontWeight: "900",
  },
  resultScore: {
    color: "#5523D2",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  achievementText: {
    color: "#5B526E",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 14,
  },
  badgePillText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "900",
  },
  resultStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    alignSelf: "stretch",
  },
  miniStat: {
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  miniValue: {
    color: "#2E1065",
    fontSize: 18,
    fontWeight: "900",
  },
  miniLabel: {
    color: "#6B5A80",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  fullButton: {
    alignSelf: "stretch",
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  fullButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEE7FF",
  },
  stateIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stateTitle: {
    color: "#2E1065",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    color: "#5B526E",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
});

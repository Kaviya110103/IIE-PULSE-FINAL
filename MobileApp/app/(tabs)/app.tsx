import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import api from "@/services/api";

type QuizQuestion = {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  options?: { key: string; text: string }[];
  marks?: number;
};

type QuizItem = {
  id: number;
  title: string;
  description?: string;
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  passing_marks: number;
  max_attempts?: number;
  user_attempts?: number;
  best_score?: number | null;
  questions: QuizQuestion[];
  test_type?: string;
  creation_method?: string;
  instructions?: string;
  question_paper_url?: string | null;
};

type QuizResult = {
  attempt_id?: number;
  score: number;
  total_marks: number;
  percentage: number;
  is_passed: boolean;
  correct_count: number;
  wrong_count?: number;
  attempted_count?: number;
  total_questions: number;
};

type QuizMode = "practice" | "excel" | "assigned-test";
const PUBLIC_PRACTICE_RESULTS_KEY = "public_practice_results";

export default function App() {
  const { quizId, mode } = useLocalSearchParams<{ quizId?: string; mode?: string }>();
  const routeMode = Array.isArray(mode) ? mode[0] : mode;
  const isPracticeMode = routeMode === "practice";
  const isAssignedTestMode = routeMode === "assigned-test";

  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [resolvedMode, setResolvedMode] = useState<QuizMode | null>(null);
  const [submissionFile, setSubmissionFile] = useState<any>(null);

  const questions = quiz?.questions || [];
  const activeMode: QuizMode = resolvedMode ?? (isAssignedTestMode ? "assigned-test" : isPracticeMode ? "practice" : "excel");
  const isPracticeAttempt = activeMode === "practice";
  const isAssignedTestAttempt = activeMode === "assigned-test";

  const getPracticeSubmitter = async () => {
    const [guestSessionRaw, studentId, studentName] = await Promise.all([
      AsyncStorage.getItem("guest_session"),
      AsyncStorage.getItem("student_id"),
      AsyncStorage.getItem("student_name"),
    ]);
    const guestSession = guestSessionRaw ? JSON.parse(guestSessionRaw) : {};

    return {
      username: guestSession?.username || studentId || undefined,
      name: guestSession?.name || studentName || undefined,
      email: guestSession?.email,
      mobile: guestSession?.mobile,
    };
  };

  const returnToSource = () => {
    if (isPracticeAttempt || isPracticeMode) {
      router.replace({ pathname: "/welcome", params: { module: "practice" } } as any);
      return;
    }

      router.replace("/quizzes" as any);
  };

  const loadQuiz = async () => {
    if (!quizId) {
      Alert.alert("Error", "Test id not found.");
      returnToSource();
      return;
    }

    try {
      setLoading(true);
      setResolvedMode(null);
      let selectedQuiz: QuizItem | undefined;

      if (isAssignedTestMode) {
        const response = await api.get(`/tests/${quizId}/questions/`);
        selectedQuiz = {
          id: Number(response.data?.test_id || quizId),
          title: response.data?.test_title || "Upcoming Test",
          description: response.data?.test_description || "",
          test_type: response.data?.test_type,
          creation_method: response.data?.creation_method,
          instructions: response.data?.instructions,
          question_paper_url: response.data?.question_paper_url || null,
          total_questions: response.data?.total_questions || 0,
          total_marks: response.data?.total_questions || 0,
          duration_minutes: response.data?.duration_minutes || 0,
          passing_marks: 50,
          questions: (response.data?.questions || []).map((question: any) => ({
            id: question.id,
            question_text: question.question_text,
            option_a: question.option1,
            option_b: question.option2,
            option_c: question.option3 || "",
            option_d: question.option4 || "",
            correct_answer: question.correct_answer,
            options: [
              { key: "A", text: question.option1 },
              { key: "B", text: question.option2 },
              { key: "C", text: question.option3 || "" },
              { key: "D", text: question.option4 || "" },
            ].filter((option) => option.text),
          })),
        };
        setResolvedMode("assigned-test");
      } else {
        const endpoints = isPracticeMode
          ? [
              { url: "/quiz/practice/", mode: "practice" as const },
              { url: "/quiz/student/", mode: "excel" as const },
            ]
          : [
              { url: "/quiz/student/", mode: "excel" as const },
              { url: "/quiz/practice/", mode: "practice" as const },
            ];

        let lastError: any = null;
        for (const endpoint of endpoints) {
          try {
            const response = await api.get(endpoint.url);
            const allQuizzes: QuizItem[] = response.data?.results || [];
            selectedQuiz = allQuizzes.find((q) => String(q.id) === String(quizId));
            if (selectedQuiz) {
              setResolvedMode(endpoint.mode);
              break;
            }
          } catch (endpointError) {
            lastError = endpointError;
          }
        }

        if (!selectedQuiz && lastError && isPracticeMode) {
          throw lastError;
        }
      }

      if (!selectedQuiz) {
        Alert.alert("Not Found", `This ${isAssignedTestMode ? "test" : "quiz"} is not available for you.`);
        returnToSource();
        return;
      }

      setQuiz(selectedQuiz);
      setTimeLeft((selectedQuiz.duration_minutes || 0) * 60);
      setCurrent(0);
      setAnswers({});
      setResult(null);
      setSubmissionFile(null);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          `Failed to load ${isAssignedTestMode ? "test" : isPracticeMode ? "skillset" : "quiz"}.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();
  }, [quizId, isPracticeMode, isAssignedTestMode]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      returnToSource();
      return true;
    });

    return () => subscription.remove();
  }, [isPracticeAttempt, isPracticeMode]);

  useEffect(() => {
    if (!quiz || result || submitting || questions.length === 0) return;
    if ((quiz.duration_minutes || 0) > 0 && timeLeft <= 0) {
      submitQuiz(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [quiz, result, submitting, timeLeft, questions.length]);

  const heading = useMemo(() => {
    return quiz?.title || "Aptitude Test";
  }, [quiz]);

  const selectAnswer = (questionId: number, option: string) => {
    if (result) return;
    if (answers[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    if (isAssignedTestAttempt && (quiz.creation_method === "upload" || quiz.question_paper_url) && questions.length === 0) {
      submitUploadedTest();
      return;
    }

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      Alert.alert(
        isAssignedTestAttempt || isPracticeAttempt ? "Submit Test" : "Submit Quiz",
        `You answered ${answeredCount}/${questions.length} questions. Submit anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit", onPress: () => submitQuiz(false) },
        ]
      );
      return;
    }

    submitQuiz(false);
  };

  const submitQuiz = async (autoSubmitted = false) => {
    if (!quiz) return;

    try {
      setSubmitting(true);
      const payloadAnswers: Record<string, string> = {};
      Object.entries(answers).forEach(([questionId, option]) => {
        payloadAnswers[String(questionId)] = option;
      });

      const submitUrl = isAssignedTestAttempt
        ? `/tests/${quiz.id}/take/`
        : isPracticeAttempt
        ? `/quiz/practice/${quiz.id}/submit/`
        : `/quiz/${quiz.id}/take/`;
      const practiceSubmitter = isPracticeAttempt ? await getPracticeSubmitter() : {};
      const response = await api.post(submitUrl, {
        answers: payloadAnswers,
        auto_submitted: autoSubmitted,
        ...practiceSubmitter,
      });

      const resultData = {
        ...response.data,
        total_marks: response.data?.total_marks ?? response.data?.total_questions ?? 0,
        correct_count: response.data?.correct_count ?? response.data?.score ?? 0,
      };

      setResult(resultData);

      if (isPracticeAttempt) {
        await savePublicPracticeResult(quiz, resultData);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          `Failed to submit ${isAssignedTestAttempt ? "test" : isPracticeAttempt ? "skillset" : "quiz"}.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pickSubmissionFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) return;
      setSubmissionFile(picked.assets?.[0] || null);
    } catch (error) {
      Alert.alert("File selection failed", "Unable to select this file. Please try again.");
    }
  };

  const submitUploadedTest = async () => {
    if (!quiz) return;
    if (!submissionFile) {
      Alert.alert("Upload required", "Please choose your answer file before submitting the test.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("submission_file", {
        uri: submissionFile.uri,
        name: submissionFile.name || "answer-file",
        type: submissionFile.mimeType || "application/octet-stream",
      } as any);

      const response = await api.post(`/tests/${quiz.id}/take/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult({
        ...response.data,
        total_marks: response.data?.total_marks ?? response.data?.total_questions ?? 0,
        correct_count: 0,
      });
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to submit test.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    loadQuiz();
  };

  const savePublicPracticeResult = async (quizItem: QuizItem, resultData: QuizResult) => {
    try {
      const practiceSubmitter = await getPracticeSubmitter();
      const username = practiceSubmitter.username || practiceSubmitter.name || "public";
      const storedRaw = await AsyncStorage.getItem(PUBLIC_PRACTICE_RESULTS_KEY);
      const stored = storedRaw ? JSON.parse(storedRaw) : [];
      const list = Array.isArray(stored) ? stored : [];

      list.push({
        username,
        quiz_id: quizItem.id,
        quiz_title: quizItem.title,
        score: resultData.score,
        total_marks: resultData.total_marks,
        percentage: resultData.percentage,
        is_passed: resultData.is_passed,
        correct_count: resultData.correct_count,
        wrong_count: resultData.wrong_count,
        attempted_count: resultData.attempted_count,
        total_questions: resultData.total_questions,
        completed_at: new Date().toISOString(),
      });

      await AsyncStorage.setItem(PUBLIC_PRACTICE_RESULTS_KEY, JSON.stringify(list));
    } catch (error) {
      console.log("PUBLIC PRACTICE RESULT SAVE ERROR:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQuestionOptions = (question: QuizQuestion) => (
    question.options?.length ? question.options : [
      { key: "A", text: question.option_a },
      { key: "B", text: question.option_b },
      { key: "C", text: question.option_c || "" },
      { key: "D", text: question.option_d || "" },
    ].filter((item) => item.text)
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={styles.loaderText}>Loading test...</Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={styles.loaderText}>
          {isAssignedTestAttempt ? "Test" : isPracticeAttempt ? "Skillset" : "Quiz"} not found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{heading}</Text>

      {quiz.description ? (
        <Text style={styles.description}>{quiz.description}</Text>
      ) : null}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {isAssignedTestAttempt ? "Test" : isPracticeAttempt ? "Skillset" : "Quiz"}: {current + 1}/{questions.length || 0}
        </Text>
        {(quiz.duration_minutes || 0) > 0 ? (
          <Text style={[styles.summaryText, timeLeft <= 60 && styles.timerDanger]}>
            Time: {formatTime(timeLeft)}
          </Text>
        ) : (
          <Text style={styles.summaryText}>No Timer</Text>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${questions.length ? ((current + 1) / questions.length) * 100 : 0}%`,
            },
          ]}
        />
      </View>

      {isAssignedTestAttempt && (quiz.creation_method === "upload" || quiz.question_paper_url) && questions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.question}>Question Paper Test</Text>
          {!!quiz.instructions && <Text style={styles.description}>{quiz.instructions}</Text>}
          {!!quiz.question_paper_url && (
            <TouchableOpacity
              style={styles.paperBtn}
              onPress={() => Linking.openURL(quiz.question_paper_url || "").catch(() => Alert.alert("Unable to open", "Could not open the question paper."))}
            >
              <Text style={styles.paperBtnText}>View Test PDF</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.uploadBtn} onPress={pickSubmissionFile}>
            <Text style={styles.uploadBtnText}>
              {submissionFile?.name ? `Selected: ${submissionFile.name}` : "Choose Answer File"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.uploadHint}>For folder submissions, compress the folder as ZIP and upload it here.</Text>
        </View>
      ) : questions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.question}>No questions available for this quiz.</Text>
        </View>
      ) : (() => {
          const q = questions[current];
          const userAnswer = answers[q.id];
          const correctAnswer = String(q.correct_answer || "").toUpperCase();
          const hasAnswerFeedback = !!userAnswer && !!correctAnswer;
          const options = getQuestionOptions(q);

          return (
            <View key={q.id} style={styles.card}>
              <View style={styles.questionTopRow}>
                <Text style={styles.questionCount}>
                  Question {current + 1} of {questions.length}
                </Text>
                {userAnswer ? (
                  <Text
                    style={[
                      styles.answerPill,
                      hasAnswerFeedback && userAnswer === correctAnswer
                        ? styles.answerPillCorrect
                        : hasAnswerFeedback
                          ? styles.answerPillWrong
                          : null,
                    ]}
                  >
                    {hasAnswerFeedback
                      ? userAnswer === correctAnswer
                        ? "Correct"
                        : "Wrong"
                      : "Answered"}
                  </Text>
                ) : (
                  <Text style={styles.pendingPill}>Pending</Text>
                )}
              </View>
              <Text style={styles.question}>
                {q.question_text}
              </Text>

              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.optionBtn,
                    userAnswer === opt.key && styles.selectedOptionBtn,
                    hasAnswerFeedback &&
                      opt.key === correctAnswer &&
                      styles.correctOptionBtn,
                    hasAnswerFeedback &&
                      userAnswer === opt.key &&
                      opt.key !== correctAnswer &&
                      styles.wrongOptionBtn,
                  ]}
                  onPress={() => selectAnswer(q.id, opt.key)}
                  disabled={!!result}
                >
                  <Text
                    style={[
                      styles.optionText,
                      userAnswer === opt.key && styles.selectedOptionText,
                      hasAnswerFeedback &&
                        (opt.key === correctAnswer || userAnswer === opt.key) &&
                        styles.feedbackOptionText,
                    ]}
                  >
                    {opt.key}. {opt.text}
                  </Text>
                </TouchableOpacity>
              ))}

              {hasAnswerFeedback ? (
                <View
                  style={[
                    styles.feedbackBox,
                    userAnswer === correctAnswer
                      ? styles.feedbackBoxCorrect
                      : styles.feedbackBoxWrong,
                  ]}
                >
                  <Text style={styles.feedbackTitle}>
                    {userAnswer === correctAnswer ? "Great! Correct answer." : "Right answer shown above."}
                  </Text>
                  <Text style={styles.feedbackText}>
                    Correct Answer: {correctAnswer}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })()}

      {!result && questions.length > 0 ? (
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, current === 0 && styles.disabledBtn]}
            onPress={() => setCurrent((idx) => Math.max(idx - 1, 0))}
            disabled={current === 0}
          >
            <Text style={styles.navText}>Previous</Text>
          </TouchableOpacity>
          {current < questions.length - 1 ? (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setCurrent((idx) => Math.min(idx + 1, questions.length - 1))}
            >
              <Text style={styles.navText}>Next</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {!result ? (
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting || (questions.length === 0 && !(isAssignedTestAttempt && (quiz.creation_method === "upload" || quiz.question_paper_url)))}
        >
          <Text style={styles.submitText}>
            {submitting ? "Submitting..." : isAssignedTestAttempt || isPracticeAttempt ? "Submit Test" : "Submit Quiz"}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          {isAssignedTestAttempt && (quiz.creation_method === "upload" || quiz.question_paper_url) && questions.length === 0 ? (
            <>
              <Text style={styles.scoreText}>Test Submitted</Text>
              <Text style={styles.resultText}>Your answer file was submitted. Your mentor will update the mark after review.</Text>
            </>
          ) : (
            <>
              <Text style={styles.scoreText}>
                Your Score: {result.score} / {result.total_marks}
              </Text>
              <Text style={styles.resultText}>
                Percentage: {result.percentage}% | {result.is_passed ? "Passed" : "Failed"}
              </Text>
            </>
          )}

          {questions.length > 0 && <View style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>Answer Review</Text>
            <Text style={styles.reviewSubtitle}>
              Check every question with your answer and the correct answer.
            </Text>

            {questions.map((question, index) => {
              const selectedKey = answers[question.id] || "";
              const correctKey = String(question.correct_answer || "").toUpperCase();
              const options = getQuestionOptions(question);
              const selectedOption = options.find((option) => option.key === selectedKey);
              const correctOption = options.find((option) => option.key === correctKey);
              const isCorrect = !!selectedKey && !!correctKey && selectedKey === correctKey;
              const statusStyle = !selectedKey
                ? styles.reviewStatusMissed
                : isCorrect
                  ? styles.reviewStatusCorrect
                  : styles.reviewStatusWrong;
              const statusText = !selectedKey ? "Not Answered" : isCorrect ? "Correct" : "Wrong";

              return (
                <View key={question.id} style={styles.reviewCard}>
                  <View style={styles.reviewTopRow}>
                    <Text style={styles.reviewCount}>Question {index + 1}</Text>
                    <Text style={[styles.reviewStatus, statusStyle]}>{statusText}</Text>
                  </View>
                  <Text style={styles.reviewQuestion}>{question.question_text}</Text>

                  <View style={styles.reviewAnswerBox}>
                    <Text style={styles.reviewLabel}>Your Answer</Text>
                    <Text style={[styles.reviewAnswerText, !selectedKey ? styles.reviewMutedText : isCorrect ? styles.reviewGreenText : styles.reviewRedText]}>
                      {selectedKey && selectedOption
                        ? `${selectedKey}. ${selectedOption.text}`
                        : "Not answered"}
                    </Text>
                  </View>

                  <View style={[styles.reviewAnswerBox, styles.reviewCorrectBox]}>
                    <Text style={styles.reviewLabel}>Correct Answer</Text>
                    <Text style={[styles.reviewAnswerText, styles.reviewGreenText]}>
                      {correctKey && correctOption
                        ? `${correctKey}. ${correctOption.text}`
                        : correctKey || "Correct answer not available"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>}

          {isPracticeAttempt ? (
            <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
              <Text style={styles.restartText}>Retry Test</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.backBtn} onPress={returnToSource}>
              <Text style={styles.backText}>Back to Tests</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F6F3FF",
    flexGrow: 1,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
  },
  loaderText: { marginTop: 12, fontSize: 14, color: "#444" },
  heading: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
    color: "#5523D2",
    letterSpacing: 0,
  },
  description: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  summaryText: { color: "#4C1D95", fontWeight: "800" },
  timerDanger: { color: "#DC2626" },
  progressTrack: {
    height: 9,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#16A34A",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  questionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  questionCount: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  pendingPill: {
    color: "#475467",
    backgroundColor: "#F2F4F7",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  answerPill: {
    color: "#475467",
    backgroundColor: "#F2F4F7",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  answerPillCorrect: {
    color: "#FFFFFF",
    backgroundColor: "#16A34A",
  },
  answerPillWrong: {
    color: "#FFFFFF",
    backgroundColor: "#DC2626",
  },
  question: {
    color: "#101828",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "bold",
    marginBottom: 16,
  },
  optionBtn: {
    padding: 14,
    backgroundColor: "#FBF9FF",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  selectedOptionBtn: {
    backgroundColor: "#6D28D9",
    borderColor: "#6D28D9",
  },
  correctOptionBtn: {
    backgroundColor: "#16A34A",
    borderColor: "#15803D",
  },
  wrongOptionBtn: {
    backgroundColor: "#DC2626",
    borderColor: "#B91C1C",
  },
  optionText: { fontSize: 15, fontWeight: "600" },
  selectedOptionText: { color: "white" },
  feedbackOptionText: { color: "#FFFFFF" },
  feedbackBox: {
    borderRadius: 14,
    padding: 13,
    marginTop: 6,
    borderWidth: 1,
  },
  feedbackBoxCorrect: {
    backgroundColor: "#ECFDF3",
    borderColor: "#22C55E",
  },
  feedbackBoxWrong: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  feedbackTitle: {
    color: "#101828",
    fontSize: 14,
    fontWeight: "900",
  },
  feedbackText: {
    color: "#475467",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  paperBtn: {
    backgroundColor: "#5523D2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  paperBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  uploadBtn: {
    backgroundColor: "#F8F5FF",
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 12,
  },
  uploadBtnText: {
    color: "#4C1D95",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  uploadHint: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  navBtn: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.45 },
  navText: { color: "#FFFFFF", fontWeight: "800" },
  submitBtn: {
    backgroundColor: "#6D28D9",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 20,
  },
  submitText: { color: "white", fontSize: 18, fontWeight: "bold" },
  scoreText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  resultText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    color: "#333",
  },
  reviewSection: {
    marginTop: 22,
    marginBottom: 8,
  },
  reviewTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  reviewSubtitle: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#111827",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  reviewCount: {
    color: "#6D28D9",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  reviewStatus: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  reviewStatusCorrect: {
    backgroundColor: "#16A34A",
  },
  reviewStatusWrong: {
    backgroundColor: "#DC2626",
  },
  reviewStatusMissed: {
    backgroundColor: "#667085",
  },
  reviewQuestion: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "900",
    marginBottom: 12,
  },
  reviewAnswerBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginTop: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewCorrectBox: {
    backgroundColor: "#ECFDF3",
    borderColor: "#BBF7D0",
  },
  reviewLabel: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  reviewAnswerText: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },
  reviewGreenText: {
    color: "#15803D",
  },
  reviewRedText: {
    color: "#B91C1C",
  },
  reviewMutedText: {
    color: "#667085",
  },
  restartBtn: {
    marginTop: 15,
    backgroundColor: "#5523D2",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    width: "60%",
    alignSelf: "center",
  },
  restartText: { color: "white", fontSize: 16, fontWeight: "bold" },
  backBtn: {
    marginTop: 15,
    backgroundColor: "#5523D2",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    width: "60%",
    alignSelf: "center",
  },
  backText: { color: "white", fontSize: 16, fontWeight: "bold" },
});

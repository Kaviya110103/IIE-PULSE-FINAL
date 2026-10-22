import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import api from "@/services/api";

type DeskTab = "course" | "attendance" | "logsheet" | "leave" | "fee";
type LogsheetMode = "report" | "sessions";

const tabs: { key: DeskTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "course", label: "Course", icon: "analytics-outline" },
  { key: "attendance", label: "Attendance", icon: "calendar-number-outline" },
  { key: "logsheet", label: "Logsheet", icon: "reader-outline" },
  { key: "leave", label: "Leave", icon: "calendar-clear-outline" },
  { key: "fee", label: "Fee", icon: "cash-outline" },
];

const money = (value?: number | string | null) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function StudentDeskScreen() {
  const [activeTab, setActiveTab] = useState<DeskTab>("course");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [feeData, setFeeData] = useState<any>({});
  const [openingBill, setOpeningBill] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [logsheetMode, setLogsheetMode] = useState<LogsheetMode>("report");
  const [sessionBusyId, setSessionBusyId] = useState<number | null>(null);
  const [doubtModalVisible, setDoubtModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [doubtText, setDoubtText] = useState("");

  const loadDesk = useCallback(async () => {
    const fetchDeskData = async () => {
      // Fetch this first so an expired token is refreshed before the remaining
      // student-specific requests begin together.
      const dashboardRes = await api.get("dashboard/student/");
      const [attendanceRes, sessionsRes, feeRes] = await Promise.all([
        api.get("attendance/", { params: { student: "me" } }),
        api.get("sessions/student/"),
        api.get("student/fee/"),
      ]);

      return { dashboardRes, attendanceRes, sessionsRes, feeRes };
    };

    try {
      let deskData;
      try {
        deskData = await fetchDeskData();
      } catch {
        // A just-refreshed session or waking production server can briefly
        // reject the first request. Retry once before showing an error.
        await new Promise((resolve) => setTimeout(resolve, 700));
        deskData = await fetchDeskData();
      }

      const { dashboardRes, attendanceRes, sessionsRes, feeRes } = deskData;
      setDashboard(dashboardRes.data || {});
      setAttendance(Array.isArray(attendanceRes.data?.results) ? attendanceRes.data.results : []);
      setSessions(Array.isArray(sessionsRes.data?.results) ? sessionsRes.data.results : Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      setBatchDetails(sessionsRes.data?.batch || null);
      setFeeData(feeRes.data || {});
    } catch (error: any) {
      Alert.alert("Student Desk", error?.response?.data?.error || "Unable to load student desk details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDesk();
  }, [loadDesk]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDesk();
  };

  const present = attendance.filter((item) => item.status === "Present").length;
  const attendancePercent = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const completedSessions = sessions.filter((session) => session.student_status === "completed").length;
  const pendingSessions = Math.max(sessions.length - completedSessions, 0);
  const logsheetPercent = sessions.length ? Math.round((completedSessions / sessions.length) * 100) : 0;
  const fee = feeData?.fee || null;
  const courseName = dashboard?.student?.course || fee?.course_name || "Assigned Course";
  const trainerName =
    batchDetails?.trainer_names?.join(", ") ||
    batchDetails?.faculty_name ||
    fee?.trainer_name ||
    dashboard?.student?.assigned_staff_name ||
    "Trainer not assigned";
  const batchName =
    batchDetails?.batch_code ||
    batchDetails?.batch_number ||
    sessions[0]?.batch_code ||
    sessions[0]?.batch_number ||
    "Batch not assigned";
  const batchTiming = batchDetails?.batch_timing || "Timing not updated";
  const recentAttendance = attendance.slice(0, 12).reverse();

  const graphPoints = useMemo(() => {
    const sessionPoint = logsheetPercent;
    const attendancePoint = attendancePercent;
    const feePoint = fee?.total_fee ? Math.round((Number(fee.amount_paid || 0) / Number(fee.total_fee || 1)) * 100) : 0;
    return [
      { label: "Attendance", value: attendancePoint },
      { label: "Sessions", value: sessionPoint },
      { label: "Fee", value: feePoint },
    ];
  }, [attendancePercent, logsheetPercent, fee]);

  const submitLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
      Alert.alert("Required", "Please fill all leave fields.");
      return;
    }
    try {
      setSubmittingLeave(true);
      await api.post("student-leave/", leaveForm);
      Alert.alert("Success", "Leave application submitted.");
      setLeaveForm({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to submit leave.");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const openFeeBill = async () => {
    if (!fee?.id || openingBill) return;
    try {
      setOpeningBill(true);
      const response = await api.get(`/fees/${fee.id}/bill-link/`);
      const billUrl = response.data?.url;
      if (!billUrl) {
        Alert.alert("Bill PDF", "Bill PDF link is not available.");
        return;
      }
      await Linking.openURL(billUrl);
    } catch (error: any) {
      Alert.alert(
        "Bill PDF",
        error?.response?.data?.error || "Bill PDF is available only after admin approval."
      );
    } finally {
      setOpeningBill(false);
    }
  };

  const completeSession = async (session: any) => {
    if (!session?.id) return;
    if (!session.staff_completed && session.student_status === "not_started") {
      Alert.alert("Not Available Yet", "Trainer has not completed this session yet.");
      return;
    }

    try {
      setSessionBusyId(session.id);
      await api.post("sessions/student-complete/", { session_id: session.id });
      await loadDesk();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Could not mark session completed."
      );
    } finally {
      setSessionBusyId(null);
    }
  };

  const openDoubtModal = (session: any) => {
    setSelectedSession(session);
    setDoubtText("");
    setDoubtModalVisible(true);
  };

  const submitDoubt = async () => {
    if (!selectedSession) return;
    const trimmed = doubtText.trim();
    if (!trimmed) {
      Alert.alert("Required", "Please enter your doubt before sending.");
      return;
    }

    try {
      setSessionBusyId(selectedSession.id);
      await api.post("sessions/raise-doubt/", {
        session_id: selectedSession.id,
        doubt_text: trimmed,
      });
      setDoubtModalVisible(false);
      setSelectedSession(null);
      setDoubtText("");
      await loadDesk();
      Alert.alert("Doubt Submitted", "Your doubt has been sent to the faculty.");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Could not send doubt."
      );
    } finally {
      setSessionBusyId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" color="#6D28D9" />
        <Text style={styles.loadingText}>Loading student desk...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor="#F6F3FF" barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="desktop-outline" size={30} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroKicker}>Student Desk</Text>
            <Text style={styles.heroTitle}>{courseName}</Text>
            <Text style={styles.heroSub}>One place for progress, attendance, logsheet, leave and fee.</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
                <Ionicons name={tab.icon} size={16} color={active ? "#FFFFFF" : "#A78BFA"} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === "course" ? (
          <Panel title="Course Details" icon="analytics-outline">
            <Text style={styles.sectionText}>Course progress overview for {courseName}</Text>
            <View style={styles.detailGrid}>
              <DetailPill icon="albums-outline" label="Batch" value={batchName} />
              <DetailPill icon="person-outline" label="Trainer" value={trainerName} />
              <DetailPill icon="time-outline" label="Timing" value={batchTiming} />
              <DetailPill icon="location-outline" label="Branch" value={batchDetails?.branch || fee?.branch || dashboard?.student?.branch || "Branch"} />
            </View>
            <View style={styles.lineGraph}>
              {graphPoints.map((point) => (
                <View key={point.label} style={styles.graphItem}>
                  <View style={styles.graphBarTrack}>
                    <View style={[styles.graphBarFill, { height: `${Math.max(point.value, 6)}%` }]} />
                  </View>
                  <Text style={styles.graphValue}>{point.value}%</Text>
                  <Text style={styles.graphLabel}>{point.label}</Text>
                </View>
              ))}
            </View>
          </Panel>
        ) : null}

        {activeTab === "attendance" ? (
          <Panel title="Attendance" icon="calendar-number-outline">
            <StatRow items={[["Total", attendance.length], ["Present", present], ["Absent", attendance.length - present], ["Rate", `${attendancePercent}%`]]} />
            <View style={styles.attendanceChart}>
              <View style={styles.attendanceChartHeader}>
                <Text style={styles.attendanceChartTitle}>Attendance Trend</Text>
                <Text style={styles.attendanceChartMeta}>{attendancePercent}% present</Text>
              </View>
              <View style={styles.attendanceBars}>
                {(recentAttendance.length ? recentAttendance : [{ id: "empty", status: "Absent", date: "" }]).map((item, index) => {
                  const isPresent = item.status === "Present";
                  return (
                    <View key={String(item.id || `${item.date}-${index}`)} style={styles.attendanceBarItem}>
                      <View style={styles.attendanceBarTrack}>
                        <View style={[styles.attendanceBarFill, { height: isPresent ? "92%" : "34%", backgroundColor: isPresent ? "#8B5CF6" : "#FB7185" }]} />
                      </View>
                      <Text style={styles.attendanceBarLabel}>{item.date ? String(item.date).slice(5) : "--"}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            {attendance.slice(0, 20).map((item) => (
              <InfoRow key={String(item.id)} left={item.date} middle={item.batch_code || item.batch_number || "Batch"} right={item.status} good={item.status === "Present"} />
            ))}
          </Panel>
        ) : null}

        {activeTab === "logsheet" ? (
          <Panel title="Logsheet" icon="reader-outline">
            <View style={styles.subTabRow}>
              {(["report", "sessions"] as LogsheetMode[]).map((mode) => {
                const active = logsheetMode === mode;
                return (
                  <Pressable key={mode} style={[styles.subTab, active && styles.subTabActive]} onPress={() => setLogsheetMode(mode)}>
                    <Text style={[styles.subTabText, active && styles.subTabTextActive]}>{mode === "report" ? "Report" : "Sessions"}</Text>
                  </Pressable>
                );
              })}
            </View>

            {logsheetMode === "report" ? (
              <>
                <StatRow items={[["Completed", completedSessions], ["Pending", pendingSessions], ["Progress", `${logsheetPercent}%`]]} />
                <ProgressBar value={logsheetPercent} />
                {sessions.map((session) => (
                  <InfoRow key={String(session.id)} left={`Session ${session.session_number}`} middle={session.title || "Session"} right={session.student_status || "pending"} good={session.student_status === "completed"} />
                ))}
              </>
            ) : (
              <>
                {sessions.length === 0 ? (
                  <Text style={styles.sectionText}>No sessions found.</Text>
                ) : (
                  sessions.map((session) => (
                    <SessionDeskCard
                      key={String(session.id)}
                      session={session}
                      busy={sessionBusyId === session.id}
                      onComplete={() => completeSession(session)}
                      onDoubt={() => openDoubtModal(session)}
                    />
                  ))
                )}
              </>
            )}
          </Panel>
        ) : null}

        {activeTab === "leave" ? (
          <Panel title="Apply Leave" icon="calendar-clear-outline">
            <TextInput style={styles.input} value={leaveForm.leave_type} onChangeText={(leave_type) => setLeaveForm((prev) => ({ ...prev, leave_type }))} placeholder="Leave type" placeholderTextColor="#8E88A8" />
            <TextInput style={styles.input} value={leaveForm.start_date} onChangeText={(start_date) => setLeaveForm((prev) => ({ ...prev, start_date }))} placeholder="Start date YYYY-MM-DD" placeholderTextColor="#8E88A8" />
            <TextInput style={styles.input} value={leaveForm.end_date} onChangeText={(end_date) => setLeaveForm((prev) => ({ ...prev, end_date }))} placeholder="End date YYYY-MM-DD" placeholderTextColor="#8E88A8" />
            <TextInput style={[styles.input, styles.textArea]} multiline value={leaveForm.reason} onChangeText={(reason) => setLeaveForm((prev) => ({ ...prev, reason }))} placeholder="Reason" placeholderTextColor="#8E88A8" />
            <Pressable style={styles.primaryButton} onPress={submitLeave} disabled={submittingLeave}>
              <Text style={styles.primaryButtonText}>{submittingLeave ? "Submitting..." : "Submit Leave"}</Text>
            </Pressable>
          </Panel>
        ) : null}

        {activeTab === "fee" ? (
          <Panel title="Fee Details" icon="cash-outline">
            {!fee ? (
              <Text style={styles.sectionText}>No fee details found.</Text>
            ) : (
              <>
                <StatRow items={[["Total", money(fee.total_fee)], ["Paid", money(fee.amount_paid)], ["Balance", money(fee.balance)]]} />
                <InfoRow left="Course" middle={fee.course_name || "Course"} right={fee.is_fully_paid ? "Paid" : "Pending"} good={fee.is_fully_paid} />
                <InfoRow left="Trainer" middle={fee.trainer_name || "Trainer"} right={fee.branch || "Branch"} />
                {fee.bill_available ? (
                  <Pressable style={[styles.billButton, openingBill && styles.billButtonDisabled]} onPress={openFeeBill} disabled={openingBill}>
                    <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.billButtonText}>{openingBill ? "Opening..." : "View Bill PDF"}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.billPendingBox}>
                    <Ionicons name="time-outline" size={18} color="#C4B5FD" />
                    <Text style={styles.billPendingText}>Bill PDF will appear after admin approval.</Text>
                  </View>
                )}
              </>
            )}
          </Panel>
        ) : null}
      </ScrollView>

      <Modal visible={doubtModalVisible} transparent animationType="fade" onRequestClose={() => setDoubtModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Your Doubt</Text>
            <Text style={styles.modalSubtitle}>
              {selectedSession ? `Session ${selectedSession.session_number}: ${selectedSession.title || "Session"}` : ""}
            </Text>
            <TextInput
              style={[styles.input, styles.doubtInput]}
              placeholder="Type your doubt here..."
              placeholderTextColor="#8E88A8"
              multiline
              value={doubtText}
              onChangeText={setDoubtText}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setDoubtModalVisible(false);
                  setSelectedSession(null);
                  setDoubtText("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSendButton} onPress={submitDoubt} disabled={!!sessionBusyId}>
                <Text style={styles.modalSendText}>{sessionBusyId ? "Sending..." : "Send Doubt"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Panel({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={styles.panelIcon}><Ionicons name={icon} size={20} color="#FFFFFF" /></View>
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatRow({ items }: { items: [string, string | number][] }) {
  return (
    <View style={styles.statGrid}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.statCard}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function InfoRow({ left, middle, right, good }: { left: string; middle: string; right: string; good?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLeft}>{left}</Text>
        <Text style={styles.infoMiddle} numberOfLines={1}>{middle}</Text>
      </View>
      <Text style={[styles.infoRight, good != null && (good ? styles.good : styles.bad)]}>{right}</Text>
    </View>
  );
}

function DetailPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailPill}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={17} color="#C4B5FD" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function SessionDeskCard({ session, busy, onComplete, onDoubt }: { session: any; busy: boolean; onComplete: () => void; onDoubt: () => void }) {
  const isCompleted = session.student_status === "completed";
  const isLocked = !session.staff_completed && session.student_status === "not_started";
  const statusText = isCompleted ? "Completed" : isLocked ? "Locked" : session.student_status === "doubt" ? "Doubt Sent" : "Ready";

  return (
    <View style={[styles.sessionCard, isCompleted && styles.sessionCardDone]}>
      <View style={styles.sessionTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.sessionLabel}>Session {session.session_number}</Text>
          <Text style={styles.sessionTitle}>{session.title?.trim() || `Session ${session.session_number}`}</Text>
        </View>
      </View>

      <View style={[styles.sessionStatus, isCompleted ? styles.sessionStatusDone : isLocked ? styles.sessionStatusLocked : styles.sessionStatusReady]}>
        <Text style={styles.sessionStatusText}>{statusText}</Text>
      </View>

      <View style={styles.topicBox}>
        <Text style={styles.topicLabel}>Topics Covered</Text>
        <Text style={styles.sessionTopics}>{session.topics?.trim() || "Course content will be covered"}</Text>
      </View>

      {session.has_response && !!session.doubt_response ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseTitle}>Faculty Response</Text>
          <Text style={styles.responseText}>{session.doubt_response}</Text>
        </View>
      ) : null}

      {session.student_status === "doubt" && !session.has_response ? (
        <View style={styles.pendingResponseBox}>
          <Text style={styles.responseTitle}>Faculty Response</Text>
          <Text style={styles.pendingResponseText}>Pending faculty response...</Text>
        </View>
      ) : null}

      <View style={styles.sessionActionRow}>
        <Pressable
          style={[styles.sessionButton, (isCompleted || isLocked || busy) && styles.sessionButtonDisabled]}
          onPress={onComplete}
          disabled={isCompleted || isLocked || busy}
        >
          <Ionicons name={isCompleted ? "checkmark-circle" : isLocked ? "lock-closed" : "checkmark-done"} size={18} color="#FFFFFF" />
          <Text style={styles.sessionButtonText}>
            {busy ? "Updating..." : isCompleted ? "Completed" : isLocked ? "Trainer Pending" : "Mark Completed"}
          </Text>
        </Pressable>

        <Pressable style={[styles.doubtButton, busy && styles.sessionButtonDisabled]} onPress={onDoubt} disabled={busy}>
          <Ionicons name="help-circle-outline" size={18} color="#2E1065" />
          <Text style={styles.doubtButtonText}>{session.student_status === "doubt" ? "Still Doubt" : "I Have Doubt"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(value, 100))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F3FF" },
  content: { padding: 18, paddingBottom: 38 },
  loadingText: { color: "#475467", textAlign: "center", marginTop: 12, fontWeight: "800" },
  hero: { flexDirection: "row", gap: 14, padding: 18, borderRadius: 26, backgroundColor: "#5B21B6", marginBottom: 16 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  heroKicker: { color: "#DDD6FE", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  heroTitle: { color: "#FFFFFF", fontSize: 23, fontWeight: "900", marginTop: 2 },
  heroSub: { color: "#EDE9FE", fontSize: 12, lineHeight: 18, marginTop: 4 },
  tabRow: { gap: 9, paddingBottom: 14 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDD6FE" },
  tabActive: { backgroundColor: "#6D28D9", borderColor: "#A78BFA" },
  tabText: { color: "#5B21B6", fontWeight: "900", fontSize: 12 },
  tabTextActive: { color: "#FFFFFF" },
  panel: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E9D5FF", padding: 16 },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  panelIcon: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#6D28D9" },
  panelTitle: { color: "#1F1335", fontSize: 19, fontWeight: "900" },
  sectionText: { color: "#667085", lineHeight: 21, marginBottom: 12 },
  detailGrid: { gap: 10, marginBottom: 16 },
  detailPill: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E9D5FF" },
  detailIcon: { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#EDE9FE" },
  detailLabel: { color: "#667085", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  detailValue: { color: "#1F1335", fontSize: 14, fontWeight: "900", marginTop: 2, lineHeight: 19 },
  subTabRow: { flexDirection: "row", gap: 8, padding: 4, borderRadius: 16, backgroundColor: "#F5F3FF", marginBottom: 14 },
  subTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 13 },
  subTabActive: { backgroundColor: "#6D28D9" },
  subTabText: { color: "#667085", fontWeight: "900" },
  subTabTextActive: { color: "#FFFFFF" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: { flexGrow: 1, minWidth: "29%", padding: 12, borderRadius: 16, backgroundColor: "#F5F3FF" },
  statValue: { color: "#1F1335", fontSize: 17, fontWeight: "900" },
  statLabel: { color: "#667085", fontSize: 11, fontWeight: "800", marginTop: 3 },
  attendanceChart: { padding: 12, borderRadius: 18, backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E9D5FF", marginBottom: 14 },
  attendanceChartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 },
  attendanceChartTitle: { color: "#1F1335", fontWeight: "900" },
  attendanceChartMeta: { color: "#6D28D9", fontSize: 12, fontWeight: "900" },
  attendanceBars: { height: 112, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6 },
  attendanceBarItem: { flex: 1, alignItems: "center", gap: 6 },
  attendanceBarTrack: { width: "100%", height: 82, maxWidth: 18, borderRadius: 999, backgroundColor: "#E9D5FF", justifyContent: "flex-end", overflow: "hidden" },
  attendanceBarFill: { width: "100%", borderRadius: 999 },
  attendanceBarLabel: { color: "#667085", fontSize: 9, fontWeight: "800" },
  lineGraph: { height: 220, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingVertical: 12 },
  graphItem: { alignItems: "center", width: 86 },
  graphBarTrack: { width: 28, height: 130, borderRadius: 18, backgroundColor: "#E9D5FF", justifyContent: "flex-end", overflow: "hidden" },
  graphBarFill: { width: "100%", borderRadius: 18, backgroundColor: "#A78BFA" },
  graphValue: { color: "#1F1335", fontWeight: "900", marginTop: 8 },
  graphLabel: { color: "#667085", fontSize: 11, fontWeight: "800", marginTop: 2 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E9D5FF" },
  infoLeft: { color: "#1F1335", fontWeight: "900" },
  infoMiddle: { color: "#667085", marginTop: 3, fontSize: 12 },
  infoRight: { color: "#5B21B6", fontWeight: "900", maxWidth: 120, textAlign: "right" },
  good: { color: "#86EFAC" },
  bad: { color: "#FDA4AF" },
  progressTrack: { height: 10, borderRadius: 999, overflow: "hidden", backgroundColor: "#E9D5FF", marginBottom: 14 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#8B5CF6" },
  sessionCard: { padding: 14, borderRadius: 18, backgroundColor: "#F8F5FF", borderWidth: 1, borderColor: "#E9D5FF", marginBottom: 12 },
  sessionCardDone: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  sessionTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sessionLabel: { color: "#A78BFA", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  sessionTitle: { color: "#1F1335", fontSize: 16, fontWeight: "900", marginTop: 3, lineHeight: 22 },
  topicBox: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, marginTop: 12, marginBottom: 12 },
  topicLabel: { color: "#A78BFA", fontSize: 11, fontWeight: "900", textTransform: "uppercase", marginBottom: 6 },
  sessionTopics: { color: "#475467", lineHeight: 21, fontSize: 13, fontWeight: "700" },
  sessionStatus: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10 },
  sessionStatusDone: { backgroundColor: "#166534" },
  sessionStatusLocked: { backgroundColor: "#4C1D1D" },
  sessionStatusReady: { backgroundColor: "#4C1D95" },
  sessionStatusText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  responseBox: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC", borderRadius: 14, padding: 12, marginBottom: 12 },
  pendingResponseBox: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FCD34D", borderRadius: 14, padding: 12, marginBottom: 12 },
  responseTitle: { color: "#166534", fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 5 },
  responseText: { color: "#166534", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  pendingResponseText: { color: "#92400E", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  sessionActionRow: { flexDirection: "row", gap: 10 },
  sessionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#6D28D9", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8 },
  sessionButtonDisabled: { opacity: 0.62 },
  sessionButtonText: { color: "#FFFFFF", fontWeight: "900" },
  doubtButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EDE9FE", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8 },
  doubtButtonText: { color: "#2E1065", fontWeight: "900" },
  input: { color: "#1F1335", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, fontWeight: "700" },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  primaryButton: { backgroundColor: "#6D28D9", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
  billButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#16A34A", borderRadius: 16, paddingVertical: 14, marginTop: 14 },
  billButtonDisabled: { opacity: 0.65 },
  billButtonText: { color: "#FFFFFF", fontWeight: "900" },
  billPendingBox: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 16, padding: 13, marginTop: 14 },
  billPendingText: { color: "#5B21B6", fontWeight: "800", flex: 1, lineHeight: 19 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E9D5FF", padding: 18 },
  modalTitle: { color: "#1F1335", fontSize: 21, fontWeight: "900" },
  modalSubtitle: { color: "#667085", fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  doubtInput: { minHeight: 120, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelButton: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "#DDD6FE", alignItems: "center", paddingVertical: 13 },
  modalCancelText: { color: "#5B21B6", fontWeight: "900" },
  modalSendButton: { flex: 1, borderRadius: 14, backgroundColor: "#6D28D9", alignItems: "center", paddingVertical: 13 },
  modalSendText: { color: "#FFFFFF", fontWeight: "900" },
});

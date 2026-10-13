import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import api from "@/services/api";

type FeeRecord = {
  id: number;
  student_name?: string;
  branch?: string;
  trainer_name?: string;
  total_fee: number;
  amount_paid: number;
  balance: number;
  is_fully_paid: boolean;
  bill_available?: boolean;
  batch_number?: string;
  batch_code?: string;
  display_name?: string;
  course_name?: string;
};

type FeeTransaction = {
  id: number;
  amount: number;
  payment_mode?: string;
  notes?: string;
  paid_at?: string;
  bill_generated?: boolean;
};

type FeeResponse = {
  fee?: FeeRecord | null;
  transactions?: FeeTransaction[];
};

const money = (value?: number | string | null) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function FeeStatusScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingBill, setOpeningBill] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<FeeResponse>({});

  const loadFeeStatus = useCallback(async () => {
    try {
      setErrorMsg("");
      const response = await api.get("/student/fee/");
      setData(response.data || {});
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Failed to load fee status."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeeStatus();
  }, [loadFeeStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeeStatus();
  };

  const fee = data.fee || null;

  const openBillPdf = async () => {
    if (!fee?.id || openingBill) return;
    try {
      setOpeningBill(true);
      const response = await api.get(`/fees/${fee.id}/bill-link/`);
      const billUrl = response.data?.url;
      if (!billUrl) {
        Alert.alert("Bill not available", "Please try again later.");
        return;
      }
      await Linking.openURL(billUrl);
    } catch (error: any) {
      Alert.alert(
        "Bill not available",
        error?.response?.data?.error || "Bill PDF will appear after admin approval."
      );
    } finally {
      setOpeningBill(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F6F3FF" barStyle="dark-content" />
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color="#5523D2" />
          <Text style={styles.helperText}>Loading fee status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F6F3FF" barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="cash-outline" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>Student Fee</Text>
            <Text style={styles.heroTitle}>Fee Status</Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.alertCard}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.alertText}>{errorMsg}</Text>
          </View>
        ) : null}

        {!fee ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={44} color="#A78BFA" />
            <Text style={styles.emptyTitle}>No fee record found</Text>
            <Text style={styles.emptyText}>Please contact your counselor.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <FeeStatCard
                icon="wallet-outline"
                label="Total"
                value={money(fee.total_fee)}
                cardStyle={styles.totalCard}
                iconColor="#F97316"
              />
              <FeeStatCard
                icon="checkmark-circle-outline"
                label="Paid"
                value={money(fee.amount_paid)}
                cardStyle={styles.paidCard}
                iconColor="#059669"
              />
              <FeeStatCard
                icon="time-outline"
                label="Balance"
                value={money(fee.balance)}
                cardStyle={styles.dueCard}
                iconColor="#DC2626"
                danger={Number(fee.balance || 0) > 0}
              />
            </View>

            <View style={styles.simpleCard}>
              <View style={styles.detailGrid}>
                <DetailCard
                  icon="person-outline"
                  label="Student Name"
                  value={fee.student_name || "—"}
                  accent="#7C3AED"
                  bg="#F5F3FF"
                />
                <DetailCard
                  icon="book-outline"
                  label="Course"
                  value={fee.course_name || "—"}
                  accent="#2563EB"
                  bg="#EFF6FF"
                />
                <DetailCard
                  icon="business-outline"
                  label="Branch"
                  value={fee.branch || "—"}
                  accent="#D97706"
                  bg="#FFFBEB"
                />
                <DetailCard
                  icon="school-outline"
                  label="Trainer Name"
                  value={fee.trainer_name || "—"}
                  accent="#059669"
                  bg="#ECFDF5"
                />
              </View>

              {fee.bill_available ? (
                <Pressable
                  style={[styles.billButton, openingBill && styles.billButtonDisabled]}
                  onPress={openBillPdf}
                  disabled={openingBill}
                >
                  {openingBill ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="document-text-outline" size={19} color="#FFFFFF" />
                  )}
                  <Text style={styles.billButtonText}>
                    {openingBill ? "Opening Bill..." : "View Bill PDF"}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.waitingBox}>
                  <Ionicons name="lock-closed-outline" size={18} color="#B45309" />
                  <Text style={styles.waitingText}>Bill PDF will appear after admin approval.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailCard({
  icon,
  label,
  value,
  accent,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  bg: string;
}) {
  return (
    <View style={styles.detailCard}>
      <View style={[styles.detailIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[styles.detailCardLabel, { color: accent }]}>{label}</Text>
        <Text style={styles.detailCardValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function FeeStatCard({
  icon,
  label,
  value,
  cardStyle,
  iconColor,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  cardStyle: object;
  iconColor: string;
  danger?: boolean;
}) {
  return (
    <View style={[styles.statCard, cardStyle]}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={[styles.statValue, danger && styles.dueValue]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Detail({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, danger && styles.detailDanger]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  content: {
    padding: 16,
    paddingTop: 46,
    paddingBottom: 42,
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
    color: "#667085",
    fontWeight: "700",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 28,
    marginBottom: 16,
    backgroundColor: "#5523D2",
    shadowColor: "#5523D2",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    marginLeft: 13,
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
    fontWeight: "900",
    marginTop: 1,
  },
  heroSubtitle: {
    color: "#EDE9FE",
    fontSize: 12,
    marginTop: 2,
  },
  alertCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 14,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  alertText: {
    flex: 1,
    color: "#991B1B",
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    padding: 30,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  emptyTitle: {
    marginTop: 12,
    color: "#1F1335",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 5,
    color: "#667085",
    fontSize: 13,
  },
  simpleCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailCard: {
    width: "48%",
    minHeight: 118,
    padding: 13,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  detailCopy: {
    flex: 1,
  },
  detailCardLabel: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  detailCardValue: {
    marginTop: 5,
    color: "#1F1335",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  infoValue: {
    marginTop: 3,
    color: "#1F1335",
    fontSize: 15,
    fontWeight: "800",
  },
  infoStrong: {
    fontSize: 16,
    fontWeight: "900",
  },
  infoSuccess: {
    color: "#047857",
  },
  infoDanger: {
    color: "#DC2626",
  },
  billButton: {
    minHeight: 52,
    marginTop: 18,
    borderRadius: 17,
    backgroundColor: "#5523D2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  billButtonDisabled: {
    opacity: 0.75,
  },
  billButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  waitingBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  waitingText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minHeight: 104,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
  },
  totalCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  paidCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },
  dueCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statValue: {
    marginTop: 8,
    color: "#1F1335",
    fontSize: 16,
    fontWeight: "900",
  },
  dueValue: {
    color: "#DC2626",
  },
  statLabel: {
    marginTop: 3,
    color: "#667085",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summaryCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  sectionKicker: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  courseTitle: {
    marginTop: 3,
    color: "#1F1335",
    fontSize: 19,
    fontWeight: "900",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  successPill: {
    backgroundColor: "#D1FAE5",
  },
  pendingPill: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  successText: {
    color: "#047857",
  },
  pendingText: {
    color: "#B45309",
  },
  progressBlock: {
    marginTop: 18,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    color: "#344054",
    fontSize: 12,
    fontWeight: "800",
  },
  progressValue: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#10B981",
  },
  detailItem: {
    width: "48%",
    minHeight: 70,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F8F7FF",
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  detailLabel: {
    color: "#7C3AED",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 6,
    color: "#1F1335",
    fontSize: 13,
    fontWeight: "900",
  },
  detailDanger: {
    color: "#DC2626",
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  infoText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  historyCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  historyTitle: {
    marginTop: 3,
    color: "#1F1335",
    fontSize: 19,
    fontWeight: "900",
  },
  countPill: {
    minWidth: 38,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F5F3FF",
  },
  countText: {
    color: "#5523D2",
    fontWeight: "900",
  },
  noHistory: {
    alignItems: "center",
    paddingVertical: 28,
  },
  noHistoryText: {
    marginTop: 9,
    color: "#667085",
    fontWeight: "700",
  },
  transactionRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  transactionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
  },
  transactionBody: {
    flex: 1,
  },
  transactionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  transactionAmount: {
    color: "#047857",
    fontSize: 15,
    fontWeight: "900",
  },
  transactionDate: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "700",
  },
  transactionMeta: {
    marginTop: 4,
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "900",
  },
  transactionNotes: {
    marginTop: 3,
    color: "#667085",
    fontSize: 12,
  },
});

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

export default function MaterialViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    uri?: string;
    returnTo?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [authToken, setAuthToken] = useState("");
  const [authReady, setAuthReady] = useState(false);

  const title = Array.isArray(params.title)
    ? params.title[0]
    : params.title || "Material";
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri || "";
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo || "";

  useEffect(() => {
    AsyncStorage.getItem("access_token").then((token) => {
      setAuthToken(token || "");
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authReady || !loading || failed) return;
    const timer = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timer);
  }, [authReady, failed, loading, retryKey]);

  const goBack = () => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.replace("/materials" as any);
  };

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setRetryKey((value) => value + 1);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={styles.kicker}>Internal Reader</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {!authReady || loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#5523D2" size="large" />
          <Text style={styles.loadingText}>Opening inside app...</Text>
        </View>
      ) : null}

      {failed || !uri ? (
        <View style={styles.errorPanel}>
          <Ionicons name="document-text-outline" size={52} color="#5523D2" />
          <Text style={styles.errorTitle}>Unable to preview this material</Text>
          <Text style={styles.errorText}>
            This file could not be opened right now. Check the connection and try again.
          </Text>
          {uri ? (
            <TouchableOpacity style={styles.retryButton} onPress={retry}>
              <Ionicons name="refresh" size={19} color="#FFFFFF" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : authReady ? (
        <WebView
          key={retryKey}
          source={{
            uri,
            headers: authToken
              ? { Authorization: `Bearer ${authToken}` }
              : undefined,
          }}
          style={styles.webView}
          originWhitelist={["http://*", "https://*"]}
          setSupportMultipleWindows={false}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onLoadProgress={({ nativeEvent }) => {
            if (nativeEvent.progress >= 0.8) setLoading(false);
          }}
          onNavigationStateChange={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
          onHttpError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F7FF" },
  header: {
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#5523D2",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { flex: 1 },
  kicker: {
    color: "#DDD6FE",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginTop: 2 },
  webView: { flex: 1, backgroundColor: "#F8F7FF" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 104,
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F7FF",
  },
  loadingText: { marginTop: 10, color: "#5B526E", fontWeight: "800" },
  errorPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: { color: "#21183A", fontSize: 18, fontWeight: "900", marginTop: 14 },
  errorText: {
    color: "#5B526E",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    minWidth: 120,
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#5523D2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});

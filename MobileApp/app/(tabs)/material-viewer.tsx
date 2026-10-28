import api, { getWithApiFallback } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

function apiEndpointFromUrl(url: string) {
  const marker = "/api/";
  const markerIndex = url.indexOf(marker);
  return markerIndex >= 0 ? url.slice(markerIndex + marker.length) : url;
}

export default function MaterialViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    uri?: string;
    fileType?: string;
    returnTo?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [failureMessage, setFailureMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [previewHtml, setPreviewHtml] = useState("");

  const title = Array.isArray(params.title)
    ? params.title[0]
    : params.title || "Material";
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri || "";
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo || "";
  const fileType = Array.isArray(params.fileType)
    ? params.fileType[0]
    : params.fileType || "document";

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      if (!uri) {
        setFailed(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFailed(false);
      setFailureMessage("");
      setPreviewHtml("");
      try {
        const endpoint = apiEndpointFromUrl(uri);
        let response;

        try {
          // Use the shared client first so an expired student token is
          // refreshed before opening a protected material preview.
          response = await api.get(endpoint, {
            headers: { Accept: fileType === "text" ? "text/plain" : "text/html" },
            responseType: "text",
            timeout: 45000,
          });
        } catch {
          // Cached material rows can retain an old API origin. Retry through
          // the current candidate API origins before treating it as unreadable.
          response = await getWithApiFallback(endpoint, {
            headers: { Accept: fileType === "text" ? "text/plain" : "text/html" },
            responseType: "text",
            timeout: 45000,
          });
        }
        if (!active) return;
        const content = typeof response.data === "string" ? response.data : "";
        if (!content.trim()) throw new Error("Empty material preview");
        setPreviewHtml(content);
      } catch (error: any) {
        if (active) {
          const status = error?.response?.status;
          const message = error?.response?.data?.error || error?.response?.data?.detail;
          setFailureMessage(
            message ||
              (status === 404
                ? "This material file is not available on the server. Please ask your trainer to upload it again."
                : "This material could not be opened right now. Please check the connection and retry.")
          );
          setFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPreview();
    return () => {
      active = false;
    };
  }, [retryKey, uri]);

  const goBack = () => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.replace("/materials" as any);
  };

  const retry = () => setRetryKey((value) => value + 1);

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

      {loading ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color="#5523D2" size="large" />
          <Text style={styles.loadingText}>Opening inside app...</Text>
        </View>
      ) : failed ? (
        <View style={styles.errorPanel}>
          <Ionicons name="document-text-outline" size={52} color="#5523D2" />
          <Text style={styles.errorTitle}>Unable to preview this material</Text>
          <Text style={styles.errorText}>{failureMessage || "This file is unavailable or could not be read. Please try again."}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Ionicons name="refresh" size={19} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : fileType === "text" ? (
        <ScrollView style={styles.codeScroll} contentContainerStyle={styles.codeContent} horizontal>
          <Text selectable style={styles.codeText}>{previewHtml}</Text>
        </ScrollView>
      ) : (
        <WebView
          source={{ html: previewHtml }}
          style={styles.webView}
          originWhitelist={["*"]}
          setSupportMultipleWindows={false}
          javaScriptEnabled={false}
          // The document is already fetched by Axios with the student's
          // authorization. Android can still emit a transient WebView error
          // while decoding large inline images, so do not replace usable HTML
          // with the generic error state after it has been loaded.
          onError={() => {
            if (!previewHtml.trim()) {
              setFailed(true);
            }
          }}
        />
      )}
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
  codeScroll: { flex: 1, backgroundColor: "#171426" },
  codeContent: { padding: 16, minWidth: "100%" },
  codeText: { color: "#F8F7FF", fontFamily: "monospace", fontSize: 13, lineHeight: 21 },
  loadingPanel: {
    flex: 1,
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
    backgroundColor: "#F8F7FF",
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

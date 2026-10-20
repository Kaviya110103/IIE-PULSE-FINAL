import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const PDF_CACHE_DIR = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ""}iie-pulse-pdf-cache/`;

function safeFileName(value: string) {
  return (value || "material")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

async function ensureDirectory(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

export default function MaterialViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; uri?: string; localUri?: string; fileType?: string; returnTo?: string }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [readerUri, setReaderUri] = useState("");
  const Pdf = useMemo(() => {
    try {
      // Keep the native PDF module out of the login/startup bundle. Expo Go does
      // not include it, while the dev/production native builds do.
      return require("react-native-pdf").default;
    } catch {
      return null;
    }
  }, []);
  const title = Array.isArray(params.title) ? params.title[0] : params.title || "Material";
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri || "";
  const localUri = Array.isArray(params.localUri) ? params.localUri[0] : params.localUri || "";
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo || "";
  const fileType = Array.isArray(params.fileType) ? params.fileType[0] : params.fileType || "pdf";

  const goBack = () => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.replace("/materials" as any);
  };

  useEffect(() => {
    AsyncStorage.getItem("access_token").then((token) => {
      setAuthToken(token || "");
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    let alive = true;

    const preparePdf = async () => {
      if (!authReady) return;
      if (fileType !== "pdf") {
        setLoading(false);
        return;
      }
      const sourceUri = localUri || uri;
      if (!sourceUri) {
        setFailed(true);
        setLoading(false);
        return;
      }

      setFailed(false);
      setLoading(true);

      if (localUri || sourceUri.startsWith("file://")) {
        setReaderUri(sourceUri);
        return;
      }

      try {
        await ensureDirectory(PDF_CACHE_DIR);
        const token = authToken || (await AsyncStorage.getItem("access_token")) || "";
        const nameFromUrl = decodeURIComponent(sourceUri.split("?")[0]?.split("/").pop() || "");
        const localFileName = `${safeFileName(title || nameFromUrl || "material")}-${hashString(sourceUri)}.pdf`;
        const cachedUri = `${PDF_CACHE_DIR}${localFileName}`;
        const existing = await FileSystem.getInfoAsync(cachedUri);

        if (!alive) return;
        if (existing.exists) {
          setReaderUri(cachedUri);
          return;
        }

        const result = await FileSystem.downloadAsync(sourceUri, cachedUri, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!alive) return;
        if (result.status < 200 || result.status >= 300) {
          await FileSystem.deleteAsync(cachedUri, { idempotent: true });
          throw new Error(`PDF request failed with status ${result.status}`);
        }

        setReaderUri(result.uri);
      } catch {
        if (alive) {
          setFailed(true);
          setLoading(false);
        }
      }
    };

    preparePdf();

    return () => {
      alive = false;
    };
  }, [authReady, authToken, fileType, localUri, title, uri]);

  const pdfSource = useMemo(() => {
    if (!readerUri) return null;
    return { uri: readerUri, cache: false };
  }, [readerUri]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Internal Reader</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
      </View>

      {fileType !== "pdf" && uri && !failed ? (
          <WebView
            source={{
              uri,
              headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
            }}
            style={styles.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
          />
      ) : !Pdf || !pdfSource || failed ? (
        <View style={styles.errorPanel}>
          <Ionicons name="document-lock-outline" size={52} color="#A78BFA" />
          <Text style={styles.errorTitle}>Unable to preview this material</Text>
          <Text style={styles.errorText}>
            {!Pdf
              ? "The in-app reader is available in the rebuilt IIE Pulse app."
              : "This material cannot be opened right now. Please reconnect and try again."}
          </Text>
        </View>
      ) : (
        <View style={styles.viewerWrap}>
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#5523D2" size="large" />
              <Text style={styles.loadingText}>Opening inside app...</Text>
            </View>
          ) : null}
          <Pdf
            source={pdfSource}
            trustAllCerts={false}
            onLoadComplete={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            style={styles.pdf}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#1F1930" },
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
  kicker: { color: "#DDD6FE", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginTop: 2 },
  viewerWrap: { flex: 1, backgroundColor: "#111827" },
  pdf: { flex: 1, width: "100%", backgroundColor: "#FFFFFF" },
  webView: { flex: 1, backgroundColor: "#FFFFFF" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
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
  errorTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginTop: 14 },
  errorText: { color: "#DDD6FE", textAlign: "center", lineHeight: 21, marginTop: 8 },
});

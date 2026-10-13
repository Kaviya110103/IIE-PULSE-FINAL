import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

export default function MaterialViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; uri?: string; returnTo?: string }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const title = Array.isArray(params.title) ? params.title[0] : params.title || "Material";
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri || "";
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo || "";

  const goBack = () => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.replace("/materials" as any);
  };

  useEffect(() => {
    AsyncStorage.getItem("access_token").then((token) => setAuthToken(token || ""));
  }, []);

  const viewerHtml = useMemo(() => {
    const escapedUrl = JSON.stringify(uri);
    const escapedToken = JSON.stringify(authToken);
    return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <style>
    html, body { margin:0; padding:0; width:100%; min-height:100%; background:#f8f7ff; overflow:auto; }
    body { font-family: Arial, sans-serif; }
    #pages { padding:12px 8px 24px; }
    canvas { width:100%; height:auto; display:block; margin:0 auto 14px; background:white; box-shadow:0 8px 24px rgba(15,23,42,.16); border-radius:8px; }
    #status { color:#4c1d95; padding:24px; text-align:center; font-weight:700; line-height:1.5; }
    #error { display:none; color:#fff; background:#1f1930; min-height:100vh; align-items:center; justify-content:center; padding:28px; text-align:center; line-height:1.5; box-sizing:border-box; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <div id="status">Opening material inside app...</div>
  <div id="pages"></div>
  <div id="error">No connection or this PDF cannot be opened right now. Please try again after connecting to the internet.</div>
  <script>
    const url = ${escapedUrl};
    const authToken = ${escapedToken};
    const status = document.getElementById('status');
    const pages = document.getElementById('pages');
    const errorBox = document.getElementById('error');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    async function renderPdf() {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: false,
          httpHeaders: authToken ? { Authorization: 'Bearer ' + authToken } : undefined
        });
        const pdf = await loadingTask.promise;
        status.textContent = 'Rendering pages...';
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          pages.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
        status.style.display = 'none';
      } catch (error) {
        status.style.display = 'none';
        errorBox.style.display = 'flex';
      }
    }
    renderPdf();
  </script>
</body>
</html>`;
  }, [authToken, uri]);

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

      {!uri || failed ? (
        <View style={styles.errorPanel}>
          <Ionicons name="document-lock-outline" size={52} color="#A78BFA" />
          <Text style={styles.errorTitle}>Unable to preview this PDF</Text>
          <Text style={styles.errorText}>
            No connection. Please connect to the internet and try again.
          </Text>
        </View>
      ) : (
        <View style={styles.viewerWrap}>
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#5523D2" size="large" />
              <Text style={styles.loadingText}>Opening material...</Text>
            </View>
          ) : null}
          <WebView
            originWhitelist={["*"]}
            source={{ html: viewerHtml, baseUrl: "https://iiepulse-reader.local" }}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            allowsInlineMediaPlayback
            allowFileAccess={false}
            allowFileAccessFromFileURLs={false}
            allowUniversalAccessFromFileURLs={false}
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            style={styles.webView}
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

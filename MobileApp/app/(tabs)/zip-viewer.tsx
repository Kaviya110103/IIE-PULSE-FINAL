import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api, { API_BASE_URL } from "@/services/api";

type ZipEntry = {
  name: string;
  path: string;
  file_type: "pdf" | "image" | "text" | "other";
  size: number;
};

const zipEntriesCacheKey = (materialId: string) => `iie_pulse_zip_entries_${materialId}`;
const ZIP_IMAGE_CACHE_DIR = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ""}iie-pulse-zip-images/`;

function safeCacheName(materialId: string, entryPath: string) {
  return `${materialId}-${entryPath.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

async function ensureDirectory(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

export default function ZipViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const materialId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const title = Array.isArray(params.title) ? params.title[0] : params.title || "ZIP Material";
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeImage, setActiveImage] = useState<ZipEntry | null>(null);
  const [activeImageUri, setActiveImageUri] = useState("");
  const [activeText, setActiveText] = useState<{ name: string; content: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    const loadEntries = async () => {
      try {
        setErrorMsg("");
        const response = await api.get(`materials/${materialId}/zip-entries/`);
        if (!alive) return;
        const nextEntries = response.data?.entries || [];
        setEntries(nextEntries);
        await AsyncStorage.setItem(zipEntriesCacheKey(materialId), JSON.stringify(nextEntries));
      } catch (error: any) {
        if (!alive) return;
        const cached = await AsyncStorage.getItem(zipEntriesCacheKey(materialId));
        let cachedEntries: ZipEntry[] = [];
        try {
          cachedEntries = cached ? JSON.parse(cached) : [];
        } catch {
          cachedEntries = [];
        }

        if (cachedEntries.length) {
          setEntries(cachedEntries);
          setErrorMsg("No connection. Showing saved ZIP file list.");
        } else {
          setErrorMsg("No connection. Please connect once to open this ZIP material.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (materialId) {
      loadEntries();
    } else {
      setErrorMsg("ZIP material not found.");
      setLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [materialId]);

  const entryUrl = (entry: ZipEntry) =>
    `${API_BASE_URL.replace(/\/$/, "")}/materials/${materialId}/zip-file/?path=${encodeURIComponent(entry.path)}`;

  const loadImagePreview = async (entry: ZipEntry) => {
    setImageLoading(true);
    setImageLoadError("");
    setActiveImageUri("");

    try {
      await ensureDirectory(ZIP_IMAGE_CACHE_DIR);
      const localUri = `${ZIP_IMAGE_CACHE_DIR}${safeCacheName(materialId, entry.path)}`;
      const existing = await FileSystem.getInfoAsync(localUri);

      if (existing.exists) {
        setActiveImageUri(localUri);
        return;
      }

      const token = await AsyncStorage.getItem("access_token");
      const result = await FileSystem.downloadAsync(entryUrl(entry), localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (result.status < 200 || result.status >= 300) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
        throw new Error(`Image download failed with status ${result.status}`);
      }

      setActiveImageUri(result.uri);
    } catch {
      setImageLoadError("Unable to open this image inside the app. Please try again after connecting to the internet.");
    } finally {
      setImageLoading(false);
    }
  };

  const openEntry = async (entry: ZipEntry) => {
    if (entry.file_type === "pdf") {
      router.push({
        pathname: "/(tabs)/material-viewer",
        params: {
          title: entry.name,
          uri: entryUrl(entry),
        },
      } as any);
      return;
    }

    if (entry.file_type === "image") {
      setImageLoadError("");
      setActiveImage(entry);
      loadImagePreview(entry);
      return;
    }

    if (entry.file_type === "text") {
      setPreviewLoading(true);
      setActiveText({ name: entry.name, content: "" });
      try {
        const response = await api.get(`materials/${materialId}/zip-file/`, {
          params: { path: entry.path },
          responseType: "text",
        });
        setActiveText({ name: entry.name, content: String(response.data || "").slice(0, 16000) });
      } catch {
        setActiveText({ name: entry.name, content: "Unable to read this file inside the app." });
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  if (activeImage) {
    return (
      <View style={styles.screen}>
        <ReaderHeader
          title={activeImage.name}
          onBack={() => {
            setActiveImage(null);
            setActiveImageUri("");
            setImageLoadError("");
          }}
        />
        {imageLoading ? (
          <View style={styles.centerPanel}>
            <ActivityIndicator color="#A78BFA" size="large" />
            <Text style={styles.helper}>Opening image inside app...</Text>
          </View>
        ) : imageLoadError ? (
          <View style={styles.centerPanel}>
            <Ionicons name="image-outline" size={50} color="#F87171" />
            <Text style={styles.errorText}>{imageLoadError}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: activeImageUri }}
            style={styles.imagePreview}
            resizeMode="contain"
            onError={() => setImageLoadError("Unable to open this image inside the app. Please try again after connecting to the internet.")}
          />
        )}
      </View>
    );
  }

  if (activeText) {
    return (
      <View style={styles.screen}>
        <ReaderHeader title={activeText.name} onBack={() => setActiveText(null)} />
        <ScrollView style={styles.textReader} contentContainerStyle={{ padding: 16 }}>
          {previewLoading ? (
            <ActivityIndicator color="#5523D2" />
          ) : (
            <Text style={styles.previewText}>{activeText.content}</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ReaderHeader title={title} onBack={() => router.replace("/materials" as any)} />

      {loading ? (
        <View style={styles.centerPanel}>
          <ActivityIndicator color="#A78BFA" size="large" />
          <Text style={styles.helper}>Opening ZIP safely...</Text>
        </View>
      ) : errorMsg && entries.length === 0 ? (
        <View style={styles.centerPanel}>
          <Ionicons name="archive-outline" size={50} color="#F87171" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centerPanel}>
          <Ionicons name="folder-open-outline" size={50} color="#A78BFA" />
          <Text style={styles.emptyTitle}>No readable files found</Text>
          <Text style={styles.helper}>Only PDF, image, and text files can be viewed inside the app.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {errorMsg ? <Text style={styles.noticeText}>{errorMsg}</Text> : null}
          <Text style={styles.countText}>{entries.length} readable files</Text>
          {entries.map((entry) => (
            <TouchableOpacity key={entry.path} style={styles.entryRow} onPress={() => openEntry(entry)}>
              <View style={styles.entryIcon}>
                <Ionicons name={iconForEntry(entry.file_type)} size={20} color="#A78BFA" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
                <Text style={styles.entryPath} numberOfLines={1}>{entry.path}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ReaderHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>ZIP Viewer</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

function iconForEntry(type: ZipEntry["file_type"]) {
  if (type === "pdf") return "document-attach-outline";
  if (type === "image") return "image-outline";
  if (type === "text") return "document-text-outline";
  return "document-outline";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#1F1930" },
  content: { paddingBottom: 28 },
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
  centerPanel: { padding: 28, alignItems: "center", justifyContent: "center", minHeight: 360 },
  helper: { color: "#DDD6FE", textAlign: "center", marginTop: 10, lineHeight: 20 },
  errorText: { color: "#FCA5A5", textAlign: "center", marginTop: 12, lineHeight: 21, fontWeight: "800" },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginTop: 12 },
  listCard: {
    margin: 16,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#171420",
    borderWidth: 1,
    borderColor: "#3B216A",
  },
  countText: { color: "#DDD6FE", fontSize: 12, fontWeight: "900", marginBottom: 10, paddingHorizontal: 4 },
  noticeText: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#221B33",
    borderWidth: 1,
    borderColor: "#3B216A",
    marginBottom: 10,
  },
  entryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#2D2144",
    alignItems: "center",
    justifyContent: "center",
  },
  entryName: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  entryPath: { color: "#A78BFA", fontSize: 11, marginTop: 3 },
  imagePreview: { flex: 1, width: "100%" },
  textReader: { flex: 1, backgroundColor: "#FFFFFF" },
  previewText: { color: "#111827", fontSize: 13, lineHeight: 21 },
});

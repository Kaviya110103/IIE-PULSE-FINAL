import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL, getWithApiFallback, resolveMediaUrl } from "@/services/api";
import { getFileType } from "@/utils/materialLibrary";

const MATERIALS_CACHE_KEY = "iie_pulse_cached_materials";

type MaterialItem = {
  id: number;
  title: string;
  description?: string;
  file?: string;
  uploaded_at?: string;
  uploaded_by_name?: string;
  batch_number?: string;
  batch_code?: string;
  display_name?: string;
  apiBaseUrl?: string;
};

export default function MaterialsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const loadMaterials = async () => {
    try {
      setErrorMsg("");
      const response = await getWithApiFallback("/materials/");
      const rawItems = response.data?.results || response.data || [];
      const responseUrl = String(response.config?.url || "");
      const apiBaseUrl = responseUrl.includes("/api/")
        ? `${responseUrl.split("/api/")[0]}/api/`
        : undefined;
      const mappedItems = rawItems.map((item: MaterialItem) => ({
        ...item,
        apiBaseUrl,
        file: item.file ? resolveMediaUrl(item.file, apiBaseUrl) : item.file,
      }));
      setMaterials(mappedItems);
      await AsyncStorage.setItem(MATERIALS_CACHE_KEY, JSON.stringify(mappedItems));
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setMaterials([]);
        setErrorMsg("Please logout and login again to load your study materials.");
        return;
      }

      const cached = await AsyncStorage.getItem(MATERIALS_CACHE_KEY);
      let cachedItems: MaterialItem[] = [];
      try {
        cachedItems = cached ? JSON.parse(cached) : [];
      } catch {
        cachedItems = [];
      }

      if (Array.isArray(cachedItems) && cachedItems.length) {
        // Older cached material records may contain the previous LAN IP.
        // Keep the offline list, but route the next protected download through
        // the current API base URL.
        const currentApiItems = cachedItems.map((item) => ({
          ...item,
          apiBaseUrl: API_BASE_URL,
        }));
        setMaterials(currentApiItems);
        setErrorMsg("No connection. Showing saved materials.");
      } else {
        setMaterials([]);
        setErrorMsg("No connection. Please connect once to load materials.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMaterials();
  };

  const openPdf = (item: MaterialItem) => {
    if (!item.file) {
      setErrorMsg("PDF file is not available.");
      return;
    }
    setErrorMsg("");
    const baseUrl = item.apiBaseUrl?.replace(/\/$/, "");
    const internalReaderUrl = baseUrl
      ? `${baseUrl}/materials/${item.id}/preview/`
      : item.file;
    router.push({
      pathname: "/(tabs)/material-viewer",
      params: {
        title: item.title || "Material",
        uri: internalReaderUrl,
        fileType: "pdf",
        returnTo: "/materials",
      },
    } as any);
  };

  const materialRows = useMemo(() => materials, [materials]);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={styles.helperText}>Loading materials...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="library-outline" size={25} color="#FFFFFF" />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerKicker}>Learning Resources</Text>
          <Text style={styles.headerTitle}>Study Materials</Text>
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {materials.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="book-outline" size={42} color="#A78BFA" />
          <Text style={styles.emptyText}>No materials uploaded yet</Text>
        </View>
      ) : (
        materialRows.map((item) => {
          const fileName = item.file?.split("?")[0]?.split("/").pop() || item.title || "material";
          const fileType = getFileType(fileName);
          const isZip = fileType === "zip";
          const isPdf = fileType === "pdf";

          return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.fileIcon}>
                <Ionicons name={iconForFileType(fileType)} size={22} color="#5523D2" />
              </View>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.batchPill}>Batch {item.batch_code || item.display_name || item.batch_number || "N/A"}</Text>
              </View>
            </View>

            {!!item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={15} color="#7C3AED" />
                <Text style={styles.meta}>Trainer: {item.uploaded_by_name || "N/A"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={15} color="#7C3AED" />
                <Text style={styles.meta}>
                  Uploaded:{" "}
                  {item.uploaded_at
                    ? new Date(item.uploaded_at).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                if (isPdf) {
                  openPdf(item);
                  return;
                }
                if (isZip) {
                  router.push({
                    pathname: "/(tabs)/zip-viewer",
                    params: {
                      id: String(item.id),
                      title: item.title || "ZIP Material",
                      apiBaseUrl: item.apiBaseUrl || "",
                    },
                  } as any);
                  return;
                }
                const baseUrl = (item.apiBaseUrl || API_BASE_URL).replace(/\/$/, "");
                router.push({
                  pathname: "/(tabs)/material-viewer",
                  params: {
                    title: item.title || "Material",
                    uri: `${baseUrl}/materials/${item.id}/preview/`,
                    fileType,
                    returnTo: "/materials",
                  },
                } as any);
              }}
            >
              {isPdf ? (
                <Ionicons name="eye-outline" size={17} color="#FFFFFF" />
              ) : isZip ? (
                <Ionicons name="archive-outline" size={17} color="#FFFFFF" />
              ) : (
                <Ionicons name="eye-outline" size={17} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>
                {isPdf
                    ? "View PDF"
                    : isZip
                      ? "Open ZIP"
                      : "Open File"}
              </Text>
            </TouchableOpacity>
          </View>
        )})
      )}
    </ScrollView>
  );
}

function iconForFileType(type: string) {
  if (type === "pdf") return "document-attach-outline";
  if (type === "zip") return "archive-outline";
  if (type === "image") return "image-outline";
  if (type === "text") return "document-text-outline";
  if (type === "document") return "documents-outline";
  return "document-outline";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },
  contentContainer: {
    padding: 16,
    paddingTop: 46,
    paddingBottom: 40,
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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5523D2",
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#5523D2",
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: 13,
  },
  headerKicker: {
    color: "#DDD6FE",
    fontSize: 11,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  errorText: {
    color: "#DC2626",
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    elevation: 2,
  },
  emptyText: {
    marginTop: 12,
    color: "#667085",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#5523D2",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  fileIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  cardTitleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    color: "#111827",
    lineHeight: 23,
  },
  batchPill: {
    alignSelf: "flex-start",
    color: "#5523D2",
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 11,
    marginTop: 5,
  },
  description: {
    fontSize: 14,
    color: "#475467",
    marginBottom: 10,
  },
  metaGrid: {
    gap: 8,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FBF9FF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  meta: {
    flex: 1,
    fontSize: 13,
    color: "#667085",
  },
  button: {
    marginTop: 14,
    backgroundColor: "#5523D2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});

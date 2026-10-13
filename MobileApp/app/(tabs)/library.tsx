import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ensureZipMaterialExtracted,
  getLibraryMaterials,
  getFileType,
  LibraryChildFile,
  LibraryFileType,
  LibraryMaterial,
  readLibraryText,
  removeLibraryMaterial,
} from "@/utils/materialLibrary";

type ActiveFile = {
  title: string;
  localUri: string;
  fileName: string;
  fileType: LibraryFileType;
};

export default function LibraryScreen() {
  const [items, setItems] = useState<LibraryMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMaterial, setActiveMaterial] = useState<LibraryMaterial | null>(null);
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  const [textPreview, setTextPreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setItems(await getLibraryMaterials());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [loadLibrary])
  );

  const openFile = async (file: ActiveFile) => {
    const actualFileType = getFileType(file.fileName || file.localUri);
    if (actualFileType === "zip") {
      const source = items.find((item) => item.localUri === file.localUri);
      if (source) await openMaterial(source);
      return;
    }

    setActiveFile({ ...file, fileType: actualFileType });
    setTextPreview("");

    if (actualFileType === "text") {
      setPreviewLoading(true);
      try {
        const content = await readLibraryText(file.localUri);
        setTextPreview(content.slice(0, 12000));
      } catch {
        setTextPreview("Unable to read this file inside the app.");
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const openMaterial = async (item: LibraryMaterial) => {
    const actualFileType = getFileType(item.fileName || item.localUri);
    if (actualFileType === "zip") {
      try {
        const updated = await ensureZipMaterialExtracted(item);
        setItems((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
        setActiveMaterial(updated);
      } catch {
        Alert.alert("Cannot open ZIP", "This ZIP file could not be extracted. It may be corrupted or unsupported.");
      }
      return;
    }

    await openFile({
      title: item.title,
      localUri: item.localUri,
      fileName: item.fileName,
      fileType: actualFileType,
    });
  };

  const openChildFile = async (file: LibraryChildFile) => {
    await openFile({
      title: file.name,
      localUri: file.localUri,
      fileName: file.name,
      fileType: file.fileType,
    });
  };

  const deleteItem = async (id: number) => {
    Alert.alert("Remove material?", "This removes the app-private offline copy.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeLibraryMaterial(id);
          setActiveMaterial(null);
          setActiveFile(null);
          await loadLibrary();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={styles.helperText}>Opening library...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="library-outline" size={25} color="#FFFFFF" />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerKicker}>Offline Access</Text>
          <Text style={styles.headerTitle}>My Library</Text>
          <Text style={styles.headerSub}>Downloaded materials stay inside this app.</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="folder-open-outline" size={42} color="#A78BFA" />
          <Text style={styles.emptyTitle}>No library materials yet</Text>
          <Text style={styles.emptyText}>Download materials from Study Materials to read them offline here.</Text>
        </View>
      ) : (
        items.map((item) => {
          const actualFileType = getFileType(item.fileName || item.localUri);
          return (
          <TouchableOpacity key={item.id} style={styles.card} onPress={() => openMaterial(item)}>
            <View style={styles.fileIcon}>
              <Ionicons name={getIcon(actualFileType) as any} size={23} color="#5523D2" />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.title} numberOfLines={2}>{item.fileName || item.title}</Text>
              <Text style={styles.downloaded}>
                {actualFileType === "zip"
                  ? `${item.extractedFiles?.length || 0} files saved`
                  : actualFileType === "pdf"
                    ? "Open PDF in app"
                    : actualFileType === "image"
                      ? "Open image in app"
                      : actualFileType === "text"
                        ? "Open text in app"
                        : "Saved in app"}
              </Text>
            </View>
            <TouchableOpacity style={styles.trashButton} onPress={() => deleteItem(item.id)}>
              <Ionicons name="trash-outline" size={17} color="#B42318" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
          </TouchableOpacity>
        )})
      )}

      <Modal transparent animationType="slide" visible={!!activeMaterial} onRequestClose={() => setActiveMaterial(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.readerModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>ZIP Library</Text>
                <Text style={styles.modalTitle}>{activeMaterial?.fileName || "ZIP Material"}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setActiveMaterial(null)}>
                <Ionicons name="close" size={22} color="#475467" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.zipList} contentContainerStyle={{ padding: 12 }}>
              {(activeMaterial?.extractedFiles || []).length === 0 ? (
                <View style={styles.protectedPreview}>
                  <Ionicons name="archive-outline" size={44} color="#5523D2" />
                  <Text style={styles.protectedTitle}>No supported files found</Text>
                  <Text style={styles.protectedText}>This ZIP is saved offline, but it has no readable PDF, image, or text file.</Text>
                </View>
              ) : (
                activeMaterial?.extractedFiles?.map((file) => (
                  <TouchableOpacity key={file.id} style={styles.zipRow} onPress={() => openChildFile(file)}>
                    <View style={styles.fileIconSmall}>
                      <Ionicons name={getIcon(file.fileType) as any} size={18} color="#5523D2" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.zipFileName} numberOfLines={1}>{file.name}</Text>
                      <Text style={styles.zipPath} numberOfLines={1}>{file.relativePath}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!activeFile} animationType="slide" onRequestClose={() => setActiveFile(null)}>
        <View style={styles.viewerScreen}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerBack} onPress={() => setActiveFile(null)}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.viewerKicker}>In-App Viewer</Text>
              <Text style={styles.viewerTitle} numberOfLines={1}>{activeFile?.fileName || "Material"}</Text>
            </View>
          </View>

          {activeFile?.fileType === "pdf" ? (
            <View style={styles.unsupportedPanel}>
              <Ionicons name="document-lock-outline" size={52} color="#5523D2" />
              <Text style={styles.unsupportedTitle}>PDF saved offline</Text>
              <Text style={styles.unsupportedText}>
                This file is stored safely inside the app Library. In-app PDF preview needs a native production/dev build, so it is disabled in Expo Go to prevent external opening.
              </Text>
            </View>
          ) : activeFile?.fileType === "image" ? (
            <Image source={{ uri: activeFile.localUri }} style={styles.fullImage} resizeMode="contain" />
          ) : activeFile?.fileType === "text" ? (
            <ScrollView style={styles.textReader} contentContainerStyle={{ padding: 16 }}>
              {previewLoading ? (
                <ActivityIndicator color="#5523D2" />
              ) : (
                <Text style={styles.previewText}>{textPreview || "No readable content found."}</Text>
              )}
            </ScrollView>
          ) : (
            <View style={styles.unsupportedPanel}>
              <Ionicons name="document-lock-outline" size={52} color="#5523D2" />
              <Text style={styles.unsupportedTitle}>Saved for offline access</Text>
              <Text style={styles.unsupportedText}>
                This file type cannot be rendered safely inside the app yet. It stays stored in the app Library and is not opened in another app.
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

function getIcon(type: LibraryFileType) {
  if (type === "image") return "image-outline";
  if (type === "text") return "document-text-outline";
  if (type === "pdf") return "document-attach-outline";
  if (type === "zip") return "archive-outline";
  if (type === "document") return "documents-outline";
  return "document-outline";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F3FF" },
  contentContainer: { padding: 16, paddingTop: 46, paddingBottom: 40 },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F3FF",
    padding: 24,
  },
  helperText: { marginTop: 12, color: "#667085" },
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
  headerTextBlock: { flex: 1, marginLeft: 13 },
  headerKicker: { color: "#DDD6FE", fontSize: 11, textTransform: "uppercase", fontWeight: "900" },
  headerTitle: { fontSize: 24, color: "#FFFFFF", fontWeight: "900" },
  headerSub: { color: "#EDE9FE", fontSize: 12, marginTop: 2 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  emptyTitle: { marginTop: 12, color: "#111827", fontSize: 17, fontWeight: "900" },
  emptyText: { marginTop: 6, color: "#667085", textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconSmall: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, minWidth: 0 },
  title: { color: "#111827", fontSize: 15, lineHeight: 21, fontWeight: "900" },
  downloaded: { color: "#7C3AED", fontSize: 11, marginTop: 4, fontWeight: "800" },
  trashButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FEF3F2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.55)", justifyContent: "flex-end" },
  readerModal: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  modalKicker: { color: "#5523D2", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  modalTitle: { color: "#111827", fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: 4 },
  zipList: {
    maxHeight: 520,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    backgroundColor: "#FBF9FF",
  },
  zipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 11,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  zipFileName: { color: "#111827", fontSize: 14, fontWeight: "900" },
  zipPath: { color: "#667085", fontSize: 11, marginTop: 2 },
  protectedPreview: { alignItems: "center", padding: 24 },
  protectedTitle: { color: "#111827", fontSize: 17, fontWeight: "900", marginTop: 12 },
  protectedText: { color: "#667085", textAlign: "center", lineHeight: 20, marginTop: 6 },
  viewerScreen: { flex: 1, backgroundColor: "#1F1930" },
  viewerHeader: {
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#5523D2",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewerBack: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerKicker: { color: "#DDD6FE", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  viewerTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginTop: 2 },
  pdf: { flex: 1, width: "100%", backgroundColor: "#1F1930" },
  fullImage: { flex: 1, width: "100%" },
  textReader: { flex: 1, backgroundColor: "#FFFFFF" },
  previewText: { color: "#111827", fontSize: 13, lineHeight: 21 },
  unsupportedPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  unsupportedTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "900", marginTop: 14 },
  unsupportedText: { color: "#DDD6FE", textAlign: "center", lineHeight: 21, marginTop: 8 },
});

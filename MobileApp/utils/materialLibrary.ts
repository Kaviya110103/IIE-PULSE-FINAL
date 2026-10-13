import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { unzipSync, strFromU8 } from "fflate";
import { Buffer } from "buffer";
import { API_BASE_URL } from "@/services/api";

export type LibraryFileType = "image" | "text" | "pdf" | "zip" | "document" | "other";

export type LibraryChildFile = {
  id: string;
  name: string;
  relativePath: string;
  localUri: string;
  fileType: LibraryFileType;
};

export type LibraryMaterial = {
  id: number;
  title: string;
  description?: string;
  localUri: string;
  remoteUri: string;
  fileName: string;
  fileType: LibraryFileType;
  batchLabel?: string;
  uploadedBy?: string;
  downloadedAt: string;
  extractedDir?: string;
  extractedFiles?: LibraryChildFile[];
};

export type DownloadableMaterial = {
  id: number;
  title: string;
  description?: string;
  file?: string;
  uploaded_by_name?: string;
  batch_number?: string;
  batch_code?: string;
  display_name?: string;
};

export type DownloadProgress = {
  receivedBytes: number;
  totalBytes: number;
  percent: number;
};

const LIBRARY_KEY = "iie_pulse_material_library";
const LIBRARY_DIR = `${FileSystem.documentDirectory || ""}iie-pulse-library/`;
const MAX_EXTRACTED_FILES = 250;
const MAX_EXTRACTED_FILE_SIZE = 8 * 1024 * 1024;
const MAX_EXTRACTED_TOTAL_SIZE = 45 * 1024 * 1024;

const SKIPPED_ZIP_FOLDERS = [
  "__macosx/",
  ".git/",
  "node_modules/",
  "android/",
  "ios/",
  "build/",
  "dist/",
  ".expo/",
];

function sanitizeFileName(value: string) {
  return (value || "material")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function sanitizePath(value: string) {
  return value
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map(sanitizeFileName)
    .filter(Boolean)
    .join("/");
}

function getFileName(material: DownloadableMaterial) {
  const remoteName = material.file?.split("?")[0]?.split("/").pop() || "";
  const fallback = `${sanitizeFileName(material.title)}.pdf`;
  return sanitizeFileName(decodeURIComponent(remoteName || fallback));
}

export function getFileType(fileName: string): LibraryFileType {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/.test(lower)) return "image";
  if (/\.(txt|csv|md|json|html|css|js|py|java|sql)$/.test(lower)) return "text";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".zip")) return "zip";
  if (/\.(docx?|pptx?|xlsx?)$/.test(lower)) return "document";
  return "other";
}

function isReadableZipEntry(fileName: string) {
  const type = getFileType(fileName);
  return type === "pdf" || type === "image" || type === "text";
}

function shouldSkipZipPath(fileName: string) {
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  return SKIPPED_ZIP_FOLDERS.some((folder) =>
    normalized === folder.slice(0, -1) || normalized.includes(`/${folder}`) || normalized.startsWith(folder)
  );
}

async function ensureDirectory(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

async function ensureLibraryDir() {
  await ensureDirectory(LIBRARY_DIR);
}

function base64ToUint8Array(base64: string) {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function materialDownloadUrl(materialId: number) {
  return `${API_BASE_URL.replace(/\/$/, "")}/materials/${materialId}/download/`;
}

export async function getLibraryMaterials(): Promise<LibraryMaterial[]> {
  const raw = await AsyncStorage.getItem(LIBRARY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await AsyncStorage.removeItem(LIBRARY_KEY);
    return [];
  }
}

export async function saveLibraryMaterials(items: LibraryMaterial[]) {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

async function extractZipToLibrary(item: LibraryMaterial) {
  const zipBase64 = await FileSystem.readAsStringAsync(item.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zipBytes = base64ToUint8Array(zipBase64);

  if (zipBytes.length < 4 || zipBytes[0] !== 0x50 || zipBytes[1] !== 0x4b) {
    throw new Error("Downloaded file is not a valid ZIP archive.");
  }

  let selectedCount = 0;
  let selectedBytes = 0;
  const zipEntries = unzipSync(zipBytes, {
    filter: (file) => {
      const safeName = sanitizePath(file.name.replace(/\\/g, "/"));
      if (!safeName || file.name.endsWith("/") || shouldSkipZipPath(file.name)) {
        return false;
      }
      if (!isReadableZipEntry(safeName)) {
        return false;
      }
      if (file.originalSize > MAX_EXTRACTED_FILE_SIZE) {
        return false;
      }
      if (selectedCount >= MAX_EXTRACTED_FILES) {
        return false;
      }
      if (selectedBytes + file.originalSize > MAX_EXTRACTED_TOTAL_SIZE) {
        return false;
      }

      selectedCount += 1;
      selectedBytes += file.originalSize;
      return true;
    },
  });
  const extractedDir = `${LIBRARY_DIR}${item.id}-extracted/`;
  await FileSystem.deleteAsync(extractedDir, { idempotent: true });
  await ensureDirectory(extractedDir);

  const extractedFiles: LibraryChildFile[] = [];
  for (const [entryName, entryBytes] of Object.entries(zipEntries)) {
    const safeRelativePath = sanitizePath(entryName.replace(/\\/g, "/"));
    if (!safeRelativePath || entryName.endsWith("/")) continue;

    const localUri = `${extractedDir}${safeRelativePath}`;
    const parentPath = safeRelativePath.split("/").slice(0, -1).join("/");
    if (parentPath) {
      await ensureDirectory(`${extractedDir}${parentPath}/`);
    }
    await FileSystem.writeAsStringAsync(localUri, uint8ArrayToBase64(entryBytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    extractedFiles.push({
      id: `${item.id}-${extractedFiles.length}`,
      name: safeRelativePath.split("/").pop() || safeRelativePath,
      relativePath: safeRelativePath,
      localUri,
      fileType: getFileType(safeRelativePath),
    });
  }

  return { extractedDir, extractedFiles };
}

export async function downloadMaterialToLibrary(
  material: DownloadableMaterial,
  onProgress?: (progress: DownloadProgress) => void
) {
  await ensureLibraryDir();

  const fileName = getFileName(material);
  const localUri = `${LIBRARY_DIR}${material.id}-${fileName}`;
  const token = await AsyncStorage.getItem("access_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const download = FileSystem.createDownloadResumable(
    materialDownloadUrl(material.id),
    localUri,
    { headers },
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const totalBytes = totalBytesExpectedToWrite || 0;
      onProgress?.({
        receivedBytes: totalBytesWritten,
        totalBytes,
        percent: totalBytes ? Math.min(100, Math.round((totalBytesWritten / totalBytes) * 100)) : 0,
      });
    }
  );

  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error("Unable to save material to Library.");
  }

  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    if (result.status === 401 || result.status === 403) {
      throw new Error("Please login again to open this ZIP material.");
    }
    throw new Error("Unable to download this ZIP material from the server.");
  }

  const item: LibraryMaterial = {
    id: material.id,
    title: material.title || fileName,
    description: material.description || "",
    localUri: result.uri,
    remoteUri: material.file || "",
    fileName,
    fileType: getFileType(fileName),
    batchLabel: material.batch_code || material.display_name || material.batch_number || "N/A",
    uploadedBy: material.uploaded_by_name || "Trainer",
    downloadedAt: new Date().toISOString(),
  };

  if (item.fileType === "zip") {
    try {
      const extracted = await extractZipToLibrary(item);
      item.extractedDir = extracted.extractedDir;
      item.extractedFiles = extracted.extractedFiles;
    } catch (error: any) {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
      throw new Error(error?.message || "This ZIP file could not be opened. It may be corrupted or unsupported.");
    }
  }

  const existing = await getLibraryMaterials();
  const oldItem = existing.find((entry) => entry.id === item.id);
  if (oldItem?.localUri && oldItem.localUri !== item.localUri) {
    await FileSystem.deleteAsync(oldItem.localUri, { idempotent: true });
  }
  if (oldItem?.extractedDir) {
    await FileSystem.deleteAsync(oldItem.extractedDir, { idempotent: true });
  }
  const next = [item, ...existing.filter((entry) => entry.id !== item.id)];
  await saveLibraryMaterials(next);
  return item;
}

export async function ensureZipMaterialExtracted(material: LibraryMaterial) {
  const normalizedType = getFileType(material.fileName || material.localUri || "");
  if (normalizedType !== "zip") {
    return { ...material, fileType: normalizedType };
  }

  if (material.extractedFiles?.length && material.extractedDir) {
    return { ...material, fileType: "zip" as const };
  }

  const extracted = await extractZipToLibrary({ ...material, fileType: "zip" });
  const updated: LibraryMaterial = {
    ...material,
    fileType: "zip",
    extractedDir: extracted.extractedDir,
    extractedFiles: extracted.extractedFiles,
  };
  const existing = await getLibraryMaterials();
  await saveLibraryMaterials(existing.map((entry) => (entry.id === updated.id ? updated : entry)));
  return updated;
}

export async function removeLibraryMaterial(id: number) {
  const existing = await getLibraryMaterials();
  const item = existing.find((entry) => entry.id === id);
  if (item?.localUri) {
    await FileSystem.deleteAsync(item.localUri, { idempotent: true });
  }
  if (item?.extractedDir) {
    await FileSystem.deleteAsync(item.extractedDir, { idempotent: true });
  }
  await saveLibraryMaterials(existing.filter((entry) => entry.id !== id));
}

export async function readLibraryText(uri: string) {
  return FileSystem.readAsStringAsync(uri);
}

export function readZipTextPreview(bytes: Uint8Array) {
  return strFromU8(bytes).slice(0, 12000);
}

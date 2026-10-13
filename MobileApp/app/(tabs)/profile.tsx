import api from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ProfileView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    gender: "",
    dob: "",
    email: "",
    mobile: "",
    course: "",
    batch: "",
    qualification: "",
    joining: "",
    ending: "",
  });
  const [image, setImage] = useState("https://i.pravatar.cc/300");
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get("students/me/");
      const data = response.data;

      const courseNames = Array.isArray(data.course_names) && data.course_names.length
        ? data.course_names.join(", ")
        : data.course || "";
      const batchNames = Array.isArray(data.assigned_batches) && data.assigned_batches.length
        ? data.assigned_batches
            .map((batch: any) => batch.display_name || batch.batch_code || batch.batch_number)
            .filter(Boolean)
            .join(", ")
        : data.assigned_batch_code || data.assigned_batch_number || "";

      setProfile({
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        gender: data.gender || "",
        dob: data.date_of_birth || "",
        email: data.email || "",
        mobile: data.mobile_no || "",
        course: courseNames,
        batch: batchNames,
        qualification: data.qualification || "",
        joining: data.created_at ? data.created_at.split("T")[0] : "",
        ending: "",
      });

      if (data.photo) {
        setImage(resolveMediaUrl(data.photo));
      }
      setPhotoAsset(null);
    } catch (error: any) {
      console.log("Profile fetch error:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      const [first_name, ...rest] = profile.name.trim().split(" ");
      const last_name = rest.join(" ");

      const basePayload = {
        first_name: first_name || "",
        last_name: last_name || "",
        date_of_birth: profile.dob,
        email: profile.email.trim(),
        mobile_no: profile.mobile.trim(),
      };

      if (photoAsset) {
        const formData = new FormData();
        Object.entries(basePayload).forEach(([key, value]) => formData.append(key, value));
        const fileName = photoAsset.fileName || `student-profile-${Date.now()}.jpg`;
        formData.append("photo", {
          uri: photoAsset.uri,
          name: fileName,
          type: photoAsset.mimeType || "image/jpeg",
        } as any);
        await api.put("students/me/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.put("students/me/", basePayload);
      }

      setEditMode(false);
      Alert.alert("Success", "Profile updated successfully");
      await loadProfile();
    } catch (error: any) {
      console.log("Profile update error:", error);
      Alert.alert(
        "Update Failed",
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.message ||
          "Could not update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const resolveMediaUrl = (value: string) => {
    if (/^https?:\/\//i.test(value)) return value;

    const apiBase = String(api.defaults.baseURL || "");
    const serverBase = apiBase.replace(/\/api\/?$/, "");
    return `${serverBase}${value.startsWith("/") ? "" : "/"}${value}`;
  };

  const handleEditDone = async () => {
    if (editMode) {
      await saveProfile();
    } else {
      setEditMode(true);
    }
  };

  const pickProfilePhoto = async () => {
    if (!editMode) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Please allow photo access to update your profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPhotoAsset(result.assets[0]);
      setImage(result.assets[0].uri);
    }
  };

  const renderRow = (
    icon: any,
    label: string,
    key: keyof typeof profile,
    editable: boolean = false
  ) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color="#5523D2" />
        <Text style={styles.label}>{label}</Text>
      </View>
      {editMode && editable ? (
        <TextInput
          value={profile[key]}
          onChangeText={(text) => setProfile((prev) => ({ ...prev, [key]: text }))}
          style={styles.input}
        />
      ) : (
        <Text style={styles.value}>{profile[key] || "-"}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#5523D2" />
        <Text style={{ marginTop: 12 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="person-circle-outline" size={28} color="#5523D2" />
          <Text style={styles.heading}>Student Profile</Text>
          <Ionicons name="school-outline" size={28} color="#5523D2" />
        </View>
      </View>

      <View style={styles.profileCenter}>
        <Pressable style={styles.avatarWrap} onPress={pickProfilePhoto}>
          <Image source={{ uri: image }} style={styles.avatar} />
          {editMode ? (
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          ) : null}
        </Pressable>

        <Pressable
          style={styles.modeBtn}
          onPress={handleEditDone}
          disabled={saving}
        >
          <Text style={styles.modeText}>
            {saving ? "Saving..." : editMode ? "Done" : "Edit"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color="#5523D2" />
          <Text style={styles.cardTitle}>Personal Details</Text>
        </View>
        {renderRow("person-outline", "Name", "name", true)}
        {renderRow("calendar-outline", "Date of Birth", "dob", true)}
        {renderRow("mail-outline", "Email", "email", true)}
        {renderRow("call-outline", "Mobile", "mobile", true)}
        {renderRow("male-female-outline", "Gender", "gender")}
        {renderRow("school-outline", "Qualification", "qualification")}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase-outline" size={20} color="#5523D2" />
          <Text style={styles.cardTitle}>Professional Details</Text>
        </View>
        {renderRow("book-outline", "Course", "course")}
        {renderRow("time-outline", "Batch", "batch")}
        {renderRow("log-in-outline", "Joining Date", "joining")}
        {renderRow("log-out-outline", "Ending Date", "ending")}
      </View>

      {Platform.OS === "android" && <View style={{ height: 30 }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Platform.OS === "ios" ? 40 : 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  profileCenter: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarWrap: {
    width: 106,
    height: 106,
    borderRadius: 53,
    padding: 3,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5523D2",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#5523D2",
  },
  modeText: {
    color: "#fff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5523D2",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  rowLeft: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  label: {
    color: "#555",
    fontWeight: "600",
  },
  value: {
    color: "#000",
    maxWidth: "50%",
    textAlign: "right",
  },
  input: {
    borderBottomWidth: 1,
    minWidth: "50%",
    textAlign: "right",
    color: "#000",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#5523D2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: 10,
    alignSelf: "center",
    minWidth: 100,
  },
  backText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});

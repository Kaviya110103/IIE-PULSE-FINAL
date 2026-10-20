import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { registerGuest } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type RegisterForm = {
  name: string;
  email: string;
  mobile: string;
  qualification: string;
  area_of_interest: string;
  pincode: string;
  location: string;
  city: string;
  state: string;
  branch: string;
  username: string;
  password: string;
  confirmPassword: string;
};

const initialForm: RegisterForm = {
  name: "",
  email: "",
  mobile: "",
  qualification: "",
  area_of_interest: "",
  pincode: "",
  location: "",
  city: "",
  state: "",
  branch: "",
  username: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [errorMsg, setErrorMsg] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (key: keyof RegisterForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    const value = form.pincode.replace(/\D/g, "").slice(0, 6);

    if (!/^\d{6}$/.test(value)) {
      setLocationHint(value ? "Enter 6 digit pincode to fetch area." : "");
      updateField("city", "");
      updateField("state", "");
      return;
    }

    let active = true;

    const fetchPincode = async () => {
      setFetchingLocation(true);
      setLocationHint("Finding area, city and state...");

      try {
        const response = await Promise.race([
          fetch(`https://api.postalpincode.in/pincode/${value}`),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Location lookup timed out")), 8000)
          ),
        ]);
        const data = await response.json();
        const postOffice = data?.[0]?.PostOffice?.[0];

        if (!active) {
          return;
        }

        if (postOffice) {
          setForm((current) => ({
            ...current,
            location: postOffice.Name || current.location,
            city: postOffice.District || "",
            state: postOffice.State || "",
          }));
          setLocationHint(
            `${postOffice.Name || "Area"}, ${postOffice.District || "City"}, ${postOffice.State || "State"}`
          );
        } else {
          setForm((current) => ({ ...current, location: "", city: "", state: "" }));
          setLocationHint("Pincode not found. Please enter area manually.");
        }
      } catch {
        if (active) {
          setLocationHint("Could not fetch area. Please check internet or enter area manually.");
        }
      } finally {
        if (active) {
          setFetchingLocation(false);
        }
      }
    };

    fetchPincode();

    return () => {
      active = false;
    };
  }, [form.pincode]);

  const handleSubmit = async () => {
    setErrorMsg("");

    const cleaned = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.replace(/\D/g, ""),
      qualification: form.qualification.trim(),
      area_of_interest: form.area_of_interest.trim(),
      pincode: form.pincode.replace(/\D/g, "").slice(0, 6),
      location: form.location.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      branch: form.branch.trim(),
      username: form.username.trim().toLowerCase(),
      password: form.password.trim(),
      confirmPassword: form.confirmPassword.trim(),
    };

    if (
      !cleaned.name ||
      !cleaned.email ||
      !cleaned.mobile ||
      !cleaned.qualification ||
      !cleaned.area_of_interest ||
      !cleaned.pincode ||
      !cleaned.location ||
      !cleaned.branch ||
      !cleaned.username ||
      !cleaned.password ||
      !cleaned.confirmPassword
    ) {
      setErrorMsg("Please fill all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
      setErrorMsg("Please enter a valid Email ID.");
      return;
    }

    if (!/^\d{10}$/.test(cleaned.mobile)) {
      setErrorMsg("Please enter a valid 10 digit Mobile Number.");
      return;
    }

    if (!/^\d{6}$/.test(cleaned.pincode)) {
      setErrorMsg("Please enter a valid 6 digit Pincode.");
      return;
    }

    if (cleaned.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (cleaned.password !== cleaned.confirmPassword) {
      setErrorMsg("Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);

    const result = await registerGuest({
      name: cleaned.name,
      email: cleaned.email,
      mobile: cleaned.mobile,
      qualification: cleaned.qualification,
      area_of_interest: cleaned.area_of_interest,
      pincode: cleaned.pincode,
      location: cleaned.location,
      city: cleaned.city,
      state: cleaned.state,
      branch: cleaned.branch,
      username: cleaned.username,
      password: cleaned.password,
    });

    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || "Registration failed.");
      return;
    }

    router.replace("/loginform" as any);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add-outline" size={34} color="#5523D2" />
            </View>
            <ThemedText style={styles.titleText}>Registration</ThemedText>
            <ThemedText style={styles.subTitle}>
              Create your IIE Pulse access
            </ThemedText>

            <InputRow
              icon="person-outline"
              placeholder="Name"
              value={form.name}
              onChangeText={(value) => updateField("name", value)}
              editable={!loading}
            />
            <InputRow
              icon="mail-outline"
              placeholder="Email ID"
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <InputRow
              icon="call-outline"
              placeholder="Mobile Number"
              value={form.mobile}
              onChangeText={(value) => updateField("mobile", value)}
              keyboardType="phone-pad"
              editable={!loading}
            />
            <InputRow
              icon="school-outline"
              placeholder="Qualification"
              value={form.qualification}
              onChangeText={(value) => updateField("qualification", value)}
              editable={!loading}
            />
            <Text style={styles.fieldLabel}>Area of Interest</Text>
            <InputRow
              icon="code-slash-outline"
              placeholder="Area of Interest (e.g. Python, Java)"
              value={form.area_of_interest}
              onChangeText={(value) => updateField("area_of_interest", value)}
              editable={!loading}
            />
            <Text style={styles.fieldLabel}>Branch</Text>
            <View style={styles.pickerWrapper}>
              <Ionicons name="business-outline" size={18} color="#5523D2" />
              <Picker
                selectedValue={form.branch}
                onValueChange={(value) => updateField("branch", value)}
                enabled={!loading}
                style={styles.picker}
              >
                <Picker.Item label="Choose Branch" value="" />
                <Picker.Item label="100FT" value="100ft" />
                <Picker.Item label="Hopes" value="hopes" />
                <Picker.Item label="Kuniyamuthur" value="kuniyamuthur" />
              </Picker>
            </View>
            <InputRow
              icon="location-outline"
              placeholder="Pincode"
              value={form.pincode}
              onChangeText={(value) => updateField("pincode", value.replace(/\D/g, "").slice(0, 6))}
              keyboardType="phone-pad"
              editable={!loading}
              trailing={fetchingLocation ? <ActivityIndicator color="#5523D2" /> : null}
            />

            {locationHint ? (
              <ThemedText style={styles.locationHint}>{locationHint}</ThemedText>
            ) : null}

            {form.city || form.state ? (
              <View style={styles.locationPill}>
                <Ionicons name="map-outline" size={16} color="#5523D2" />
                <ThemedText style={styles.locationPillText}>
                  {[form.city, form.state].filter(Boolean).join(", ")}
                </ThemedText>
              </View>
            ) : null}

            <InputRow
              icon="navigate-outline"
              placeholder="Area"
              value={form.location}
              onChangeText={(value) => updateField("location", value)}
              editable={!loading}
            />

            <InputRow
              icon="at-outline"
              placeholder="Username"
              value={form.username}
              onChangeText={(value) => updateField("username", value)}
              autoCapitalize="none"
              editable={!loading}
            />
            <InputRow
              icon="lock-closed-outline"
              placeholder="Password"
              value={form.password}
              onChangeText={(value) => updateField("password", value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
              trailing={
                <Pressable onPress={() => setShowPassword((value) => !value)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#5523D2"
                  />
                </Pressable>
              }
            />
            <InputRow
              icon="shield-checkmark-outline"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(value) => updateField("confirmPassword", value)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              editable={!loading}
              trailing={
                <Pressable
                  onPress={() => setShowConfirmPassword((value) => !value)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#5523D2"
                  />
                </Pressable>
              }
            />

            {errorMsg ? (
              <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              style={styles.submitButton}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
              <ThemedText style={styles.buttonText}>
                {loading ? "Submitting..." : "Submit"}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

type InputRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable: boolean;
  trailing?: ReactNode;
};

function InputRow({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "sentences",
  editable,
  trailing,
}: InputRowProps) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={18} color="#5523D2" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
      />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F3FF",
    padding: 20,
  },
  keyboard: {
    flex: 1,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
    marginVertical: 18,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backText: {
    color: "#5523D2",
    fontSize: 14,
    fontWeight: "700",
  },
  fieldLabel: {
    alignSelf: "stretch",
    color: "#24134F",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 5,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  subTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 22,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 13,
    width: "100%",
    backgroundColor: "#F6F3FF",
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 13,
    width: "100%",
    backgroundColor: "#F6F3FF",
  },
  picker: {
    flex: 1,
    color: "#111827",
    marginLeft: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    marginLeft: 8,
  },
  locationHint: {
    width: "100%",
    color: "#6B7280",
    fontSize: 12,
    marginTop: -6,
    marginBottom: 10,
  },
  locationPill: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 13,
  },
  locationPillText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  submitButton: {
    width: "100%",
    backgroundColor: "#5523D2",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

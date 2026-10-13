import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { loginGuest, loginUser, requestPasswordResetOtp, resetStudentPassword } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const appLogo = require("../../assets/images/icon.png");

export default function LoginForm() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "reset">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(18)).current;
  const splashFadeAnim = useRef(new Animated.Value(0)).current;
  const splashScaleAnim = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        router.replace("/dashboard" as any);
      }
    };

    redirectIfLoggedIn();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(formSlideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(splashScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(splashFadeAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [fadeAnim, formSlideAnim, splashFadeAnim, splashScaleAnim]);

  if (showSplash) {
    return (
      <View style={styles.splashScreen}>
        <Animated.View
          style={[
            styles.splashLogoWrap,
            {
              opacity: splashFadeAnim,
              transform: [{ scale: splashScaleAnim }],
            },
          ]}
        >
          <Image source={appLogo} style={styles.splashLogo} resizeMode="contain" />
        </Animated.View>
        <Animated.Text style={[styles.splashTagline, { opacity: splashFadeAnim }]}>
          Learn. Track. Assess. Succeed.
        </Animated.Text>
      </View>
    );
  }

  const handleLogin = async () => {
    setErrorMsg("");

    const username = loginId.trim();
    const cleanPassword = password.trim();

    if (!username || !cleanPassword) {
      setErrorMsg("Please enter Username / Email and Password.");
      return;
    }

    setLoading(true);

    try {
      const publicResult = await loginGuest(username, cleanPassword);

      if (publicResult.success) {
        router.replace("/dashboard" as any);
        return;
      }

      const result = await loginUser({
        username: username.toLowerCase(),
        password: cleanPassword,
        user_type: "student",
      });

      if (!result.success) {
        setErrorMsg(result.error || "Invalid username/email or password.");
        return;
      }

      const user = result.data;

      await AsyncStorage.setItem("student_id", user.student_id || "");
      await AsyncStorage.setItem("student_pk", String(user.student_pk || ""));
      await AsyncStorage.setItem("student_name", user.name || "");

      router.replace("/dashboard" as any);
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const sendForgotOtp = async () => {
    const email = forgotEmail.trim().toLowerCase();
    setForgotMessage("");

    if (!email) {
      setForgotMessage("Please enter your registered email.");
      return;
    }

    setForgotLoading(true);
    const result = await requestPasswordResetOtp(email);
    setForgotLoading(false);

    if (!result.success) {
      setForgotMessage(result.error || "Unable to send OTP.");
      return;
    }

    setForgotStep("reset");
    setForgotMessage("OTP sent to your registered email.");
  };

  const resetForgotPassword = async () => {
    setForgotMessage("");

    if (!forgotOtp.trim() || !forgotPassword.trim() || !forgotConfirm.trim()) {
      setForgotMessage("Please enter OTP and new password.");
      return;
    }

    if (forgotPassword !== forgotConfirm) {
      setForgotMessage("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    const result = await resetStudentPassword(forgotEmail, forgotOtp, forgotPassword);
    setForgotLoading(false);

    if (!result.success) {
      setForgotMessage(result.error || "Unable to reset password.");
      return;
    }

    setShowForgot(false);
    setForgotStep("email");
    setPassword("");
    setForgotOtp("");
    setForgotPassword("");
    setForgotConfirm("");
    setErrorMsg("Password reset successful. Login with your new password.");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <Animated.View
          style={[
            styles.formCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: formSlideAnim }],
            },
          ]}
        >
          <View style={styles.logoPanel}>
            <Image source={appLogo} style={styles.cardLogo} resizeMode="contain" />
          </View>

          <ThemedText style={styles.titleText}>
            {loading ? "Signing in..." : "Welcome to IIE Pulse"}
          </ThemedText>

          <ThemedText style={styles.subTitle}>
            Login to continue your learning dashboard
          </ThemedText>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#5523D2" />
            <TextInput
              style={styles.input}
              placeholder="Username / Email"
              placeholderTextColor="#9CA3AF"
              value={loginId}
              onChangeText={setLoginId}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#5523D2" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#5523D2"
              />
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setShowForgot((value) => !value);
              setForgotMessage("");
              setForgotStep("email");
            }}
            disabled={loading}
            style={styles.forgotLink}
          >
            <ThemedText style={styles.forgotText}>Forgot password?</ThemedText>
          </Pressable>

          {showForgot ? (
            <View style={styles.forgotBox}>
              <ThemedText style={styles.forgotTitle}>Reset Student Password</ThemedText>
              {forgotStep === "email" ? (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#5523D2" />
                    <TextInput
                      style={styles.input}
                      placeholder="Registered email"
                      placeholderTextColor="#9CA3AF"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!forgotLoading}
                    />
                  </View>
                  <Pressable style={styles.forgotButton} onPress={sendForgotOtp} disabled={forgotLoading}>
                    <ThemedText style={styles.forgotButtonText}>
                      {forgotLoading ? "Sending..." : "Send OTP"}
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="key-outline" size={18} color="#5523D2" />
                    <TextInput
                      style={styles.input}
                      placeholder="OTP"
                      placeholderTextColor="#9CA3AF"
                      value={forgotOtp}
                      onChangeText={setForgotOtp}
                      keyboardType="number-pad"
                      editable={!forgotLoading}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#5523D2" />
                    <TextInput
                      style={styles.input}
                      placeholder="New password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      value={forgotPassword}
                      onChangeText={setForgotPassword}
                      editable={!forgotLoading}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#5523D2" />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      value={forgotConfirm}
                      onChangeText={setForgotConfirm}
                      editable={!forgotLoading}
                    />
                  </View>
                  <Pressable style={styles.forgotButton} onPress={resetForgotPassword} disabled={forgotLoading}>
                    <ThemedText style={styles.forgotButtonText}>
                      {forgotLoading ? "Resetting..." : "Reset Password"}
                    </ThemedText>
                  </Pressable>
                </>
              )}
              {forgotMessage ? <ThemedText style={styles.forgotMessage}>{forgotMessage}</ThemedText> : null}
            </View>
          ) : null}

          {errorMsg ? (
            <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
          ) : null}

          <Pressable
            onPress={handleLogin}
            style={styles.pressableBtn}
            disabled={loading}
          >
            <View style={[styles.loginBtn, loading && styles.loginBtnDisabled]}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <ThemedText style={styles.buttonText}>
                {loading ? "Signing in..." : "Login"}
              </ThemedText>
            </View>
          </Pressable>

          <TouchableOpacity
            onPress={() => router.push("/register" as any)}
            disabled={loading}
            style={styles.registerLink}
          >
            <ThemedText style={styles.registerText}>
              New user? Register here
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  splashScreen: {
    flex: 1,
    backgroundColor: "#F8F7FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  splashLogoWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5523D2",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  splashLogo: {
    width: "100%",
    maxWidth: 430,
    height: 360,
  },
  splashTagline: {
    color: "#5523D2",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginTop: 12,
  },
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  keyboard: {
    width: "100%",
    justifyContent: "center",
  },
  formCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#5523D2",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
    alignItems: "center",
  },
  logoPanel: {
    width: "100%",
    height: 174,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardLogo: {
    width: "94%",
    height: 160,
  },
  titleText: {
    color: "#1F1335",
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 6,
    textAlign: "center",
  },
  subTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 22,
    textAlign: "center",
  },
  modeTabs: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
    padding: 4,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  modeTab: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  modeTabActive: {
    backgroundColor: "#5523D2",
  },
  modeTabText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    width: "100%",
    backgroundColor: "#FBF9FF",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    marginLeft: 8,
    marginRight: 6,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 10,
  },
  forgotText: {
    color: "#5523D2",
    fontSize: 13,
    fontWeight: "800",
  },
  forgotBox: {
    width: "100%",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginBottom: 12,
  },
  forgotTitle: {
    color: "#1F1335",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  forgotButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#5523D2",
    alignItems: "center",
    justifyContent: "center",
  },
  forgotButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  forgotMessage: {
    color: "#5523D2",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    lineHeight: 17,
  },
  pressableBtn: {
    width: "100%",
    marginTop: 10,
  },
  loginBtn: {
    backgroundColor: "#5523D2",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 17,
    shadowColor: "#5523D2",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  registerLink: {
    marginTop: 18,
  },
  registerText: {
    color: "#5523D2",
    fontSize: 14,
    fontWeight: "700",
  },
});

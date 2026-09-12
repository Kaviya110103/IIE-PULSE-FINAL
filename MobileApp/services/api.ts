import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";

const PRODUCTION_API = "https://iiepulse.indrainstitute.com/api/";
const LOCAL_LAN_API = "https://iiepulse.indrainstitute.com/api/";
const DEFAULT_API = Platform.OS === "web" ? PRODUCTION_API : LOCAL_LAN_API;

function normalizeApiBaseUrl(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

function getEnvApiBaseUrl() {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!envApiUrl) {
    return "";
  }

  if (
    Platform.OS !== "web" &&
    (envApiUrl.includes("localhost") || envApiUrl.includes("127.0.0.1"))
  ) {
    return "";
  }

  return normalizeApiBaseUrl(envApiUrl);
}

function getApiBaseUrl() {
  const envApiUrl = getEnvApiBaseUrl();

  if (envApiUrl) {
    return envApiUrl;
  }

  if (Platform.OS !== "web") {
    return DEFAULT_API;
  }

  return DEFAULT_API;
}

const API_BASE_URL = getApiBaseUrl();
    
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function getCandidateApiBaseUrls() {
  const urls = new Set<string>();
  const envApiUrl = getEnvApiBaseUrl();

  if (envApiUrl) {
    urls.add(envApiUrl);
  }

  urls.add(API_BASE_URL);
  urls.add(LOCAL_LAN_API);
  urls.add(DEFAULT_API);

  return Array.from(urls).map(normalizeApiBaseUrl);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  
});
api.interceptors.request.use(async (config) => {
  const requestUrl = String(config.url || "");

  if (
    requestUrl.includes("auth/login/") ||
    requestUrl.includes("auth/otp/") ||
    requestUrl.includes("gallery/") ||
    requestUrl.includes("vlogs/") ||
    requestUrl.includes("news/") ||
    requestUrl.includes("calendar-events/") ||
    requestUrl.includes("quiz/practice/") ||
    requestUrl.includes("referrals/")
  ) {
    delete config.headers.Authorization;
    return config;
  }

  const token = await AsyncStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error?.response?.data?.code;
    const detail = String(error?.response?.data?.detail || "").toLowerCase();
    const isTokenError =
      errorCode === "token_not_valid" ||
      detail.includes("token not valid") ||
      detail.includes("given token not valid");

    if (isTokenError && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = await AsyncStorage.getItem("refresh_token");

      if (refresh) {
        try {
          const refreshResponse = await axios.post(`${API_BASE_URL}auth/refresh/`, { refresh });
          const newAccess = refreshResponse.data?.access;

          if (newAccess) {
            await AsyncStorage.setItem("access_token", newAccess);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          }
        } catch {
          // fall through to clear session
        }
      }
    }

    if (isTokenError) {
      await AsyncStorage.multiRemove([
        "access_token",
        "refresh_token",
        "student_id",
        "student_pk",
        "student_name",
      ]);
    }

    return Promise.reject(error);
  }
);

type LoginPayload = {
  username: string;
  password: string;
  user_type: "admin" | "employee" | "student";
};

type OtpSendPayload = {
  mobile_no: string;
};

type OtpVerifyPayload = {
  mobile_no: string;
  req_id: string;
  otp: string;
};

function getApiErrorMessage(error: any, fallback = "Request failed") {
  const data = error?.response?.data;
  const status = error?.response?.status;

  if (!data) {
    return error?.message || fallback;
  }

  if (typeof data === "string") {
    if (/<\/?[a-z][\s\S]*>/i.test(data) || data.includes("<!DOCTYPE")) {
      return status && status >= 500
        ? "Server setup error. Please run backend migrations and try again."
        : fallback;
    }
    return data;
  }

  if (data.error || data.detail) {
    return data.error || data.detail;
  }

  const firstValue = Object.values(data)[0];
  if (Array.isArray(firstValue)) {
    return String(firstValue[0] || fallback);
  }

  if (firstValue) {
    return String(firstValue);
  }

  return error?.message || fallback;
}

export type GuestRegistrationPayload = {
  name: string;
  email: string;
  mobile: string;
  qualification: string;
  pincode?: string;
  location: string;
  city?: string;
  state?: string;
  username: string;
  password: string;
};

export type GalleryItem = {
  id: number;
  title: string;
  image: string;
  created_at?: string;
};

export type VlogItem = {
  id: number;
  title: string;
  video: string;
  created_at?: string;
};

export type NewsItem = {
  id: number;
  title: string;
  message: string;
  image?: string | null;
  created_at?: string;
};

export type CalendarEvent = {
  id: number;
  event_name: string;
  event_date: string;
  event_time: string;
  message: string;
  created_at?: string;
};

export type ReferralPayload = {
  name: string;
  mobile: string;
};

const GUEST_USERS_KEY = "guest_users";
const GUEST_SESSION_KEY = "guest_session";

async function getGuestUsers(): Promise<GuestRegistrationPayload[]> {
  const storedUsers = await AsyncStorage.getItem(GUEST_USERS_KEY);

  if (!storedUsers) {
    return [];
  }

  try {
    const users = JSON.parse(storedUsers);
    return Array.isArray(users) ? users : [];
  } catch {
    await AsyncStorage.removeItem(GUEST_USERS_KEY);
    return [];
  }
}

async function postLoginWithFallback(payload: LoginPayload) {
  let lastNetworkError: any = null;
  const attemptedUrls: string[] = [];

  for (const baseUrl of getCandidateApiBaseUrls()) {
    attemptedUrls.push(baseUrl);

    try {
      const response = await axios.post(`${baseUrl}auth/login/`, payload, {
        timeout: 15000,
        headers: { "Content-Type": "application/json" },
      });

      api.defaults.baseURL = baseUrl;
      console.log("LOGIN API:", baseUrl);
      return response;
    } catch (error: any) {
      const isNetworkError =
        !error?.response && String(error?.message).toLowerCase() === "network error";

      if (!isNetworkError) {
        throw error;
      }

      lastNetworkError = error;
      error.apiBaseUrls = attemptedUrls;
      console.log("LOGIN API FAILED:", baseUrl, error?.message || "Network error");
    }
  }

  if (lastNetworkError) {
    lastNetworkError.apiBaseUrls = attemptedUrls;
  }

  throw lastNetworkError;
}

async function postOtpWithFallback(endpoint: string, payload: OtpSendPayload | OtpVerifyPayload) {
  let lastNetworkError: any = null;
  const attemptedUrls: string[] = [];

  for (const baseUrl of getCandidateApiBaseUrls()) {
    attemptedUrls.push(baseUrl);

    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
        timeout: 15000,
        headers: { "Content-Type": "application/json" },
      });

      api.defaults.baseURL = baseUrl;
      return response;
    } catch (error: any) {
      const isNetworkError =
        !error?.response && String(error?.message).toLowerCase() === "network error";

      if (!isNetworkError) {
        throw error;
      }

      lastNetworkError = error;
      error.apiBaseUrls = attemptedUrls;
    }
  }

  if (lastNetworkError) {
    lastNetworkError.apiBaseUrls = attemptedUrls;
  }

  throw lastNetworkError;
}

async function persistStudentSession(data: any) {
  if (data?.access) {
    await AsyncStorage.setItem("access_token", data.access);
  }

  if (data?.refresh) {
    await AsyncStorage.setItem("refresh_token", data.refresh);
  }

  await AsyncStorage.setItem("student_id", data?.student_id || "");
  await AsyncStorage.setItem("student_pk", String(data?.student_pk || ""));
  await AsyncStorage.setItem("student_name", data?.name || "");
}

export async function loginUser(payload: LoginPayload) {
  try {
    await AsyncStorage.multiRemove([
      GUEST_SESSION_KEY,
      "access_token",
      "refresh_token",
      "student_id",
      "student_pk",
      "student_name",
    ]);

    const response = await postLoginWithFallback(payload);
    const data = response.data;

    await persistStudentSession(data);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    const networkError =
      !error?.response && String(error?.message).toLowerCase() === "network error";
    const attemptedUrls = Array.isArray(error?.apiBaseUrls)
      ? error.apiBaseUrls.join(", ")
      : getCandidateApiBaseUrls().join(", ");

    return {
      success: false,
      error:
        (networkError &&
          `Cannot connect to backend. Tried: ${attemptedUrls}. Please start the backend server or set EXPO_PUBLIC_API_URL.`) ||
        getApiErrorMessage(error, "Login failed"),
      data: error?.response?.data,
    };
  }
}

function formatNetworkError(error: any, fallback: string) {
  const networkError =
    !error?.response && String(error?.message).toLowerCase() === "network error";
  const attemptedUrls = Array.isArray(error?.apiBaseUrls)
    ? error.apiBaseUrls.join(", ")
    : getCandidateApiBaseUrls().join(", ");

  return (
    (networkError &&
      `Cannot connect to backend. Tried: ${attemptedUrls}. Please start the backend server or set EXPO_PUBLIC_API_URL.`) ||
    getApiErrorMessage(error, fallback)
  );
}

export async function sendLoginOtp(mobileNo: string) {
  try {
    const response = await postOtpWithFallback("auth/otp/send/", { mobile_no: mobileNo });
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: formatNetworkError(error, "Unable to send OTP"),
      data: error?.response?.data,
    };
  }
}

export async function resendLoginOtp(mobileNo: string, reqId: string) {
  try {
    const response = await postOtpWithFallback("auth/otp/resend/", {
      mobile_no: mobileNo,
      req_id: reqId,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: formatNetworkError(error, "Unable to resend OTP"),
      data: error?.response?.data,
    };
  }
}

export async function verifyLoginOtp(mobileNo: string, reqId: string, otp: string) {
  try {
    await AsyncStorage.multiRemove([
      GUEST_SESSION_KEY,
      "access_token",
      "refresh_token",
      "student_id",
      "student_pk",
      "student_name",
    ]);

    const response = await postOtpWithFallback("auth/otp/verify/", {
      mobile_no: mobileNo,
      req_id: reqId,
      otp,
    });
    const data = response.data;

    await persistStudentSession(data);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: formatNetworkError(error, "Unable to verify OTP"),
      data: error?.response?.data,
    };
  }
}

export async function registerGuest(payload: GuestRegistrationPayload) {
  try {
    try {
      const response = await axios.post(`${API_BASE_URL}public-users/register/`, payload, {
        timeout: 8000,
        headers: { "Content-Type": "application/json" },
      });
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (serverError: any) {
      if (serverError?.response) {
        return {
          success: false,
          error: getApiErrorMessage(serverError, "Guest registration failed"),
        };
      }
    }

    const users = await getGuestUsers();
    const username = payload.username.trim().toLowerCase();
    const email = payload.email.trim().toLowerCase();

    const alreadyExists = users.some(
      (user) =>
        user.username.trim().toLowerCase() === username ||
        user.email.trim().toLowerCase() === email
    );

    if (alreadyExists) {
      return {
        success: false,
        error: "Username or email already registered.",
      };
    }

    const guestUser = {
      ...payload,
      username,
      email,
    };

    await AsyncStorage.setItem(
      GUEST_USERS_KEY,
      JSON.stringify([...users, guestUser])
    );

    return {
      success: true,
      data: guestUser,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Guest registration failed",
    };
  }
}

export async function loginGuest(usernameInput: string, passwordInput: string) {
  try {
    const loginId = usernameInput.trim().toLowerCase();
    const password = passwordInput.trim();

    try {
      const response = await axios.post(`${API_BASE_URL}public-users/login/`, {
        username: loginId,
        password,
      }, {
        timeout: 8000,
        headers: { "Content-Type": "application/json" },
      });
      const guestUser = response.data?.data || response.data;

      await AsyncStorage.multiRemove([
        "access_token",
        "refresh_token",
        "student_id",
        "student_pk",
        "student_name",
      ]);

      await AsyncStorage.setItem(
        GUEST_SESSION_KEY,
        JSON.stringify({
          username: guestUser.username,
          name: guestUser.name,
          email: guestUser.email,
          mobile: guestUser.mobile,
          user_type: "public",
        })
      );

      return {
        success: true,
        data: guestUser,
      };
    } catch (serverError: any) {
      if (serverError?.response) {
        return {
          success: false,
          error: getApiErrorMessage(serverError, "Guest login failed"),
        };
      }
    }

    const users = await getGuestUsers();

    const guestUser = users.find(
      (user) =>
        (user.username.trim().toLowerCase() === loginId ||
          user.email.trim().toLowerCase() === loginId) &&
        user.password === password
    );

    if (!guestUser) {
      return {
        success: false,
        error: "Invalid username/email or password.",
      };
    }

    await AsyncStorage.multiRemove([
      "access_token",
      "refresh_token",
      "student_id",
      "student_pk",
      "student_name",
    ]);

    await AsyncStorage.setItem(
      GUEST_SESSION_KEY,
      JSON.stringify({
        username: guestUser.username,
        name: guestUser.name,
        email: guestUser.email,
        mobile: guestUser.mobile,
        user_type: "public",
      })
    );

    return {
      success: true,
      data: guestUser,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Guest login failed",
    };
  }
}

function normalizeList<T>(data: T[] | { results?: T[] }) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.results || [];
}

export function resolveMediaUrl(url?: string, apiBaseUrl = API_BASE_URL) {
  if (!url) {
    return "";
  }

  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/i, apiOrigin);
  }

  return `${apiOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function submitReferral(payload: ReferralPayload) {
  let lastError = "";

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.post(`${baseUrl}referrals/`, payload, {
        timeout: 5000,
        headers: { "Content-Type": "application/json" },
      });

      console.log("REFERRAL SUBMITTED API:", baseUrl);
      return { success: true, data: response.data };
    } catch (error: any) {
      lastError = getApiErrorMessage(error);
      console.log("REFERRAL SUBMIT FAILED:", baseUrl, lastError);
    }
  }

  return {
    success: false,
    error: lastError || "Could not submit referral.",
  };
}

async function fetchListWithFallback<T>(
  endpoint: string,
  label: string,
  mapItem: (item: T, baseUrl: string) => T
) {
  let firstEmptyResult: { items: T[]; baseUrl: string } | null = null;
  const errors: string[] = [];

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, { timeout: 5000 });
      const items = normalizeList<T>(response.data).map((item) =>
        mapItem(item, baseUrl)
      );

      console.log(`PUBLIC HOME ${label} TRY:`, baseUrl, items.length);

      if (items.length) {
        return { items, baseUrl, error: "" };
      }

      if (!firstEmptyResult) {
        firstEmptyResult = { items, baseUrl };
      }
    } catch (error: any) {
      const message = `${baseUrl} - ${getApiErrorMessage(error)}`;
      errors.push(message);
      console.log(`PUBLIC HOME ${label} TRY FAILED:`, message);
    }
  }

  if (firstEmptyResult) {
    return { ...firstEmptyResult, error: "" };
  }

  return {
    items: [],
    baseUrl: API_BASE_URL,
    error: errors.length ? `${label} not loaded: ${errors.join(", ")}` : `${label} not loaded`,
  };
}

export async function getCalendarEvents() {
  const result = await fetchListWithFallback<CalendarEvent>(
    "calendar-events/",
    "CALENDAR",
    (item) => item
  );

  return {
    success: !result.error,
    data: result.items,
    error: result.error,
  };
}

export async function getPublicHomeContent() {
  try {
    const [galleryResult, vlogResult, newsResult, calendarResult] =
      await Promise.allSettled([
      fetchListWithFallback<GalleryItem>("gallery/", "GALLERY", (item, baseUrl) => ({
        ...item,
        image: resolveMediaUrl(item.image, baseUrl),
      })),
      fetchListWithFallback<VlogItem>("vlogs/", "VLOGS", (item, baseUrl) => ({
        ...item,
        video: resolveMediaUrl(item.video, baseUrl),
      })),
      fetchListWithFallback<NewsItem>("news/", "NEWS", (item, baseUrl) => ({
        ...item,
        image: item.image ? resolveMediaUrl(item.image, baseUrl) : item.image,
      })),
      fetchListWithFallback<CalendarEvent>("calendar-events/", "CALENDAR", (item) => item),
    ]);

    const gallery =
      galleryResult.status === "fulfilled" ? galleryResult.value.items : [];
    const vlogs =
      vlogResult.status === "fulfilled" ? vlogResult.value.items : [];
    const news = newsResult.status === "fulfilled" ? newsResult.value.items : [];
    const calendarEvents =
      calendarResult.status === "fulfilled" ? calendarResult.value.items : [];
    const errors = [
      galleryResult.status === "fulfilled"
        ? galleryResult.value.error
        : `Gallery not loaded: ${getApiErrorMessage(galleryResult.reason)}`,
      vlogResult.status === "fulfilled"
        ? vlogResult.value.error
        : `Vlogs not loaded: ${getApiErrorMessage(vlogResult.reason)}`,
      newsResult.status === "fulfilled"
        ? newsResult.value.error
        : `News not loaded: ${getApiErrorMessage(newsResult.reason)}`,
      calendarResult.status === "fulfilled"
        ? calendarResult.value.error
        : `Calendar not loaded: ${getApiErrorMessage(calendarResult.reason)}`,
    ].filter(Boolean);

    console.log("PUBLIC HOME API:", API_BASE_URL);
    console.log("PUBLIC HOME GALLERY COUNT:", gallery.length);
    console.log("PUBLIC HOME VLOGS COUNT:", vlogs.length);
    console.log("PUBLIC HOME NEWS COUNT:", news.length);
    console.log("PUBLIC HOME CALENDAR COUNT:", calendarEvents.length);
    if (errors.length) {
      console.log("PUBLIC HOME ERRORS:", errors.join(" | "));
    }

    return {
      success: true,
      error: "",
      data: {
        gallery,
        news,
        vlogs,
        calendarEvents,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: getApiErrorMessage(error),
      data: {
        gallery: [],
        news: [],
        vlogs: [],
        calendarEvents: [],
      },
    };
  }
}

export default api;

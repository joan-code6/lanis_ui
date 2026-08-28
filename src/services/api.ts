import {
  SchoolListResponse,
  DistrictSchoolsResponse,
  SchoolSearchResponse,
  SchoolSearchResult,
} from '../types';
import { getMockResponse } from '../components/demo/mockApi';
import { getApiBaseUrl } from '../utils/backendConfig';
// School List API
const SCHOOL_CACHE_KEY = 'school_cache';
const SCHOOL_CACHE_TTL = 24 * 60 * 60 * 1000;

interface CachedSchoolData {
  data: SchoolListResponse;
  timestamp: number;
}

function getCachedSchoolData(): SchoolListResponse | null {
  const cached = localStorage.getItem(SCHOOL_CACHE_KEY);
  if (!cached) return null;
  try {
    const parsed: CachedSchoolData = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > SCHOOL_CACHE_TTL) {
      localStorage.removeItem(SCHOOL_CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedSchoolData(data: SchoolListResponse): void {
  const cached: CachedSchoolData = { data, timestamp: Date.now() };
  localStorage.setItem(SCHOOL_CACHE_KEY, JSON.stringify(cached));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const prev: number[] = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const curr: number[] = Array(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;

  if (t.includes(q)) return q.length / t.length + 1;

  const qTokens = q.split(/\s+/);
  const tTokens = t.split(/\s+/);

  let total = 0;
  for (const qToken of qTokens) {
    let best = 0;
    for (const tToken of tTokens) {
      if (tToken === qToken) {
        best = Math.max(best, 1);
      } else if (tToken.includes(qToken)) {
        best = Math.max(best, 0.7);
      } else if (qToken.includes(tToken)) {
        best = Math.max(best, 0.5);
      } else {
        const dist = levenshtein(qToken, tToken);
        const maxLen = Math.max(qToken.length, tToken.length);
        if (dist <= 2 && dist / maxLen <= 0.5) {
          best = Math.max(best, 0.3 * (1 - dist / maxLen));
        }
      }
    }
    total += best;
  }
  return total / qTokens.length;
}

export const schoolListAPI = {
  async getAllSchools(signal?: AbortSignal): Promise<SchoolListResponse> {
    const cached = getCachedSchoolData();
    if (cached) return cached;
    const response = await apiClient.get<SchoolListResponse>('/school-list', { signal });
    if (response.data.success) {
      setCachedSchoolData(response.data);
    }
    return response.data;
  },

  async getSchoolsByDistrict(districtId: string): Promise<DistrictSchoolsResponse> {
    const response = await apiClient.get<DistrictSchoolsResponse>(`/school-list/district/${districtId}`);
    return response.data;
  },

  async searchSchools(query: string): Promise<SchoolSearchResponse> {
    const allSchools = await schoolListAPI.getAllSchools();
    const q = query.trim();
    if (!q) {
      return { success: true, query, count: 0, results: [] };
    }
    const scored: { result: SchoolSearchResult; score: number }[] = [];
    for (const district of allSchools.districts) {
      for (const school of district.schools) {
        const s1 = fuzzyScore(q, school.name);
        const s2 = fuzzyScore(q, school.location);
        const bestScore = Math.max(s1, s2);
        if (bestScore > 0) {
          scored.push({
            result: { district_id: district.id, district_name: district.name, school },
            score: bestScore,
          });
        }
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return {
      success: true,
      query,
      count: scored.length,
      results: scored.map(s => s.result),
    };
  },
};
import axios, { AxiosInstance } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  User,
  ModulesResponse,
  AppsResponse,
  MessagesResponse,
  ConversationResponse,
  SearchResponse,
  SendMessageRequest,
  SendMessageResponse,
  ReplyMessageRequest,
  ReplyMessageResponse,
  MarkReadRequest,
  MarkReadResponse,
  CoursesResponse,
  AttendanceOverviewResponse,
  CourseDetailsResponse,
  EntryDetailsResponse,
  WeeklyViewResponse,
  SubmissionsResponse,
  HealthResponse,
  CalendarOverviewResponse,
  CalendarEventsResponse,
  SingleCalendarEventResponse,
  DSBLoginRequest,
  DSBLoginResponse,
  DSBPlanUrlsResponse,
  DSBPlanResponse,
  TimetableResponse,
  TimetableDay,
  CustomLesson,
  CustomLessonsResponse,
  ClassLinksResponse,
  StudyGroupsResponse,
  NotificationConfigResponse,
  NotificationPreferences,
  NotificationPreferencesResponse,
  VertretungsplanNotificationOptionsResponse,
  PushSubscriptionPayload,
  UserPreferencesPatch,
  UserPreferencesResponse,
} from '../types';

// Configuration
export const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_KEY = 'auth_expires_at';

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function isTokenExpiringSoon(thresholdMs: number = 5 * 60 * 1000): boolean {
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
  if (!expiresAt) return true;
  return Date.now() > parseInt(expiresAt, 10) - thresholdMs;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) return false;

  try {
    const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
      refresh_token: refreshTokenValue,
    } as TokenRefreshRequest);

    const expiresAt = Date.now() + response.data.expires_in * 1000;
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());

    return true;
  } catch {
    return false;
  }
}

async function ensureValidToken(): Promise<string | null> {
  if (isTokenExpiringSoon()) {
    // Deduplicate concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const success = await refreshPromise;
    if (!success) return null;
  }
  return getAccessToken();
}

export const authAPI = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/login', credentials);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<TokenRefreshResponse> {
    const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    } as TokenRefreshRequest);
    return response.data;
  },

  async logout(token: string): Promise<{ status: string }> {
    const response = await apiClient.post<{ status: string }>('/logout', {}, {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async getUserProfile(token: string, signal?: AbortSignal): Promise<{ success: boolean; data: User }> {
    const response = await apiClient.get<{ success: boolean; data: User }>('/benutzer', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health', { signal });
    return response.data;
  },
};

// Apps and Modules API
export const appsAPI = {
  async getModules(token: string, signal?: AbortSignal): Promise<ModulesResponse> {
    const response = await apiClient.get<ModulesResponse>('/modules', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getApps(token: string, signal?: AbortSignal): Promise<AppsResponse> {
    const response = await apiClient.get<AppsResponse>('/apps', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },
};

// Messages API
export const messagesAPI = {
  async getMessageHeaders(
    token: string,
    getType: string = 'All',
    last: number = 0,
    signal?: AbortSignal,
  ): Promise<MessagesResponse> {
    const response = await apiClient.get<MessagesResponse>('/nachrichten/headers', {
      headers: { 'X-Session-Token': token },
      params: { get_type: getType, last },
      signal,
    });
    return response.data;
  },

  async getConversation(
    token: string,
    conversationId: string,
    last: number = 0,
    signal?: AbortSignal,
  ): Promise<ConversationResponse> {
    const response = await apiClient.get<ConversationResponse>(
      `/nachrichten/${conversationId}`,
      {
        headers: { 'X-Session-Token': token },
        params: { last },
        signal,
      }
    );
    return response.data;
  },

  async searchRecipients(token: string, query: string, signal?: AbortSignal): Promise<SearchResponse> {
    const response = await apiClient.get<SearchResponse>('/nachrichten/search', {
      headers: { 'X-Session-Token': token },
      params: { q: query },
      signal,
    });
    return {
      ...response.data,
      results: response.data.results || response.data.users || [],
    };
  },

  async sendMessage(token: string, message: SendMessageRequest, signal?: AbortSignal): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>('/nachrichten/send', message, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async replyMessage(token: string, reply: ReplyMessageRequest, signal?: AbortSignal): Promise<ReplyMessageResponse> {
    const response = await apiClient.post<ReplyMessageResponse>('/nachrichten/reply', reply, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async markRead(token: string, data: MarkReadRequest, signal?: AbortSignal): Promise<MarkReadResponse> {
    const response = await apiClient.post<MarkReadResponse>('/nachrichten/mark-read', data, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },
};

// Browser push notification API
export const notificationsAPI = {
  async getConfig(token: string, signal?: AbortSignal): Promise<NotificationConfigResponse> {
    const response = await apiClient.get<NotificationConfigResponse>('/notifications/config', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getPreferences(token: string, signal?: AbortSignal): Promise<NotificationPreferencesResponse> {
    const response = await apiClient.get<NotificationPreferencesResponse>('/notifications/preferences', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async updatePreferences(token: string, preferences: NotificationPreferences): Promise<NotificationPreferencesResponse> {
    const response = await apiClient.put<NotificationPreferencesResponse>('/notifications/preferences', preferences, {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async getVertretungsplanOptions(
    token: string,
    signal?: AbortSignal,
  ): Promise<VertretungsplanNotificationOptionsResponse> {
    const response = await apiClient.get<VertretungsplanNotificationOptionsResponse>(
      '/notifications/vertretungsplan/options',
      { headers: { 'X-Session-Token': token }, signal },
    );
    return response.data;
  },

  async registerSubscription(token: string, subscription: PushSubscriptionPayload): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/notifications/subscription', subscription, {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async unregisterSubscription(token: string, endpoint: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/notifications/unsubscribe', { endpoint }, {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async sendTest(token: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/notifications/test', {}, {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },
};

export async function unsubscribeBrowserPushSubscription(
  subscription?: PushSubscription | null,
): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const currentSubscription = subscription ?? await registration?.pushManager.getSubscription();
  if (currentSubscription) await currentSubscription.unsubscribe();
}

// Courses API
export const coursesAPI = {
  async getCourses(token: string, signal?: AbortSignal): Promise<CoursesResponse> {
    const response = await apiClient.get<CoursesResponse>('/meinunterricht', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getAttendanceOverview(token: string, signal?: AbortSignal): Promise<AttendanceOverviewResponse> {
    const response = await apiClient.get<AttendanceOverviewResponse>('/meinunterricht/attendance', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getCourseDetails(token: string, courseId: string, signal?: AbortSignal): Promise<CourseDetailsResponse> {
    const response = await apiClient.get<CourseDetailsResponse>(`/meinunterricht/course/${courseId}`, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getEntryDetails(token: string, url: string, signal?: AbortSignal): Promise<EntryDetailsResponse> {
    const response = await apiClient.get<EntryDetailsResponse>('/meinunterricht/entry', {
      headers: { 'X-Session-Token': token },
      params: { url },
      signal,
    });
    return response.data;
  },

  async getWeeklyView(token: string, signal?: AbortSignal): Promise<WeeklyViewResponse> {
    const response = await apiClient.get<WeeklyViewResponse>('/meinunterricht/weekly', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getSubmissions(token: string, signal?: AbortSignal): Promise<SubmissionsResponse> {
    const response = await apiClient.get<SubmissionsResponse>('/meinunterricht/submissions', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async toggleHomework(token: string, courseId: string, entryId: string, done: boolean, signal?: AbortSignal): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('course_id', courseId);
    params.append('entry_id', entryId);
    params.append('done', String(done));
    const response = await apiClient.post<{ success: boolean }>(
      '/meinunterricht/homework-done',
      params,
      {
        headers: {
          'X-Session-Token': token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal,
      }
    );
    return response.data;
  },
};

// Calendar API
export const calendarAPI = {
  async getOverview(token: string, signal?: AbortSignal): Promise<CalendarOverviewResponse> {
    const response = await apiClient.get<CalendarOverviewResponse>('/kalender', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getEvents(
    token: string,
    options: {
      year?: number;
      start?: string;
      category?: string;
      search?: string;
      target?: string;
      view_id?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<CalendarEventsResponse> {
    const response = await apiClient.get<CalendarEventsResponse>('/kalender/events', {
      headers: { 'X-Session-Token': token },
      params: options,
      signal,
    });
    return response.data;
  },

  async getEvent(token: string, eventId: string, viewId?: string, signal?: AbortSignal): Promise<SingleCalendarEventResponse> {
    const response = await apiClient.get<SingleCalendarEventResponse>(`/kalender/event/${eventId}`, {
      headers: { 'X-Session-Token': token },
      params: { view_id: viewId },
      signal,
    });
    return response.data;
  },
};

// Timetable API
export const timetableAPI = {
  async getTimetable(token: string, signal?: AbortSignal): Promise<TimetableResponse> {
    const response = await apiClient.get<any>('/stundenplan', {
      headers: { 'X-Session-Token': token },
      signal,
    });

    const data = response.data;
    if (!data?.success) {
      return { success: false, days: [], message: data?.error || data?.message || 'Der Stundenplan konnte nicht geladen werden.' };
    }

    // Demo responses and future API versions may already use the UI shape.
    if (Array.isArray(data.days) && data.days.every((day: any) => day && Array.isArray(day.lessons))) {
      return data as TimetableResponse;
    }

    const monday = data.week_start
      ? new Date(`${data.week_start}T12:00:00`)
      : new Date();
    if (!data.week_start) {
      const day = monday.getDay();
      monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    }
    const weekMatch = String(data.week_badge || '').toUpperCase().match(/\b([AB])\b/);
    const activeWeek = weekMatch?.[1] as 'A' | 'B' | undefined;
    const mapPlan = (plan: any[]) => (Array.isArray(data.days) ? data.days : []).map((name: string, index: number) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        date: date.toISOString().slice(0, 10),
        name,
        lessons: (Array.isArray(plan?.[index]) ? plan[index] : [])
          .map((lesson: any) => ({
          id: lesson.id,
          period: lesson.duration > 1
            ? `${lesson.stunde}–${lesson.stunde + lesson.duration - 1}`
            : lesson.stunde,
          start_time: lesson.start_time ? `${String(lesson.start_time.hour).padStart(2, '0')}:${String(lesson.start_time.minute).padStart(2, '0')}` : undefined,
          end_time: lesson.end_time ? `${String(lesson.end_time.hour).padStart(2, '0')}:${String(lesson.end_time.minute).padStart(2, '0')}` : undefined,
          subject: lesson.name || 'Unterricht',
          teacher: lesson.teacher,
          room: lesson.room,
          class_name: lesson.class_name,
          info: lesson.info || (lesson.badge && !['A', 'B'].includes(lesson.badge) ? lesson.badge : undefined),
          week_type: ['A', 'B'].includes(lesson.badge) ? lesson.badge : undefined,
          duration: lesson.duration || 1,
          course_id: lesson.course_id,
          course_name: lesson.course_name,
          homework: Array.isArray(lesson.homework) ? lesson.homework : undefined,
        })),
      };
    });
    const allDays = mapPlan(data.template_plan_for_all || data.plan_for_all || []);
    const mappedPersonalDays = mapPlan(data.template_plan_for_own || data.plan_for_own || []);
    const personalDays = mappedPersonalDays.some((dayEntry: TimetableDay) => dayEntry.lessons.length) ? mappedPersonalDays : allDays;
    const timeSlots = (Array.isArray(data.hours) ? data.hours : []).map((slot: any, index: number) => {
      const labelPeriod = Number.parseInt(String(slot.label || '').match(/\d+/)?.[0] || '', 10);
      return {
        period: Number.isFinite(labelPeriod) ? labelPeriod : index,
        start_time: `${String(slot.start_time?.hour ?? '').padStart(2, '0')}:${String(slot.start_time?.minute ?? '').padStart(2, '0')}`,
        end_time: `${String(slot.end_time?.hour ?? '').padStart(2, '0')}:${String(slot.end_time?.minute ?? '').padStart(2, '0')}`,
      };
    });

    return {
      success: true,
      week_start: data.week_start || personalDays[0]?.date,
      week_end: personalDays[personalDays.length - 1]?.date,
      days: personalDays,
      active_week: activeWeek,
      personal_days: personalDays,
      all_days: allDays,
      time_slots: timeSlots,
      custom_lessons: Array.isArray(data.custom_lessons) ? data.custom_lessons : undefined,
    };
  },
};

// Account-specific timetable and class-link overrides
export const settingsAPI = {
  async getPreferences(token: string, signal?: AbortSignal): Promise<UserPreferencesResponse> {
    const response = await apiClient.get<UserPreferencesResponse>('/settings/preferences', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async updatePreferences(token: string, preferences: UserPreferencesPatch, signal?: AbortSignal): Promise<UserPreferencesResponse> {
    const response = await apiClient.patch<UserPreferencesResponse>(
      '/settings/preferences',
      preferences,
      { headers: { 'X-Session-Token': token }, signal },
    );
    return response.data;
  },

  async getCustomLessons(token: string, signal?: AbortSignal): Promise<CustomLessonsResponse> {
    const response = await apiClient.get<CustomLessonsResponse>('/settings/timetable/lessons', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async saveCustomLesson(token: string, lesson: CustomLesson, signal?: AbortSignal): Promise<{ success: boolean; lesson: CustomLesson }> {
    const response = await apiClient.put<{ success: boolean; lesson: CustomLesson }>(
      '/settings/timetable/lessons',
      lesson,
      { headers: { 'X-Session-Token': token }, signal },
    );
    return response.data;
  },

  async deleteCustomLesson(token: string, date: string, period: string, signal?: AbortSignal): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>('/settings/timetable/lessons', {
      headers: { 'X-Session-Token': token },
      params: { date, period },
      signal,
    });
    return response.data;
  },

  async getClassLinks(token: string, signal?: AbortSignal): Promise<ClassLinksResponse> {
    const response = await apiClient.get<ClassLinksResponse>('/settings/class-links', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async saveClassLink(token: string, courseId: string, url: string, signal?: AbortSignal): Promise<{ success: boolean; link: { course_id: string; url: string; overridden: boolean } }> {
    const response = await apiClient.put<{ success: boolean; link: { course_id: string; url: string; overridden: boolean } }>(
      '/settings/class-links',
      { course_id: courseId, url },
      { headers: { 'X-Session-Token': token }, signal },
    );
    return response.data;
  },

  async deleteClassLink(token: string, courseId: string, signal?: AbortSignal): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>('/settings/class-links', {
      headers: { 'X-Session-Token': token },
      params: { course_id: courseId },
      signal,
    });
    return response.data;
  },
};

// Study Groups API
export const studyGroupsAPI = {
  async getStudyGroups(token: string, signal?: AbortSignal): Promise<StudyGroupsResponse> {
    const response = await apiClient.get<StudyGroupsResponse>('/lerngruppen', {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },
};

// DSB Mobile API
export const dsbAPI = {
  async login(token: string, credentials: DSBLoginRequest, signal?: AbortSignal): Promise<DSBLoginResponse> {
    const response = await apiClient.post<DSBLoginResponse>('/dsb/login', credentials, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getPlanUrls(token: string, credentials: DSBLoginRequest, signal?: AbortSignal): Promise<DSBPlanUrlsResponse> {
    const response = await apiClient.post<DSBPlanUrlsResponse>('/dsb/plan-urls', credentials, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },

  async getPlan(
    token: string,
    credentials: { username?: string; password?: string },
    options: { plan_index?: number; plan_url?: string; include_raw?: boolean } = {},
    signal?: AbortSignal,
  ): Promise<DSBPlanResponse> {
    const response = await apiClient.post<DSBPlanResponse>('/dsb/plan', {
      username: credentials.username,
      password: credentials.password,
      plan_index: options.plan_index ?? 0,
      plan_url: options.plan_url ?? null,
      include_raw: options.include_raw ?? false,
    }, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },
};

// Semantic Search API
export interface SemanticSearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  score: number;
}

export interface SemanticSearchResponse {
  success: boolean;
  query: string;
  results: SemanticSearchResult[];
  count: number;
}

export const searchAPI = {
  async semanticSearch(token: string, query: string, topK: number = 20, signal?: AbortSignal): Promise<SemanticSearchResponse> {
    const response = await apiClient.get<SemanticSearchResponse>('/search/semantic', {
      headers: { 'X-Session-Token': token },
      params: { q: query, top_k: topK },
      signal,
    });
    return response.data;
  },
};

// Request interceptor - mock all API calls in demo mode + auto-refresh token
apiClient.interceptors.request.use(
  async (config) => {
    // Demo mode: mock all responses
    if (localStorage.getItem('__demo_mode') === '1' && window.location.pathname.startsWith('/demo')) {
      config.adapter = (mockConfig: any) => {
        const mock = getMockResponse(mockConfig.url || '', mockConfig.method || 'get', mockConfig);
        return Promise.resolve({
          data: mock.data,
          status: mock.status,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          config: mockConfig,
          request: {},
        });
      };
      return config;
    }

    // Auto-refresh access token if it has an X-Session-Token header
    if (config.headers?.['X-Session-Token']) {
      const freshToken = await ensureValidToken();
      if (freshToken) {
        config.headers['X-Session-Token'] = freshToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 — try refresh once then redirect
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && localStorage.getItem('__demo_mode') !== '1') {
      // Don't try to refresh if the request was already to /auth/refresh
      const isRefreshRequest = error.config?.url === '/auth/refresh';

      if (!isRefreshRequest) {
        // Try refreshing the token once
        const refreshTokenValue = getRefreshToken();
        if (refreshTokenValue) {
          try {
            const refreshResponse = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
              refresh_token: refreshTokenValue,
            } as TokenRefreshRequest);

            const expiresAt = Date.now() + refreshResponse.data.expires_in * 1000;
            localStorage.setItem(ACCESS_TOKEN_KEY, refreshResponse.data.access_token);
            localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());

            // Retry the original request with the new token
            if (error.config) {
              error.config.headers['X-Session-Token'] = refreshResponse.data.access_token;
              return apiClient.request(error.config);
            }
          } catch {
            // Refresh failed, fall through to redirect
          }
        }
      }

      // Clear auth state and redirect to login
      try {
        await unsubscribeBrowserPushSubscription();
      } catch (cleanupError) {
        console.warn('Failed to remove push subscription after authentication loss:', cleanupError);
      }
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRES_KEY);
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

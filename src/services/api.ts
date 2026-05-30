import {
  SchoolListResponse,
  DistrictSchoolsResponse,
  SchoolSearchResponse,
  SchoolSearchResult,
} from '../types';
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
    const q = query.toLowerCase();
    const results: SchoolSearchResult[] = [];
    for (const district of allSchools.districts) {
      for (const school of district.schools) {
        if (school.name.toLowerCase().includes(q) || school.location.toLowerCase().includes(q)) {
          results.push({
            district_id: district.id,
            district_name: district.name,
            school,
          });
        }
      }
    }
    return {
      success: true,
      query,
      count: results.length,
      results,
    };
  },
};
import axios, { AxiosInstance } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  User,
  ModulesResponse,
  AppsResponse,
  MessagesResponse,
  ConversationResponse,
  SearchResponse,
  SendMessageRequest,
  SendMessageResponse,
  CoursesResponse,
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
} from '../types';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/login', credentials);
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
    return response.data;
  },

  async sendMessage(token: string, message: SendMessageRequest, signal?: AbortSignal): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>('/nachrichten/send', message, {
      headers: { 'X-Session-Token': token },
      signal,
    });
    return response.data;
  },
};

// Courses API
export const coursesAPI = {
  async getCourses(token: string, signal?: AbortSignal): Promise<CoursesResponse> {
    const response = await apiClient.get<CoursesResponse>('/meinunterricht', {
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

// Request interceptor to handle token automatically
apiClient.interceptors.request.use(
  (config) => {
    // You can add global request handling here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
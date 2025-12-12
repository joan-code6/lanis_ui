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

  async getUserProfile(token: string): Promise<{ success: boolean; data: User }> {
    const response = await apiClient.get<{ success: boolean; data: User }>('/benutzer', {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async checkHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },
};

// Apps and Modules API
export const appsAPI = {
  async getModules(token: string): Promise<ModulesResponse> {
    const response = await apiClient.get<ModulesResponse>('/modules', {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async getApps(token: string): Promise<AppsResponse> {
    const response = await apiClient.get<AppsResponse>('/apps', {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },
};

// Messages API
export const messagesAPI = {
  async getMessageHeaders(
    token: string,
    getType: string = 'All',
    last: number = 0
  ): Promise<MessagesResponse> {
    const response = await apiClient.get<MessagesResponse>('/nachrichten/headers', {
      headers: { 'X-Session-Token': token },
      params: { get_type: getType, last },
    });
    return response.data;
  },

  async getConversation(
    token: string,
    conversationId: string,
    last: number = 0
  ): Promise<ConversationResponse> {
    const response = await apiClient.get<ConversationResponse>(
      `/nachrichten/${conversationId}`,
      {
        headers: { 'X-Session-Token': token },
        params: { last },
      }
    );
    return response.data;
  },

  async searchRecipients(token: string, query: string): Promise<SearchResponse> {
    const response = await apiClient.get<SearchResponse>('/nachrichten/search', {
      headers: { 'X-Session-Token': token },
      params: { q: query },
    });
    return response.data;
  },

  async sendMessage(token: string, message: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>('/nachrichten/send', message, {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },
};

// Courses API
export const coursesAPI = {
  async getCourses(token: string): Promise<CoursesResponse> {
    const response = await apiClient.get<CoursesResponse>('/meinunterricht', {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async getCourseDetails(token: string, courseId: string): Promise<CourseDetailsResponse> {
    const response = await apiClient.get<CourseDetailsResponse>(`/meinunterricht/course/${courseId}`, {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async getEntryDetails(token: string, url: string): Promise<EntryDetailsResponse> {
    const response = await apiClient.get<EntryDetailsResponse>('/meinunterricht/entry', {
      headers: { 'X-Session-Token': token },
      params: { url },
    });
    return response.data;
  },

  async getWeeklyView(token: string): Promise<WeeklyViewResponse> {
    const response = await apiClient.get<WeeklyViewResponse>('/meinunterricht/weekly', {
      headers: { 'X-Session-Token': token },
    });
    return response.data;
  },

  async getSubmissions(token: string): Promise<SubmissionsResponse> {
    const response = await apiClient.get<SubmissionsResponse>('/meinunterricht/submissions', {
      headers: { 'X-Session-Token': token },
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
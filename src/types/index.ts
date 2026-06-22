// School List types
export interface School {
  id: string;
  name: string;
  location: string;
  district_id?: string;
  district_name?: string;
}

export interface District {
  id: string;
  name: string;
  schools: School[];
}

export interface SchoolListResponse {
  success: boolean;
  districts: District[];
}

export interface DistrictSchoolsResponse {
  success: boolean;
  district: District;
}

export interface SchoolSearchResult {
  district_id: string;
  district_name: string;
  school: School;
}

export interface SchoolSearchResponse {
  success: boolean;
  query: string;
  count: number;
  results: SchoolSearchResult[];
}
// Authentication types
export interface LoginRequest {
  school_id: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  school_id: string;
  username: string;
  encryption_ready: boolean;
  expires_in: number;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
}

export interface User {
  [key: string]: string;
}

// Module and App types
export interface Module {
  name: string;
  url: string;
  direct_url: string;
  proxy_app: boolean;
  color: string;
  logo: string;
  folders: string[];
  target: string;
}

export interface ModulesResponse {
  success: boolean;
  modules: Module[];
}

export interface AppFolder {
  name: string;
  logo: string;
  farbe: string;
}

export interface AppEntry {
  Name: string;
  Farbe: string;
  Logo: string;
  Ordner: string[];
  link: string;
  target: string;
}

export interface AppsResponse {
  success: boolean;
  data: {
    error: string;
    folders: AppFolder[];
    entrys: AppEntry[];
    till: number;
  };
}

// Message types
export interface MessageHeader {
  Id: string;
  Uniquid: string;
  Sender: string;
  Betreff: string;
  Papierkorb: string;
  private: number;
  WeitereEmpfaenger: string;
  empf: string[];
  unread: boolean;
  read?: boolean;
  date?: string;
  [key: string]: any;
}

export interface MessagesResponse {
  success: boolean;
  total: number;
  conversations: MessageHeader[];
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  date: string;
  [key: string]: any;
}

export interface ConversationResponse {
  success: boolean;
  conversation_id: string;
  messages: Message[];
}

export interface SearchResult {
  id: string;
  name: string;
  username: string;
  type: string;
  [key: string]: any;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
}

export interface SendMessageRequest {
  recipients: string[];
  subject: string;
  content: string;
}

export interface SendMessageResponse {
  success: boolean;
  message_id: string;
  sent_at: string;
}

export interface ReplyMessageRequest {
  conversation_id: string;
  body: string;
  to: string;
}

export interface ReplyMessageResponse {
  success: boolean;
  details: {
    back: boolean;
    id: string;
  };
}

export interface MarkReadRequest {
  conversation_id: string;
}

export interface MarkReadResponse {
  success: boolean;
}

// Course types
export interface CourseEntry {
  entry_id: string | null;
  book_id: string;
  name: string;
  course_link: string;
  teacher_full_name: string;
  teacher_short: string;
  teacher_message_link: string;
  thema: string;
  datum: string;
  homework: string;
  homework_done: boolean;
}

export interface CoursesResponse {
  success: boolean;
  entries: CourseEntry[];
  entry_count: number;
}

// Course entry in a course detail view
export interface CourseDetailEntry {
  entry_id: string;
  date: string;
  hours?: string;
  thema: string;
  homework: string;
  homework_done: boolean;
  attendance: string;
  files: EntryAttachment[];
  content?: string;
}

// Course details from API
export interface CourseDetails {
  course_id: string;
  course_name: string;
  semester: string;
  teacher_short: string;
  teacher_full: string;
  entries: CourseDetailEntry[];
  entry_count: number;
  exams?: string[];
  attendance_summary?: { [key: string]: string };
}

export interface CourseDetailsResponse {
  success: boolean;
  course_id: string;
  course_name: string;
  semester: string;
  teacher_short: string;
  teacher_full: string;
  entries: CourseDetailEntry[];
  entry_count: number;
  exams?: string[];
  attendance_summary?: { [key: string]: string };
}

export interface EntryAttachment {
  name: string;
  url: string;
  [key: string]: any;
}

export interface EntryDetails {
  id: string;
  title: string;
  content: string;
  date: string;
  attachments: EntryAttachment[];
}

export interface EntryDetailsResponse {
  success: boolean;
  entry: EntryDetails;
}

export interface WeeklyEntry {
  date: string;
  course: string;
  entry: string;
  url: string;
  [key: string]: any;
}

export interface WeeklyViewResponse {
  success: boolean;
  week: {
    start_date: string;
    entries: WeeklyEntry[];
  };
}

export interface Submission {
  id: string;
  title: string;
  course: string;
  due_date: string;
  status: string;
  url: string;
  [key: string]: any;
}

export interface SubmissionsResponse {
  success: boolean;
  submissions: Submission[];
}

// Common types
export interface ApiError {
  detail: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

export interface HealthResponse {
  status: string;
}

// Calendar types
export interface CalendarCategory {
  id: number;
  name: string;
  color: string;
  logo: string;
}

export interface CalendarGroup {
  id: number;
  name: string;
}

export interface CalendarMeta {
  first_id: string;
  new_events_count: string;
  can_write: boolean;
  key: string;
  public_view: boolean;
  institution: string;
  is_admin: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  category: string;
  category_name?: string;
  category_color?: string;
  description: string;
  start: string;
  end: string;
  all_day: boolean;
  new: string;
  editable: boolean;
  properties: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface CalendarOverviewResponse {
  success: boolean;
  page_title: string;
  calendar: CalendarMeta;
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  export_links: { label: string; url: string }[];
}

export interface CalendarEventsResponse {
  success: boolean;
  events: CalendarEvent[];
  count: number;
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  filters: {
    year: number;
    start: string;
    category: string;
    search: string;
    target: string;
    view_id: string;
  };
  raw: Record<string, unknown>;
}

export interface SingleCalendarEventResponse {
  success: boolean;
  event: Record<string, unknown>;
  filters: {
    event_id: string;
    view_id: string;
  };
}

// DSB Mobile types
export interface DSBLoginRequest {
  username: string;
  password: string;
}

export interface DSBLoginResponse {
  success: boolean;
  session_cookie?: string;
  session_id?: string;
  response_url?: string;
  error?: string;
}

export interface DSBPlanUrlsResponse {
  success: boolean;
  plan_urls: string[];
  html_plan_url?: string;
  menu_items: string[];
  count: number;
  error?: string;
}

export interface DSBPlanTable {
  caption: string;
  headers: string[];
  rows: Record<string, string>[] | string[][];
  date?: string | null;
}

export interface DSBPlanResponse {
  success: boolean;
  plan_url?: string;
  title?: string;
  tables: DSBPlanTable[];
  raw_html?: string | null;
  error?: string;
}
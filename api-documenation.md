# Schulportal Hessen API Documentation

## Overview

The Schulportal Hessen API is a FastAPI wrapper around the `SchulportalHessenAPI` class that provides HTTP endpoints to interact with the Schulportal Hessen (Hessian School Portal) system. It supports multiple concurrent users with session-based authentication and a token-based system.

**Base URL:** `{api-endpoint}` variable definded in the deployment environment. 

**Run locally:**
```bash
uvicorn api:app --reload
```

---

## Authentication

### Session Management

The API uses token-based session management to support multiple concurrent users:

- **Session Creation:** On successful login, a unique session token is generated
- **Session Duration:** Sessions expire after 60 minutes of inactivity (TTL: 3600 seconds)
- **Token Usage:** Include the token in the `X-Session-Token` header for all authenticated requests
- **Session Cleanup:** Sessions are automatically purged on expiration or can be manually terminated via logout

### Headers

All authenticated requests require the following header:

```
X-Session-Token: {token}
```

---

## Endpoints

### Authentication

#### POST `/login`

Authenticate a user and create a new session.

**Request Body:**
```json
{
  "school_id": "1234",
  "username": "john.doe",
  "password": "your_password"
}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `school_id` | string | Schul-ID (e.g., 1234) |
| `username` | string | Username without school prefix |
| `password` | string | User password |

**Response:**
```json
{
  "token": "abc123def456...",
  "school_id": "1234",
  "username": "john.doe",
  "encryption_ready": true
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Session token to use for subsequent requests |
| `school_id` | string | School ID of the logged-in user |
| `username` | string | Username of the logged-in user |
| `encryption_ready` | boolean | Indicates if encryption is ready for the session |

**Status Codes:**
- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials

---

#### POST `/logout`

Terminate the current session.

**Headers:**
- `X-Session-Token: {token}` (required)

**Response:**
```json
{
  "status": "logged_out"
}
```

**Status Codes:**
- `200 OK` - Logout successful
- `401 Unauthorized` - Invalid or expired session token

---

### System

#### GET `/health`

Check the health status of the API.

**Response:**
```json
{
  "status": "ok"
}
```

**Status Codes:**
- `200 OK` - API is operational

---

### User Information

#### GET `/benutzer`

Retrieve the currently logged-in user's profile information.

**Headers:**
- `X-Session-Token: {token}` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "{username}": "...",
    "{firstname}": "...",
    "{lastname}": "...",
    "{email}": "...",
    "..."
  }
}
```

**Status Codes:**
- `200 OK` - User data retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

### Available Modules & Apps

#### GET `/modules`

Retrieve all available modules for the current user.

**Headers:**
- `X-Session-Token: {token}` (required)

**Response:**
```json
{
  "success": true,
  "modules": [
    {
      "name": "{module_name}",
      "url": "{module_url}",
      "color": "{color_code}",
      "logo": "{logo_class}",
      "folders": ["{folder_name}"],
      "target": "{target}"
    },
    "..."
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `modules` | array | List of available modules |
| `modules[].name` | string | Name of the module |
| `modules[].url` | string | URL to access the module |
| `modules[].color` | string | Color code for the module |
| `modules[].logo` | string | CSS class for the module icon |
| `modules[].folders` | array | List of folders the module belongs to |
| `modules[].target` | string | Link target (_blank or _self) |

**Status Codes:**
- `200 OK` - Modules retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

#### GET `/apps`

Retrieve all available apps for the current user.

**Headers:**
- `X-Session-Token: {token}` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "error": "0",
    "folders": [
      {
        "name": "{folder_name}",
        "logo": "{logo_class}",
        "farbe": "{color_code}"
      },
      "..."
    ],
    "entrys": [
      {
        "Name": "{app_name}",
        "Farbe": "{color_code}",
        "Logo": "{logo_class}",
        "Ordner": ["{folder_name}"],
        "link": "{app_link}",
        "target": "{target}"
      },
      "..."
    ],
    "till": {timestamp}
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `data` | object | Container for app data |
| `data.error` | string | Error code (0 for success) |
| `data.folders` | array | List of available folders |
| `data.folders[].name` | string | Name of the folder |
| `data.folders[].logo` | string | CSS class for the folder icon |
| `data.folders[].farbe` | string | Color code for the folder |
| `data.entrys` | array | List of available apps/entries |
| `data.entrys[].Name` | string | Name of the app |
| `data.entrys[].Farbe` | string | Color code for the app |
| `data.entrys[].Logo` | string | CSS class for the app icon |
| `data.entrys[].Ordner` | array | List of folders the app belongs to |
| `data.entrys[].link` | string | Link to the app |
| `data.entrys[].target` | string | Link target (_blank or _self) |
| `data.till` | integer | Timestamp until the data is valid |

**Status Codes:**
- `200 OK` - Apps retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

### Messages (Nachrichten)

#### GET `/nachrichten/headers`

Retrieve message headers/list of conversations.

**Headers:**
- `X-Session-Token: {token}` (required)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `get_type` | string | "All" | Filter type: "All", "Unread", "Sent", etc. |
| `last` | integer | 0 | ID of the last message to start pagination from |

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "{conversation_id}",
      "sender": "{sender_username}",
      "subject": "{subject}",
      "date": "{date}",
      "unread": true,
      "..."
    },
    "..."
  ]
}
```

**Status Codes:**
- `200 OK` - Message headers retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

#### GET `/nachrichten/{conversation_id}`

Retrieve a specific conversation with all messages.

**Headers:**
- `X-Session-Token: {token}` (required)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `conversation_id` | string | The ID of the conversation |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `last` | integer | 0 | ID of the last message to start pagination from |

**Response:**
```json
{
  "success": true,
  "conversation_id": "{conversation_id}",
  "messages": [
    {
      "id": "{message_id}",
      "sender": "{sender_username}",
      "content": "{message_content}",
      "date": "{date}",
      "..."
    },
    "..."
  ]
}
```

**Status Codes:**
- `200 OK` - Conversation retrieved successfully
- `401 Unauthorized` - Invalid or expired session token
- `404 Not Found` - Conversation not found

---

#### GET `/nachrichten/search`

Search for message recipients.

**Headers:**
- `X-Session-Token: {token}` (required)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (name, username, etc.) |

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "{user_id}",
      "name": "{full_name}",
      "username": "{username}",
      "type": "{user_type}",
      "..."
    },
    "..."
  ]
}
```

**Status Codes:**
- `200 OK` - Search results retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

#### POST `/nachrichten/send`

Send a new message.

**Headers:**
- `X-Session-Token: {token}` (required)

**Request Body:**
```json
{
  "recipients": ["{user_id_1}", "{user_id_2}"],
  "subject": "{message_subject}",
  "body": "{message_body}"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "{message_id}",
  "sent_at": "{timestamp}"
}
```

**Status Codes:**
- `200 OK` - Message sent successfully
- `400 Bad Request` - Invalid message format
- `401 Unauthorized` - Invalid or expired session token

---

### Courses (Mein Unterricht)

#### GET `/meinunterricht`

Retrieve an overview of all courses.

**Headers:**
- `X-Session-Token: {token}` (required)

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": "{course_id}",
      "name": "{course_name}",
      "teacher": "{teacher_name}",
      "entries_count": 5,
      "..."
    },
    "..."
  ]
}
```

**Status Codes:**
- `200 OK` - Course overview retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

#### GET `/meinunterricht/course/{course_id}`

Retrieve detailed information about a specific course.

**Headers:**
- `X-Session-Token: {token}` (required)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `course_id` | string | The ID of the course |

**Response:**
```json
{
  "success": true,
  "course": {
    "id": "{course_id}",
    "name": "{course_name}",
    "teacher": "{teacher_name}",
    "entries": [
      {
        "id": "{entry_id}",
        "title": "{entry_title}",
        "date": "{date}",
        "url": "{entry_url}",
        "..."
      },
      "..."
    ]
  }
}
```

**Status Codes:**
- `200 OK` - Course details retrieved successfully
- `401 Unauthorized` - Invalid or expired session token
- `404 Not Found` - Course not found

---

#### GET `/meinunterricht/entry`

Retrieve detailed information about a specific course entry.

**Headers:**
- `X-Session-Token: {token}` (required)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | The URL of the entry to fetch details for |

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": "{entry_id}",
    "title": "{entry_title}",
    "content": "{entry_content}",
    "date": "{date}",
    "attachments": [
      {
        "name": "{file_name}",
        "url": "{file_url}",
        "..."
      },
      "..."
    ]
  }
}
```

**Status Codes:**
- `200 OK` - Entry details retrieved successfully
- `401 Unauthorized` - Invalid or expired session token
- `404 Not Found` - Entry not found

---

#### GET `/meinunterricht/weekly`

Retrieve a weekly view of course entries.

**Headers:**
- `X-Session-Token: {token}` (required)

**Response:**
```json
{
  "success": true,
  "week": {
    "start_date": "{date}",
    "entries": [
      {
        "date": "{date}",
        "course": "{course_name}",
        "entry": "{entry_title}",
        "url": "{entry_url}",
        "..."
      },
      "..."
    ]
  }
}
```

**Status Codes:**
- `200 OK` - Weekly view retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

#### GET `/meinunterricht/submissions`

Retrieve all submissions/tasks that need attention.

**Headers:**
- `X-Session-Token: {token}` (required)

**Response:**
```json
{
  "success": true,
  "submissions": [
    {
      "id": "{submission_id}",
      "title": "{submission_title}",
      "course": "{course_name}",
      "due_date": "{date}",
      "status": "{status}",
      "url": "{submission_url}",
      "..."
    },
    "..."
  ]
}
```

**Status Codes:**
- `200 OK` - Submissions retrieved successfully
- `401 Unauthorized` - Invalid or expired session token

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `200 OK` | Request successful |
| `400 Bad Request` | Invalid request parameters or body |
| `401 Unauthorized` | Invalid, expired, or missing session token |
| `404 Not Found` | Requested resource not found |
| `500 Internal Server Error` | Server error |

---

## Examples

### Example: Login and Fetch Messages

```bash
# Step 1: Login
curl -X POST {api-endpoint}/login \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "1234",
    "username": "john.doe",
    "password": "password123"
  }'

# Response:
# {
#   "token": "abc123def456...",
#   "school_id": "1234",
#   "username": "john.doe",
#   "encryption_ready": true
# }

# Step 2: Fetch message headers using the token
curl -X GET "{api-endpoint}/nachrichten/headers?get_type=All" \
  -H "X-Session-Token: abc123def456..."

# Step 3: Logout
curl -X POST {api-endpoint}/logout \
  -H "X-Session-Token: abc123def456..."
```

### Example: Fetch Course Details

```bash
# Get all courses
curl -X GET {api-endpoint}/meinunterricht \
  -H "X-Session-Token: {token}"

# Get a specific course
curl -X GET {api-endpoint}/meinunterricht/course/12345 \
  -H "X-Session-Token: {token}"
```

---

## Notes

- Session tokens expire after 60 minutes of inactivity
- All timestamps are in UTC format
- Response data is anonymized in this documentation; placeholders like `{username}`, `{course_name}` represent actual values
- Multiple concurrent users are supported through session isolation
- The API automatically cleans up expired sessions

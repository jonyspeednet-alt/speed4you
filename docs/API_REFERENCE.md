# Speed4You ISP Entertainment Portal — API Reference

> **Version:** 1.0  
> **Base URL:** `http://<host>:3001/api` (also mounted at `/portal-api/api` and `/` for proxied deployments)  
> **Content-Type:** `application/json` (unless otherwise noted)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Content](#3-content)
4. [Movies](#4-movies)
5. [Series](#5-series)
6. [Search](#6-search)
7. [Watchlist](#7-watchlist)
8. [Progress](#8-progress)
9. [Player](#9-player)
10. [TV](#10-tv)
11. [Admin](#11-admin)
12. [Health](#12-health)
13. [Error Codes Reference](#13-error-codes-reference)
14. [Rate Limiting](#14-rate-limiting)

---

## 1. Overview

### Base URL

All API endpoints are accessible under the following prefixes (all resolve to the same router):

| Prefix | Environment |
|---|---|
| `/api` | Development / legacy |
| `/portal-api/api` | Vite-configured production prefix |
| `/` | Proxied production (nginx) |

**Example:** `GET /api/content/homepage`

### Common Response Envelope

Most endpoints return a JSON envelope. Successful responses from the error handler always use this format:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "requestId": "lz3j8a1k-4f2bn9"
}
```

On error:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Content not found",
    "details": []
  },
  "requestId": "lz3j8a1k-4f2bn9"
}
```

> **Note:** Successful responses from individual route handlers may use their own top-level shape (e.g. `{ items, total }`). The envelope format above is guaranteed for error responses via the global error handler.

### Request ID

Every request is assigned an `X-Request-Id` response header for tracing.

### Authentication Header

Admin-protected routes require:

```
Authorization: Bearer <jwt-token>
```

User-context routes accept one of:

| Method | Header / Cookie | Resolved Value |
|---|---|---|
| Explicit user ID | `X-User-Id: <string>` | Value of the header |
| JWT Bearer token | `Authorization: Bearer <jwt>` | `user:<decoded.id>` |
| Guest (default) | — | `guest` |

### Request Body Limits

- JSON body: **2 MB**
- URL-encoded body: **2 MB**
- File uploads (admin): **1 MB** by default (`ADMIN_UPLOAD_MAX_BYTES`)

---

## 2. Authentication

**Base path:** `/api/auth`

All auth endpoints are **public** (no JWT required), except `/verify` and `/refresh` which expect a token in the `Authorization` header.

---

### POST `/api/auth/login`

Admin login. Issues a JWT on success.

| Property | Value |
|---|---|
| **Auth Required** | No |
| **Rate Limit** | 10 requests / 15 minutes |

**Request Body:**

| Field | Type | Constraints | Required |
|---|---|---|---|
| `username` | `string` | Alphanumeric, 2–64 chars, trimmed | Yes |
| `password` | `string` | 1–256 chars | Yes |

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Login successful |
| 400 | Validation error (missing or invalid fields) |
| 401 | Invalid credentials |
| 429 | Too many login attempts (rate limited) |

---

### GET|POST `/api/auth/verify`

Verify a JWT token and return the decoded payload.

| Property | Value |
|---|---|
| **Auth Required** | Yes (Bearer token) |

**Headers:**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <token>` |

**Response (200):**

```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "iat": 1700000000,
    "exp": 1700086400
  }
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Token is valid |
| 401 | No token provided or token is invalid/expired |

---

### POST `/api/auth/logout`

Client-side logout. The server does not invalidate tokens (stateless JWT). The client should discard the stored token.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Response (200):**

```json
{
  "ok": true
}
```

---

### POST `/api/auth/refresh`

Issue a new JWT with a fresh expiry using the current valid token.

| Property | Value |
|---|---|
| **Auth Required** | Yes (Bearer token) |

**Headers:**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <token>` |

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Token refreshed |
| 401 | No token provided or token is invalid/expired |

---

## 3. Content

**Base path:** `/api/content`

All content endpoints are **public** and subject to the **public content rate limit**.

---

### GET `/api/content/featured`

Return a single featured content item. Falls back to the most recent published item if none is explicitly featured.

| Property | Value |
|---|---|
| **Auth Required** | No |
| **Rate Limit** | Public content (20 000 / min) |

**Query Parameters:** None

**Response (200):**

```json
{
  "id": 42,
  "title": "Inception",
  "type": "movie",
  "genre": "Sci-Fi",
  "featured": true,
  "poster": "/portal/uploads/posters/...",
  "backdrop": "/portal/uploads/banners/...",
  "videoUrl": "/media/movies/inception.mkv",
  "year": 2010,
  "description": "A thief who steals corporate secrets...",
  "status": "published",
  "rating": 8.8,
  "language": "English",
  "collection": "Movies",
  "tags": ["sci-fi", "thriller"]
}
```

Returns `null` if no published content exists.

---

### GET `/api/content/`

Paginated list of all published content.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `page` | `integer` | `1` | 1–100 000 |
| `limit` | `integer` | `24` | 1–100 |
| `sort` | `string` | `"latest"` | `latest`, `popular`, `trending`, `rating`, `featured` |

**Response (200):**

```json
{
  "items": [],
  "featured": null,
  "total": 150,
  "page": 1,
  "limit": 24,
  "hasMore": true
}
```

---

### GET `/api/content/latest`

Latest published items sorted by recency.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `limit` | `integer` | `10` | 1–100 |

**Response (200):**

```json
{
  "items": []
}
```

---

### GET `/api/content/popular`

Popular published items.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `limit` | `integer` | `10` | 1–100 |

**Response (200):**

```json
{
  "items": []
}
```

---

### GET `/api/content/trending`

Trending published items.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `limit` | `integer` | `10` | 1–100 |

**Response (200):**

```json
{
  "items": []
}
```

---

### GET `/api/content/local-trending`

Local trending published items (currently returns same data as trending, available as a separate endpoint for ISP-local customization).

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `limit` | `integer` | `10` | 1–100 |

**Response (200):** Array (not wrapped in object):

```json
[
  { "id": 1, "title": "...", "type": "movie", "..." : "..." }
]
```

---

### GET `/api/content/recommendations`

Personalized content recommendations. Filters out the item specified by `seed`.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `limit` | `integer` | `10` | 1–100 |
| `seed` | `string` | `""` | Content ID to exclude from results |

**Response (200):** Array of content items (not wrapped):

```json
[
  { "id": 5, "title": "...", "type": "series", "..." : "..." }
]
```

---

### GET `/api/content/homepage`

Aggregated homepage payload combining featured, latest, popular, trending, and series in a single request.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `limit` | `integer` | `30` | 1–100 |

**Response (200):**

```json
{
  "featured": {},
  "latest": [],
  "popular": [],
  "trending": [],
  "series": [],
  "generatedAt": "2025-01-15T12:00:00.000Z"
}
```

---

### GET `/api/content/browse`

Advanced browsing with multi-faceted filtering.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `type` | `string` | — | `movie`, `series` |
| `genre` | `string` | — | Genre name |
| `language` | `string` | — | Language name |
| `collection` | `string` | — | Collection name |
| `tag` | `string` | — | Tag name |
| `year` | `string` | — | 4-digit year |
| `q` | `string` | — | Search query (triggers text search when provided) |
| `sort` | `string` | `"latest"` | `latest`, `popular`, `trending`, `rating`, `featured` |
| `page` | `integer` | `1` | 1–100 000 |
| `limit` | `integer` | `20` | 1–100 |

**Response (200):**

```json
{
  "items": [],
  "total": 45,
  "page": 1,
  "limit": 20,
  "query": "action",
  "nextPage": 2,
  "hasMore": true
}
```

When `q` is provided, full-text search is performed across all matching filters. Otherwise, standard filtered listing applies.

---

## 4. Movies

**Base path:** `/api/movies`

Public, rate-limited movie-specific endpoints.

---

### GET `/api/movies/`

List movies with genre/year/sort filters.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters (Joi-validated):**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `genre` | `string` | — | 1–80 chars, trimmed |
| `year` | `integer\|string` | — | 1900–2100 or 4-digit string |
| `sort` | `string` | `"latest"` | `latest`, `popular`, `trending`, `rating`, `featured` |
| `page` | `integer` | `1` | 1–100 000 |
| `limit` | `integer` | `24` | 1–100 |

**Response (200):**

```json
{
  "movies": [],
  "total": 87,
  "page": 1,
  "limit": 24,
  "hasMore": true
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Validation error (invalid query parameters) |

---

### GET `/api/movies/:id`

Retrieve a single movie by ID.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Movie content ID |

**Response (200):** Full movie object.

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 404 | Movie not found (or content exists but is not type `movie`) |

---

## 5. Series

**Base path:** `/api/series`

Public, rate-limited series-specific endpoints.

---

### GET `/api/series/`

List series with genre/year/sort filters.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters (Joi-validated):**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `genre` | `string` | — | 1–80 chars, trimmed |
| `year` | `integer\|string` | — | 1900–2100 or 4-digit string |
| `sort` | `string` | `"latest"` | `latest`, `popular`, `trending`, `rating`, `featured` |
| `page` | `integer` | `1` | 1–100 000 |
| `limit` | `integer` | `24` | 1–100 |

**Response (200):**

```json
{
  "series": [],
  "total": 32,
  "page": 1,
  "limit": 24,
  "hasMore": true
}
```

---

### GET `/api/series/:id`

Retrieve a single series by ID, including seasons and episodes.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Series content ID |

**Response (200):** Full series object with embedded `seasons[].episodes[]`.

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 404 | Series not found |

---

### GET `/api/series/:id/seasons`

Season list for a specific series.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Series content ID |

**Response (200):**

```json
{
  "seasons": [
    {
      "id": 1,
      "number": 1,
      "title": "Season 1",
      "episodes": 8
    }
  ]
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 404 | Series not found |

---

### GET `/api/series/:id/seasons/:seasonId/episodes`

Episode list for a specific season of a series.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Series content ID |
| `seasonId` | `string` | Season ID or season number |

**Response (200):**

```json
{
  "episodes": [
    {
      "id": 1,
      "number": 1,
      "title": "Episode 1",
      "description": "...",
      "videoUrl": "/media/series/...",
      "duration": 45,
      "durationSeconds": 2700
    }
  ]
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 404 | Series or season not found |

---

## 6. Search

**Base path:** `/api/search`

Public, rate-limited search endpoints.

---

### GET `/api/search/`

Full-text search with type/genre/language/year filters and autocomplete suggestions.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters (Joi-validated):**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `q` | `string` | `""` | Max 160 chars, trimmed; minimum 2 chars for results |
| `type` | `string` | `""` | `movie`, `series`, or empty |
| `genre` | `string` | `""` | Max 80 chars |
| `language` | `string` | `""` | Max 40 chars |
| `year` | `integer\|string` | `""` | 1900–2100 or 4-digit string |
| `page` | `integer` | `1` | 1–100 000 |
| `limit` | `integer` | `24` | 1–100 |

**Response (200):**

```json
{
  "results": [],
  "total": 12,
  "suggestions": ["inception", "interstellar", "inside out"],
  "page": 1,
  "limit": 24,
  "hasMore": false
}
```

If `q` is empty or fewer than 2 characters, returns empty results:

```json
{
  "results": [],
  "total": 0,
  "suggestions": [],
  "page": 1,
  "limit": 24,
  "hasMore": false
}
```

Searches are automatically recorded for the resolved user.

---

### GET `/api/search/suggestions`

Autocomplete suggestions for a search query.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `q` | `string` | — | Minimum 2 chars for results |

**Response (200):**

```json
{
  "items": ["inception", "interstellar", "inside out"]
}
```

---

### GET `/api/search/recent`

Retrieve the user's recent search queries.

| Property | Value |
|---|---|
| **Auth Required** | User context (resolved via middleware) |

**Query Parameters:** None

**Response (200):**

```json
{
  "items": [
    {
      "query": "action",
      "filters": { "type": "movie", "genre": "", "language": "", "year": "" },
      "searchedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## 7. Watchlist

**Base path:** `/api/watchlist`

All watchlist endpoints require user context (resolved via `X-User-Id` header, JWT Bearer token, or guest identity). If `REQUIRE_USER_AUTH_FOR_STATE=1` is set, guest access is denied.

---

### GET `/api/watchlist/`

Retrieve the user's watchlist with enriched content data.

| Property | Value |
|---|---|
| **Auth Required** | User context (`requireStateUser`) |

**Query Parameters:** None

**Response (200):**

```json
{
  "items": [
    {
      "id": 42,
      "contentId": 42,
      "contentType": "movie",
      "title": "Inception",
      "type": "movie",
      "poster": "/portal/uploads/posters/...",
      "addedAt": "2025-01-10T08:00:00.000Z"
    }
  ],
  "total": 5
}
```

---

### GET `/api/watchlist/check`

Check whether a specific content item is in the user's watchlist.

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `contentType` | `string` | Yes | `movie` or `series` |
| `contentId` | `number` | Yes | Positive integer content ID |

**Response (200):**

```json
{
  "inWatchlist": true,
  "entryId": 15
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Missing or invalid `contentType` / `contentId` |

---

### POST `/api/watchlist/`

Add a content item to the user's watchlist.

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `contentType` | `string` | Yes | `movie` or `series` |
| `contentId` | `number` | Yes | Positive integer content ID |

**Response (201):**

```json
{
  "success": true
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 201 | Added to watchlist |
| 400 | Missing or invalid `contentType` / `contentId` |
| 404 | Content not found |
| 409 | Already in watchlist |

---

### DELETE `/api/watchlist/:id`

Remove an item from the user's watchlist.

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Watchlist entry ID |

**Response (200):**

```json
{
  "success": true
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Removed from watchlist |
| 404 | Watchlist entry not found |

---

## 8. Progress

**Base path:** `/api/progress`

All progress endpoints require user context. Used for tracking watch position and "Continue Watching" functionality.

---

### GET `/api/progress/`

Retrieve all incomplete watch progress entries for the user, enriched with content metadata.

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Query Parameters:** None

**Response (200):**

```json
{
  "items": [
    {
      "id": 1,
      "progressId": 1,
      "contentId": 42,
      "contentType": "movie",
      "title": "Inception",
      "type": "movie",
      "poster": "/portal/uploads/posters/...",
      "last_position": 1234.5,
      "position": 1234.5,
      "duration": 9000,
      "completed": false
    }
  ]
}
```

---

### POST `/api/progress/`

Update or create a watch progress entry (upsert).

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `contentType` | `string` | Yes | `movie` or `series` |
| `contentId` | `number` | Yes | Positive integer content ID |
| `position` | `number` | No | Playback position in seconds (default: `0`) |
| `duration` | `number` | No | Total duration in seconds (default: `0`) |

**Response (200):**

```json
{
  "success": true
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Progress updated |
| 400 | Missing or invalid `contentType` / `contentId` |

---

### GET `/api/progress/continue-watching`

Retrieve items the user is currently watching (incomplete progress with `position > 0`), enriched with content metadata.

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Query Parameters:** None

**Response (200):**

```json
{
  "items": [
    {
      "id": 42,
      "progressId": 1,
      "contentId": 42,
      "contentType": "movie",
      "title": "Inception",
      "type": "movie",
      "poster": "/portal/uploads/posters/...",
      "last_position": 1234.5
    }
  ]
}
```

---

### GET `/api/progress/continue-watching/list`

Alias for `/continue-watching`. Returns the same data.

| Property | Value |
|---|---|
| **Auth Required** | User context |

---

### POST `/api/progress/complete`

Mark a content item as fully watched.

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `contentType` | `string` | Yes | `movie` or `series` |
| `contentId` | `number` | Yes | Content ID |

**Response (200):**

```json
{
  "success": true
}
```

---

### GET `/api/progress/:contentType/:contentId`

Retrieve watch progress for a specific content item.

| Property | Value |
|---|---|
| **Auth Required** | User context |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `contentType` | `string` | `movie` or `series` |
| `contentId` | `number` | Content ID |

**Response (200):**

```json
{
  "id": 1,
  "contentId": 42,
  "contentType": "movie",
  "position": 1234.5,
  "duration": 9000,
  "completed": false,
  "last_position": 1234.5
}
```

If no progress entry exists:

```json
{
  "progress": null
}
```

---

## 9. Player

**Base path:** `/api/player`

Player endpoints provide stream metadata, video streaming, and cache preparation. User context is recommended for progress tracking but not strictly enforced at the middleware level.

---

### GET `/api/player/:contentType/:id`

Get stream metadata including sources, subtitles, and prepare URL.

| Property | Value |
|---|---|
| **Auth Required** | User context (recommended) |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `contentType` | `string` | `movie` or `series` |
| `id` | `integer` | Content ID |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `season` | `integer` | `1` | Season number (series only) |
| `episode` | `integer` | `1` | Episode number (series only) |

**Response (200):**

```json
{
  "sources": [
    {
      "url": "/api/player/stream/movie/42?season=1&episode=1",
      "quality": "1080p",
      "label": "1080p",
      "delivery": "direct",
      "originalExtension": ".mp4",
      "available": true,
      "optimizedReady": true
    }
  ],
  "subtitles": [],
  "preparePath": "/api/player/prepare/movie/42?season=1&episode=1",
  "title": "Inception",
  "type": "movie",
  "contentId": 42,
  "durationSeconds": 9000,
  "runtimeMinutes": 150,
  "season": null,
  "episode": null
}
```

For series:

```json
{
  "sources": [],
  "subtitles": [],
  "preparePath": "/api/player/prepare/series/10?season=2&episode=3",
  "title": "Breaking Bad",
  "type": "series",
  "contentId": 10,
  "durationSeconds": 2700,
  "runtimeMinutes": 45,
  "season": {
    "id": 2,
    "number": 2,
    "title": "Season 2"
  },
  "episode": {
    "id": 3,
    "number": 3,
    "title": "Bit by a Dead Bee",
    "description": "Walt and Jesse...",
    "duration": 45,
    "durationSeconds": 2700,
    "runtimeMinutes": 45
  }
}
```

The `delivery` field in sources indicates the streaming strategy:

| Value | Description |
|---|---|
| `direct` | File can be streamed as-is (MP4, browser-compatible) |
| `remux-copy` | Container remux needed; video/audio codecs copied via FFmpeg |
| `copy-video-transcode-audio` | Video copied, audio transcoded to AAC |
| `transcode` | Full transcode via FFmpeg to MP4/H.264/AAC |

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 404 | Content not found or no playable source |

---

### GET `/api/player/stream/:contentType/:id`

Stream the actual video content. Supports direct file serving, FFmpeg remuxing, and full transcoding. Supports HTTP Range requests for seeking.

| Property | Value |
|---|---|
| **Auth Required** | User context (recommended) |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `contentType` | `string` | `movie` or `series` |
| `id` | `integer` | Content ID |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `season` | `integer` | `1` | Season number (series only) |
| `episode` | `integer` | `1` | Episode number (series only) |
| `requireOptimized` | `string` | — | Set to `"1"` to reject if optimized cache is not ready |

**Streaming Behavior:**

1. **Cached optimized file available** → Direct file stream (supports Range requests)
2. **`requireOptimized=1` and cache not ready** → `425 Too Early`
3. **Source is direct-playable** → Direct file stream
4. **Remux needed** → FFmpeg remux to fragmented MP4 (copy codecs)
5. **Audio transcode needed** → FFmpeg copy-video + transcode-audio to AAC
6. **Full transcode needed** → FFmpeg full transcode to H.264/AAC fragmented MP4

**Response Headers:**

| Header | Value |
|---|---|
| `Content-Type` | `video/mp4` or actual file MIME type |
| `Accept-Ranges` | `bytes` (for direct streams) |
| `Cache-Control` | `private, no-store` |
| `Content-Range` | `bytes <start>-<end>/<total>` (for Range requests) |

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Stream started |
| 206 | Partial content (Range request) |
| 404 | Content or source file not found |
| 416 | Range not satisfiable |
| 425 | Optimized stream not ready (when `requireOptimized=1`) |
| 500 | Transcoding/streaming error |

---

### GET `/api/player/prepare/:contentType/:id`

Prepare/cache an optimized stream for playback. Returns immediately; transcoding happens in the background.

| Property | Value |
|---|---|
| **Auth Required** | User context (recommended) |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `contentType` | `string` | `movie` or `series` |
| `id` | `integer` | Content ID |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `season` | `integer` | `1` | Season number (series only) |
| `episode` | `integer` | `1` | Episode number (series only) |

**Response (200):**

When already cached:

```json
{
  "ready": true,
  "strategy": "direct"
}
```

When caching is being started:

```json
{
  "ready": false,
  "strategy": "remux-copy"
}
```

When cache file exists but is small:

```json
{
  "ready": true,
  "strategy": "remux-copy",
  "cachePath": "/var/www/html/Extra_Storage/portal-media-cache/movie-42-s1-e1.mp4"
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Status returned |
| 404 | Content or source file not found |

---

## 10. TV

**Base path:** `/api/tv`

Live TV endpoints that proxy an external IPTV portal. All endpoints are public and rate-limited.

The TV module connects to an external portal configured via `TV_PORTAL_BASE_URL` (default: `http://<YOUR_TV_PORTAL_IP>/`). Only whitelisted hosts and ports are allowed for security.

---

### GET `/api/tv/channels`

List all live TV channels parsed from the external portal.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:** None

**Response (200):**

```json
{
  "categories": ["Sports", "News", "Entertainment"],
  "channels": [
    {
      "id": "sports-80",
      "streamId": "80",
      "name": "ESPN",
      "category": "Sports",
      "categories": ["Sports", "Live"],
      "logoPath": "/api/tv/asset?url=http%3A%2F%2F<YOUR_TV_PORTAL_IP>%2Fimages%2Fespn.png",
      "playerPath": "/api/tv/player/80"
    }
  ],
  "defaultStreamId": "80",
  "source": "http://<YOUR_TV_PORTAL_IP>/",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

---

### GET `/api/tv/stream/:streamId`

Resolve the playable stream URL for a specific TV channel.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `streamId` | `string` | Channel stream ID |

**Response (200):**

```json
{
  "streamId": "80",
  "sourcePath": "../asset?url=http%3A%2F%2F<YOUR_TV_PORTAL_IP>%3A8082%2Fstream%2F80%2Findex.m3u8"
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Stream resolved |
| 404 | Stream source not found |
| 400 | TV source is not in the allowed hosts list |

---

### GET `/api/tv/asset`

Proxy remote TV assets (images, HLS playlists, video segments). Rewrites HLS playlist URIs to proxy through this endpoint.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | Fully-qualified URL of the remote asset (must be on an allowed host) |

**Response:** Binary content of the remote asset with appropriate `Content-Type` and `Cache-Control` headers. HLS playlists are rewritten so that segment URIs point back through this proxy.

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Asset proxied |
| 400 | URL is not on an allowed host/port |
| 404 | Remote asset not found |

---

### GET `/api/tv/player/:streamId`

Full standalone HTML TV player page with HLS.js integration, playback controls, and PiP/fullscreen support.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `streamId` | `string` | Channel stream ID |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `"Channel <streamId>"` | Channel display name |
| `category` | `string` | `"Live TV"` | Channel category label |

**Response:** `Content-Type: text/html` — A complete HTML page with embedded CSS and JavaScript for HLS playback.

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | HTML player page |
| 404 | Stream source not found |
| 400 | TV source is not in the allowed hosts list |

---

## 11. Admin

**Base path:** `/api/admin`

**All admin endpoints require admin JWT authentication.** The middleware verifies the token and ensures the decoded `role` is `admin` or `super_admin`.

---

### 11.1 Dashboard & Stats

---

### GET `/api/admin/dashboard`

Aggregated dashboard data including stats, recent content, scanner drafts, and scanner roots.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):**

```json
{
  "stats": {
    "total": 150,
    "published": 120,
    "draft": 30,
    "movies": 80,
    "series": 70
  },
  "recentContent": [],
  "scannerDrafts": [],
  "scannerRoots": []
}
```

---

### GET `/api/admin/stats`

Content statistics.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):** Stats object (shape depends on store implementation).

---

### 11.2 Content Management

---

### GET `/api/admin/content`

Full content list with advanced filters (includes drafts and all statuses).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | `string` | — | `published` or `draft` |
| `type` | `string` | — | `movie` or `series` |
| `source` | `string` | — | `scanner` or `manual` |
| `sourceRootId` | `string` | — | Scanner root ID |
| `language` | `string` | — | Language filter |
| `category` | `string` | — | Category filter |
| `collection` | `string` | — | Collection filter |
| `tag` | `string` | — | Tag filter |
| `search` | `string` | — | Text search |
| `sort` | `string` | `"latest"` | Sort mode |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `50` | Items per page |
| `summary` | `string` | — | Set to `"true"` for compact summary items |
| `duplicatesOnly` | `string` | — | Set to `"true"` to show only items with duplicates |

**Response (200):**

```json
{
  "items": [],
  "total": 150
}
```

---

### GET `/api/admin/content/organization`

Library organization data (facets, counts, groupings).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Query Parameters:** Same filters as `/api/admin/content` (minus pagination).

**Response (200):** Organization data object.

---

### GET `/api/admin/content/:id`

Retrieve a single content item by ID (any status).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Content ID |

**Response (200):** Full content object.

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 404 | Content not found |

---

### POST `/api/admin/content`

Create a new content item.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body (Joi-validated):**

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `title` | `string` | Yes | — | 1–500 chars |
| `type` | `string` | No | `"movie"` | `movie` or `series` |
| `status` | `string` | No | `"draft"` | `published` or `draft` |
| `genre` | `string` | No | `null` | — |
| `year` | `integer` | No | `null` | 1800 – current year + 5 |
| `language` | `string` | No | `null` | — |
| `category` | `string` | No | `null` | — |
| `collection` | `string` | No | `null` | — |
| `tags` | `string[]` | No | `[]` | Array of strings |
| `description` | `string` | No | `null` | — |
| `poster` | `string` | No | `null` | URL or path |
| `backdrop` | `string` | No | `null` | URL or path |
| `videoUrl` | `string` | No | `null` | Video source URL |
| `featured` | `boolean` | No | `false` | — |
| `featuredOrder` | `integer` | No | `0` | — |
| `rating` | `number` | No | `null` | 0–10 |
| `duration` | `integer` | No | `null` | ≥ 0 |
| `adminNotes` | `string` | No | `null` | — |
| `tmdbId` | `integer` | No | `null` | — |
| `imdbId` | `string` | No | `null` | — |
| `editorialScore` | `integer` | No | `null` | 0–100 |
| `seasons` | `object[]` | No | `[]` | See season schema below |

**Season Schema:**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `number\|string` | No | Season identifier |
| `number` | `integer` | No | Season number (≥ 1) |
| `title` | `string` | No | Season title |
| `sourcePath` | `string` | No | File system path |
| `episodes` | `object[]` | No | Array of episode objects |

**Episode Schema:**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `number\|string` | No | Episode identifier |
| `number` | `integer` | No | Episode number (≥ 1) |
| `title` | `string` | No | Episode title |
| `description` | `string` | No | Episode description |
| `videoUrl` | `string` | No | Video source URL |
| `sourcePath` | `string` | No | File system path |
| `duration` | `integer\|string` | No | Duration |

**Response (201):** Created content object.

**Status Codes:**

| Code | Meaning |
|---|---|
| 201 | Content created |
| 400 | Validation error or missing title |

---

### PUT `/api/admin/content/:id`

Update an existing content item. All fields are optional (partial update).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Content ID |

**Request Body:** Same schema as create, but all fields are optional.

**Response (200):** Updated content object.

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Content updated |
| 400 | Validation error |
| 404 | Content not found |

---

### POST `/api/admin/content/bulk-update`

Bulk update multiple content items with the same changes.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body (Joi-validated):**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `ids` | `array` | Yes | Array of content IDs (numbers or strings), min 1 |
| `changes` | `object` | Yes | At least one of the following: |

**Allowed `changes` fields:**

| Field | Type | Constraints |
|---|---|---|
| `status` | `string` | `published` or `draft` |
| `category` | `string` | — |
| `language` | `string` | — |
| `featured` | `boolean` | — |
| `collection` | `string` | — |
| `tags` | `string[]` | — |
| `adminNotes` | `string` | — |
| `featuredOrder` | `integer` | — |

**Response (200):**

```json
{
  "updatedCount": 5,
  "items": []
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Bulk update completed |
| 400 | Validation error or empty IDs |

---

### DELETE `/api/admin/content/:id`

Delete a content item.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Content ID |

**Response:** `204 No Content`

**Status Codes:**

| Code | Meaning |
|---|---|
| 204 | Content deleted |
| 404 | Content not found |

---

### POST `/api/admin/content/:id/publish`

Publish a content item (set status to `published`).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):** Updated content object.

---

### POST `/api/admin/content/:id/unpublish`

Unpublish a content item (set status to `draft`).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):** Updated content object.

---

### GET `/api/admin/movies`

Movies-only admin list. Delegates to the content list with `type=movie`.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Query Parameters:** Same as `/api/admin/content`.

---

### GET `/api/admin/series`

Series-only admin list. Delegates to the content list with `type=series`.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Query Parameters:** Same as `/api/admin/content`.

---

### 11.3 Maintenance

---

### POST `/api/admin/maintenance/prune`

Prune the content catalog (remove orphaned or stale entries).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:** None

**Response (200):** Prune result object.

---

### POST `/api/admin/maintenance/vacuum`

Vacuum the database to reclaim space and optimize.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:** None

**Response (200):** Vacuum result object.

---

### 11.4 File Uploads

---

### POST `/api/admin/upload/poster`

Upload a poster image.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |
| **Content-Type** | `multipart/form-data` |

**Form Data:**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes (or `dataUrl`) | Image file (JPEG, PNG, WebP, GIF, SVG) |
| `dataUrl` | `string` | Yes (or `file`) | Base64 data URL of the image |

**Constraints:** Max file size = `ADMIN_UPLOAD_MAX_BYTES` (default: 1 MB).

**Response (201):**

```json
{
  "url": "/portal/uploads/posters/1705312000000-abc123.jpg"
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 201 | Upload successful |
| 400 | Invalid image payload or unsupported type |
| 413 | File exceeds size limit |

---

### POST `/api/admin/upload/banner`

Upload a banner/backdrop image. Same interface as poster upload but saves to the `banners` directory.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |
| **Content-Type** | `multipart/form-data` |

**Response (201):**

```json
{
  "url": "/portal/uploads/banners/1705312000000-abc123.jpg"
}
```

---

### 11.5 Scanner

---

### GET `/api/admin/scanner/roots`

List configured scanner root directories.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):**

```json
{
  "items": [
    {
      "id": 1,
      "label": "Movies HDD",
      "scanPath": "/media/movies",
      "publicBaseUrl": "/media/movies",
      "type": "movie",
      "enabled": true
    }
  ]
}
```

---

### GET `/api/admin/scanner/drafts`

List scanner draft content (not yet published).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `latestOnly` | `string` | `"true"` | Show only drafts from the latest scan run |
| `status` | `string` | `"draft"` | Filter by status |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `50` | Items per page (max 200) |

**Response (200):**

```json
{
  "items": [],
  "total": 10,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

---

### GET `/api/admin/scanner/logs`

Retrieve scanner run logs.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | `integer` | `10` | Number of recent runs to return |

**Response (200):**

```json
{
  "items": [],
  "total": 25
}
```

---

### GET `/api/admin/scanner/health`

Scanner health check with root status and recent run information.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):** Detailed scanner health object.

---

### POST `/api/admin/scanner/cache/clear`

Clear the metadata enrichment cache.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:** None

**Response (200):**

```json
{
  "ok": true,
  "metadataCache": {
    "size": 0,
    "keys": []
  }
}
```

---

### GET `/api/admin/scanner/jobs/current`

Get the currently running scanner job (if any).

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):**

```json
{
  "job": null
}
```

---

### POST `/api/admin/scanner/run`

Start a new scanner run.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `rootIds` | `array` | No | Array of scanner root IDs to scan (empty = all) |

**Response (202):**

```json
{
  "job": {
    "id": "scan-1705312000000",
    "status": "running",
    "startedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

---

### POST `/api/admin/scanner/stop`

Stop the currently running scanner job.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:** None

**Response (202):**

```json
{
  "job": {
    "id": "scan-1705312000000",
    "status": "stopped"
  }
}
```

---

### 11.6 Database

---

### GET `/api/admin/db/health`

Database health check including connection pool status and database size.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):**

```json
{
  "checkedAt": "2025-01-15T12:00:00.000Z",
  "database": "isp_entertainment",
  "pool": {
    "total": 5,
    "idle": 3,
    "waiting": 0
  },
  "databaseSize": "125 MB"
}
```

---

### 11.7 Media Normalizer

---

### GET `/api/admin/media-normalizer/status`

Get the current status of the media normalizer service.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):** Media normalizer status object (internal lock field stripped).

---

### POST `/api/admin/media-normalizer/start`

Start the media normalizer.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:** None

**Response (202):** Status object.

---

### POST `/api/admin/media-normalizer/stop`

Stop the media normalizer.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:** None

**Response (202):** Status object.

---

### 11.8 Duplicates

---

### GET `/api/admin/duplicates/review`

Get a duplicate review report identifying potential duplicate content.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Response (200):** Duplicate review report object.

---

### POST `/api/admin/duplicates/cleanup`

Run the duplicate cleanup process.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:** None

**Response (202):** Cleanup result object.

---

### 11.9 Metadata

---

### POST `/api/admin/metadata/tmdb`

Fetch metadata from TMDb or OMDb for enrichment.

| Property | Value |
|---|---|
| **Auth Required** | Admin JWT |

**Request Body:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `tmdbId` | `string` | Yes | — | TMDb ID (numeric) or IMDb ID (starts with `tt`) |
| `type` | `string` | No | `"movie"` | `movie` or `series` |

**Response (200):**

```json
{
  "metadata": {
    "title": "Inception",
    "overview": "A thief who steals corporate secrets...",
    "poster_path": "/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg",
    "release_date": "2010-07-16",
    "vote_average": 8.4,
    "genres": ["Action", "Science Fiction", "Adventure"]
  }
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Metadata retrieved |
| 400 | Missing or invalid TMDb/IMDb ID |

---

## 12. Health

---

### GET `/health`

Server health check. Not under `/api` prefix.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

---

### GET `/health/scanner`

Scanner health check. Not under `/api` prefix. Sensitive information is stripped unless `SCANNER_HEALTH_PUBLIC_VERBOSE=true`.

| Property | Value |
|---|---|
| **Auth Required** | No |

**Response (200):**

```json
{
  "checkedAt": "2025-01-15T12:00:00.000Z",
  "totalRoots": 3,
  "healthyRoots": 2,
  "brokenRoots": 1,
  "remoteRoots": 0,
  "roots": [
    {
      "id": 1,
      "label": "Movies HDD",
      "type": "movie",
      "exists": true,
      "checkable": true,
      "pathStatus": "ok",
      "pathStatusLabel": "Accessible",
      "estimatedCandidates": 80,
      "lastCompletedAt": "2025-01-14T08:00:00.000Z"
    }
  ],
  "recentRuns": [],
  "currentJob": null,
  "metadataCache": {}
}
```

---

## 13. Error Codes Reference

All error responses follow the standard envelope format:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": []
  },
  "requestId": "lz3j8a1k-4f2bn9"
}
```

### Application Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `BAD_REQUEST` | 400 | Malformed or invalid request |
| `VALIDATION_ERROR` | 400 | Request body/query failed Joi validation; `details` array contains per-field errors |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Authenticated but lacks required role |
| `NOT_FOUND` | 404 | Requested resource not found |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate watchlist entry) |
| `PAYLOAD_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `MEDIA_SELECTION_ERROR` | 404 | Content found but no playable source available |
| `TOO_EARLY` | 425 | Optimized stream is still preparing |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

### Validation Error Details

When `code` is `VALIDATION_ERROR`, the `details` array contains:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "location": "body",
        "path": "title",
        "message": "\"title\" is required"
      },
      {
        "location": "query",
        "path": "year",
        "message": "\"year\" must be less than or equal to 2100"
      }
    ]
  },
  "requestId": "lz3j8a1k-4f2bn9"
}
```

### Rate Limit Error

When a rate limit is exceeded:

```json
{
  "error": "Too many requests. Please slow down."
}
```

or for login:

```json
{
  "error": "Too many login attempts. Please try again later."
}
```

Rate limit headers are included in responses:

| Header | Description |
|---|---|
| `RateLimit-Limit` | Maximum requests allowed in the window |
| `RateLimit-Remaining` | Remaining requests in the current window |
| `RateLimit-Reset` | Time (in seconds) until the window resets |

---

## 14. Rate Limiting

### Rate Limit Tiers

| Tier | Scope | Window | Max Requests | Applies To |
|---|---|---|---|---|
| **Global API** | All `/api/` routes (except read-only public) | 15 minutes | 5 000 (configurable via `GLOBAL_API_RATE_LIMIT_MAX`) | Write operations, admin routes, auth, watchlist, progress, player |
| **Public Content** | Read-only GET/HEAD on `/api/content`, `/api/movies`, `/api/series`, `/api/search`, `/api/tv` | 1 minute | 20 000 (configurable via `PUBLIC_API_RATE_LIMIT_MAX`) | Public browsing and search |
| **Auth Login** | `POST /api/auth/login` | 15 minutes | 10 | Login attempts only |

### Rate Limit Exemptions

- Local requests (`127.0.0.1`, `::1`) are exempt from the **Public Content** rate limit.
- In non-production environments, local requests are also exempt from the **Global API** rate limit.
- Read-only public API requests (`GET`/`HEAD` on content, movies, series, search, TV) are exempt from the **Global API** rate limit.

### Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `GLOBAL_API_RATE_LIMIT_MAX` | `5000` | Global API rate limit per 15 min |
| `PUBLIC_API_RATE_LIMIT_MAX` | `20000` | Public content rate limit per 1 min |
| `TRUST_PROXY_HOPS` | `1` | Number of trusted proxy hops for IP resolution |

---

## Appendix: Environment Variables

Key environment variables that affect API behavior:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |
| `JWT_SECRET` | Insecure fallback (dev only) | JWT signing secret (required in production) |
| `JWT_EXPIRES_IN` | `24h` | JWT token expiry |
| `CORS_ALLOWED_ORIGINS` | — | Comma-separated allowed origins (required in production) |
| `REQUIRE_USER_AUTH_FOR_STATE` | `0` | Set to `1` to require auth for watchlist/progress |
| `ADMIN_UPLOAD_MAX_BYTES` | `1048576` (1 MB) | Max upload size for poster/banner images |
| `ADMIN_UPLOAD_DIR` | Auto-detected | Directory for uploaded assets |
| `TV_PORTAL_BASE_URL` | `http://<YOUR_TV_PORTAL_IP>/` | External IPTV portal base URL |
| `TV_ALLOWED_HOSTS` | `<YOUR_TV_PORTAL_IP>,<YOUR_TV_ALLOWED_HOST>` | Comma-separated allowed TV proxy hosts |
| `TV_ALLOWED_PORTS` | `80,8082` | Comma-separated allowed TV proxy ports |
| `REMOTE_MEDIA_BASE_URL` | — | Base URL for remote media redirect fallback |
| `PLAYER_CACHE_ROOT` | Auto-detected | Root directory for player cache files |
| `PLAYER_CACHE_READY_MIN_BYTES` | `1048576` (1 MiB) | Minimum cache file size to consider ready |
| `FFMPEG_PATH` | `ffmpeg` | Path to FFmpeg binary |
| `FFPROBE_PATH` | `ffprobe` | Path to FFprobe binary |
| `DB_NAME` | `isp_entertainment` | PostgreSQL database name |
| `SCANNER_HEALTH_PUBLIC_VERBOSE` | — | Set to `true` for verbose public scanner health |

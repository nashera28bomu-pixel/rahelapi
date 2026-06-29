# 🎬 Cymor Movie API

> **Production-ready Node.js backend powering Cymor Movie Hub** — a premium streaming platform for movies, TV series, and anime.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Render](https://img.shields.io/badge/Deploy-Render-purple)](https://render.com)

---

## Architecture Overview

```
Frontend (Cymor Movie Hub)
        ↓
Cymor Movie API  [Node.js / Express]
        ↓
Python Bridge    [bridge.py subprocess]
        ↓
moviebox-api     [Python library]
        ↓
MovieBox / aoneroom.com
```

The frontend **never** communicates with MovieBox directly. The Node.js API acts as a provider-agnostic abstraction layer. If MovieBox is ever replaced, only `src/python/bridge.py` and `src/services/moviebox.service.js` need to change.

---

## Why Python Bridge?

`moviebox-api` is a **Python library**, not a REST API. The Node.js backend spawns `bridge.py` as a child process, sends a JSON command via `stdin`, and reads the JSON response from `stdout`. This keeps the Node.js codebase pure while leveraging the full Python library.

---

## Project Structure

```
cymor-movie-api/
├── src/
│   ├── config/
│   │   └── env.js                  # Env validation & typed config
│   ├── controllers/
│   │   ├── home.controller.js      # Homepage content
│   │   ├── search.controller.js    # Search
│   │   ├── movies.controller.js    # Movie discovery
│   │   ├── series.controller.js    # Series discovery + episodes
│   │   ├── content.controller.js   # Unified content details/streams
│   │   └── health.controller.js    # Health & status
│   ├── middleware/
│   │   ├── setup.js                # Helmet, CORS, rate-limit, morgan
│   │   └── errorHandler.js         # Centralized error handling
│   ├── python/
│   │   └── bridge.py               # Python ↔ MovieBox integration
│   ├── routes/
│   │   ├── index.js                # Route registry (mounts all routes)
│   │   ├── home.routes.js
│   │   ├── search.routes.js
│   │   ├── movies.routes.js
│   │   ├── series.routes.js
│   │   ├── content.routes.js
│   │   └── health.routes.js
│   ├── services/
│   │   ├── moviebox.service.js     # Core business logic
│   │   ├── python.client.js        # Python bridge client (child_process)
│   │   └── cache.service.js        # In-memory cache (node-cache)
│   ├── utils/
│   │   ├── errors.js               # Custom error classes
│   │   ├── logger.js               # Structured logger
│   │   ├── normalizer.js           # MovieBox → Cymor response normalizer
│   │   ├── response.js             # HTTP response helpers
│   │   └── validate.js             # Input validation helpers
│   ├── app.js                      # Express app factory
│   └── server.js                   # HTTP server + graceful shutdown
├── .env.example                    # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Python | 3.10+ | [python.org](https://python.org) |
| pip | any | included with Python |

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/CymorTech/cymor-movie-api.git
cd cymor-movie-api
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Install Python dependencies (moviebox-api)

```bash
# Standard install
pip install moviebox-api

# OR on Termux / Android (no pip deps)
pip install moviebox-api --no-deps
pip install 'pydantic==2.9.2' rich click bs4 httpx throttlebuster
```

### 4. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Start the server

```bash
# Development (with auto-restart on file change)
npm run dev

# Production
npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PYTHON_BRIDGE_PATH` | No | `src/python/bridge.py` | Path to Python bridge script |
| `PYTHON_CMD` | No | `python3` | Python executable name |
| `PYTHON_TIMEOUT` | No | `30000` | Python call timeout (ms) |
| `CACHE_TTL` | No | `300` | Cache TTL in seconds |
| `CACHE_MAX_KEYS` | No | `500` | Max in-memory cache keys |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW` | No | `15` | Rate limit window (minutes) |
| `ALLOWED_ORIGINS` | No | `*` | CORS origins (comma-separated or `*`) |
| `API_VERSION` | No | `v1` | API version prefix |
| `API_NAME` | No | `Cymor Movie API` | API display name |

---

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### 🏠 Homepage

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/home` | Featured, trending movies & series |

### 🔍 Search

| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| GET | `/search` | `q` (required), `type`, `page`, `per_page` | Search content |

**`type` values:** `movie` · `series` · `all` (default)

### 🎬 Movies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/movies/trending` | Trending movies |
| GET | `/movies/popular` | Popular movies |
| GET | `/movies/latest` | Latest movies |

### 📺 Series

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/series/trending` | Trending TV series |
| GET | `/series/popular` | Popular TV series |
| GET | `/series/latest` | Latest TV series |
| GET | `/series/:id/episodes/:episode` | Episode download links |

### 📋 Content

| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| GET | `/content/:id` | `page_url`, `content_type` | Content details |
| GET | `/content/:id/streams` | `page_url`, `content_type`, `season`, `episode` | Stream links |
| GET | `/content/:id/downloads` | `page_url`, `content_type`, `season`, `episode` | Download links |
| GET | `/content/:id/subtitles` | `page_url`, `content_type`, `season`, `episode` | Subtitle links |

> **Note on `page_url`:** This is the MovieBox internal URL obtained from search results (e.g. `/detail/avatar-WLDIi21IUBa?id=8906247916759695608`). Pass it as a query param to all content endpoints.

### ❤️ Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Fast health check (no external calls) |
| GET | `/status` | Deep status (includes provider ping & cache stats) |

---

## Response Format

Every response follows a consistent envelope:

### ✅ Success

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "has_more": true
    }
  }
}
```

### ❌ Error

```json
{
  "success": false,
  "message": "Meaningful error message",
  "error": {
    "type": "ValidationError",
    "details": null
  }
}
```

---

## Usage Examples

### Search for a movie

```bash
curl "http://localhost:5000/api/v1/search?q=avatar&type=movie"
```

### Get content details

```bash
# First search to get page_url, then:
curl "http://localhost:5000/api/v1/content/avatar?page_url=/detail/avatar-WLDIi21IUBa%3Fid%3D8906247916759695608&content_type=movie"
```

### Get download links

```bash
curl "http://localhost:5000/api/v1/content/avatar/downloads?page_url=/detail/avatar-WLDIi21IUBa%3Fid%3D8906247916759695608"
```

### Get episode downloads (series)

```bash
curl "http://localhost:5000/api/v1/content/merlin/streams?page_url=/detail/merlin-sMxCiIO6fZ9%3Fid%3D8382755684005333552&content_type=series&season=1&episode=1"
```

---

## Typical Frontend Flow

```
1. GET /api/v1/home                  → Display homepage
2. GET /api/v1/search?q=avatar       → User searches
3. GET /api/v1/content/:id           → User clicks content (pass page_url from step 2)
4. GET /api/v1/content/:id/streams   → User clicks Watch (pass page_url from step 2)
5. Play video from returned URL in frontend player
```

The `page_url` value from search results must be stored on the frontend and passed to subsequent content/stream/download calls.

---

## Caching

| Endpoint Type | Cached? | TTL |
|---------------|---------|-----|
| Homepage | ✅ Yes | 5 min (default) |
| Search results | ✅ Yes | 5 min |
| Content details | ✅ Yes | 5 min |
| Trending / Popular | ✅ Yes | 5 min |
| Downloads | ❌ No | Always fresh |
| Streams | ❌ No | Always fresh |
| Subtitles | ❌ No | Always fresh |

Download/stream URLs from MovieBox expire, so they are never cached.

---

## Deployment on Render

### Recommended settings

- **Build Command:** `npm install && pip install moviebox-api --no-deps && pip install 'pydantic==2.9.2' rich click bs4 httpx throttlebuster`
- **Start Command:** `npm start`
- **Environment:** Node

### Required environment variables on Render

Set these in the Render dashboard:

```
NODE_ENV=production
PORT=5000
PYTHON_CMD=python3
```

---

## Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success |
| 400 | Bad Request — validation failed |
| 404 | Route or resource not found |
| 429 | Too Many Requests — rate limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway — MovieBox unavailable |
| 504 | Gateway Timeout — MovieBox too slow |

---

## Adding a New Provider

The codebase is designed for future provider swaps:

1. Create `src/services/newprovider.service.js` implementing the same method signatures as `moviebox.service.js`
2. Create `src/python/newprovider_bridge.py` (or an HTTP client if the new provider has a REST API)
3. Update `src/controllers/*.controller.js` to import the new service (or use an env variable to switch)
4. No frontend changes required

---

## License

MIT © Cymor Tech Services / Legendary Smiley Cymor

# Speed4You - ISP Entertainment Portal

[![GitHub Repo stars](https://img.shields.io/github/stars/jonyspeednet-alt/isp-entertainment-portal?style=social)](https://github.com/jonyspeednet-alt/isp-entertainment-portal)
[![GitHub last commit](https://img.shields.io/github/last-commit/jonyspeednet-alt/isp-entertainment-portal)](https://github.com/jonyspeednet-alt/isp-entertainment-portal/commits/main)
[![GitHub Issues](https://img.shields.io/github/issues/jonyspeednet-alt/isp-entertainment-portal)](https://github.com/jonyspeednet-alt/isp-entertainment-portal/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Overview

**Speed4You** is a self-hosted media streaming platform purpose-built for ISP (Internet Service Provider) networks. Think of it as a Netflix-style entertainment portal that runs entirely within your local ISP infrastructure, delivering movies, TV series, and live TV channels directly to your subscribers without consuming external bandwidth. Designed with the needs of regional and community ISPs in mind, Speed4You transforms your network into a premium entertainment destination, increasing subscriber value and reducing churn.

The platform consists of a modern React single-page application for the frontend and a robust Express.js API server on the backend, backed by PostgreSQL for persistent data storage. Content is served from the ISP's own media library, with intelligent FFmpeg-powered transcoding and remuxing to ensure every file plays smoothly in the browser. An integrated media scanner automatically discovers files on the server filesystem, parses filenames, classifies content as movies or series, and imports metadata from TMDb. The built-in media normalizer converts non-browser-friendly formats (like MKV with non-H.264 video or non-AAC audio) into universally compatible MP4 containers with H.264 video, AAC audio, and faststart enabled for instant playback.

Security is a first-class concern: Helmet hardens HTTP headers, express-rate-limit prevents abuse, JWT handles authentication, Joi validates all inputs, and CORS/CSP/HSTS policies are enforced. Network access control ensures only subscribers on the ISP network can reach the portal. The frontend is a fully responsive Progressive Web App with five breakpoint support (mobile, tablet, desktop, TV, 4K), a dedicated TV Mode optimized for remote navigation on large screens, and an installable PWA experience with service worker caching.

Whether you are a small neighborhood ISP looking to add a entertainment perk for your subscribers, or a larger regional provider wanting to reduce peering costs by serving popular content locally, Speed4You provides a complete, production-ready solution. Welcome -- shagotom!

---

## Features

### Content Catalog

The content catalog is the backbone of Speed4You, providing full CRUD (Create, Read, Update, Delete) operations for both movies and series. Content entries leverage PostgreSQL's JSONB columns for flexible metadata storage alongside strongly typed columns for high-performance queries on indexed fields like title, slug, type, genre, and year. Administrators can create new entries manually or let the media scanner auto-populate draft entries from discovered files. Each entry supports rich metadata including posters, backdrops, synopses, genre tags, language, release year, TMDb IDs, and custom collections. The catalog API supports pagination, filtering by multiple criteria, sorting, and full-text search, making it easy to build responsive browse and discovery experiences on the frontend.

### Homepage

The homepage delivers a cinematic, Netflix-inspired experience that immediately engages subscribers. At the top, a hero carousel showcases featured content with auto-rotation between items, a progress bar indicating the next slide transition, and thumbnail navigation for quick selection. Below the hero, multiple content rails present curated selections: "Continue Watching" for resuming partially viewed content, personalized recommendations, trending titles, latest additions, popular picks, dedicated movie and series rows, and specially curated Bengali picks for the local audience. Each rail is powered by TanStack Query for efficient data fetching and caching, and uses react-window for virtualized rendering to maintain smooth scrolling performance even with large catalogs.

### Browse and Search

The browse page provides a full catalog exploration experience with infinite scroll powered by react-window virtualization, ensuring thousands of titles load smoothly without DOM bloat. Users can filter content by genre, language, year, and custom collections, with sort options for title, date added, popularity, and release year. The integrated search feature offers autocomplete suggestions as users type, helping them find titles quickly. Dedicated browse views for movies-only and series-only provide focused discovery paths. All filters and sort preferences are reflected in the URL query parameters, enabling shareable links and browser back-button navigation.

### Movie and Series Details

Clicking on any title opens a rich detail page. For movies, the page displays a large backdrop image, poster art, full metadata (title, year, runtime, rating, synopsis), genre tags, a prominent play button linking directly to the video player, a share button, and a watchlist toggle. Series detail pages extend this with season tabs, an episodelist for each season, and episode-level navigation that links directly to the player at the correct episode. This hierarchical navigation makes it effortless for subscribers to explore an entire series and jump into any episode.

### Video Player

The custom HTML5 video player is engineered for the ISP streaming experience. It supports three playback strategies powered by FFmpeg on the backend: direct stream for browser-compatible MP4 files, remux for containers that just need re-packaging (e.g., MKV to MP4 without re-encoding), and full transcode for files requiring video or audio codec conversion. The player UI includes audio boost for low-volume content, gesture controls for touch devices (swipe to seek, double-tap to skip), Picture-in-Picture mode, playback speed control, and a progress bar with seek preview. Watch progress is tracked automatically so users can resume where they left off, and auto-play kicks in for the next episode in a series, creating a binge-watching experience.

### Watchlist

Every user can maintain a personal watchlist of titles they want to revisit or watch later. Adding and removing titles is a one-click action available from detail pages and content cards. The dedicated watchlist page displays all saved titles in a responsive grid with quick access to detail pages and the player. Watchlist data is persisted per user in PostgreSQL, ensuring preferences survive across sessions and devices.

### Watch Progress

The watch progress system tracks how far each user has watched into every title. This powers the "Continue Watching" rail on the homepage, showing partially viewed content with a progress indicator. When a user returns to a title they started, the player automatically resumes from the last watched position. Completion tracking marks titles as watched once the user reaches a threshold (typically 90% of the duration), which in turn influences recommendation algorithms and keeps the catalog tidy with visual "watched" indicators.

### Live TV

The Live TV feature integrates with the ISP's external TV portal to deliver a channel grid with HLS streaming. Channels are organized by categories (news, entertainment, sports, music, etc.), and each channel streams in real-time using the HLS protocol for broad browser compatibility. The channel grid is responsive and works well on both mobile devices and TV screens, making it easy for subscribers to flip through live channels just like traditional broadcast TV.

### Admin Dashboard

The admin dashboard provides a high-level overview of the platform's state at a glance. It displays key statistics (total content, movies, series, users, watchlist entries), recent content additions, and quick-action buttons for common tasks like adding new content, running the media scanner, or starting the media normalizer. The normalizer section includes a live progress display showing the current file being processed, completed count, and estimated remaining files, giving administrators real-time visibility into the conversion pipeline.

### Admin Content Management

The content library management page is a powerful interface for administrators to maintain the entire catalog. It provides full library browsing with search, filtering, and sorting; a scanner integration panel to trigger media scans and review discovered files; TMDb metadata import to enrich draft entries with official posters, synopses, and cast information; duplicate detection to identify and clean duplicate catalog entries; bulk operations for publishing, unpublishing, or deleting multiple entries at once; and CSV export for reporting or migration purposes. This comprehensive toolset ensures administrators can efficiently manage even large catalogs.

### Media Scanner

The media scanner is an automated filesystem crawler that discovers media files on the server. It reads configured scan paths from the scanner roots configuration, recursively traverses directories, parses filenames to extract title, season, episode, and year information, auto-classifies files as movies or series based on naming patterns and directory structure, and creates draft catalog entries ready for administrator review and publishing. The scanner runs as a background service with configurable intervals and maintains a full audit trail in the scanner_runs and scanner_roots database tables.

### Media Normalizer

The media normalizer is a critical backend service that ensures all media files are in a browser-compatible format. It scans catalog entries for files that are not MP4 with H.264 video and AAC audio, then converts them one at a time using FFmpeg. The conversion pipeline transcodes video to H.264 with configurable CRF quality and encoding preset, converts audio to AAC, remuxes into an MP4 container with the faststart flag (moov atom before mdat) for instant playback, validates the output file's duration and format before replacing the original, and deletes the source file only after successful verification. This one-by-one approach prevents server overload and ensures system stability even during large batch conversions. State and lock files under `backend/src/data/` prevent concurrent runs and track progress.

### Duplicate Detection

Over time, especially after multiple scanner runs or manual additions, the catalog can accumulate duplicate entries. The duplicate detection service identifies potential duplicates by comparing titles, TMDb IDs, and file paths, then presents them for administrator review. This helps keep the catalog clean and prevents subscriber confusion from seeing the same title listed multiple times. Detected duplicates can be merged or deleted directly from the admin content management interface.

### Network Access Control

Speed4You includes ISP-only access restriction to ensure the portal is exclusively available to subscribers on the ISP's network. This is enforced at the middleware level, checking incoming request origins against allowed network ranges. Subscribers outside the ISP network see a friendly access-denied page with information about how to connect. This feature protects content licensing agreements and ensures the platform serves its intended audience.

### Security

Security is woven into every layer of the application. Helmet 8 sets hardened HTTP headers including Content-Security-Policy, Strict-Transport-Security, and X-Content-Type-Options. Express Rate Limit 8 provides configurable rate limiting with separate limits for global API access and public endpoints, preventing brute-force and denial-of-service attacks. JWT-based authentication secures admin and user sessions with signed tokens. Joi validation schemas enforce strict input validation on every API endpoint, preventing injection attacks and malformed data. CORS is configured with explicit allowed origins (required in production), and CSP policies restrict resource loading to trusted sources. All sensitive credentials are managed through environment variables, never hardcoded.

### PWA Support

Speed4You is a fully installable Progressive Web App. The service worker (`sw.js`) caches static assets and API responses for offline-capable navigation, while `manifest.json` defines the app name, icons, theme color, and display mode. An install banner prompts users on supported browsers to add the app to their home screen, providing a native-app-like experience without app store distribution. This is especially valuable for ISP subscribers who access the portal primarily from mobile devices or smart TVs.

### Responsive Design and TV Mode

The frontend is built with five responsive breakpoints: mobile (up to 640px), tablet (641-1024px), desktop (1025-1440px), TV (1441-2560px), and 4K (2561px+). Each breakpoint has tailored layouts, typography, and interaction patterns. The dedicated TV Mode optimizes the interface for large screens viewed from a distance, with larger touch targets, simplified navigation optimized for TV remote D-pad input, and a streamlined layout that prioritizes content visibility. A custom `useTVMode` hook detects large-screen viewports and adjusts component behavior accordingly, ensuring a comfortable viewing experience whether the subscriber is on a phone, laptop, or living room TV.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | React | 18+ | Component-based UI with hooks, context, and concurrent features |
| Build Tool | Vite | 4+ | Fast dev server, HMR, optimized production builds with Terser |
| Routing | React Router | 6+ | Client-side routing with nested routes and lazy loading |
| Data Fetching | TanStack Query | 5+ | Server state management, caching, background refetching |
| Animation | Framer Motion | 10+ | Declarative animations, page transitions, gesture support |
| Virtualization | react-window | 1+ | Efficient rendering of large lists with infinite scroll |
| Backend Framework | Express | 4.22+ | HTTP server, middleware pipeline, REST API routes |
| Database | PostgreSQL (pg) | 8.11+ | Relational data storage with JSONB for flexible metadata |
| Authentication | JWT (jsonwebtoken) | 9+ | Stateless token-based auth for admin and user sessions |
| Password Hashing | bcryptjs | 2.4+ | Secure bcrypt hashing for admin credentials |
| Input Validation | Joi | 18+ | Schema-based validation for all API request payloads |
| HTTP Security | Helmet | 8+ | Hardened HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| Rate Limiting | express-rate-limit | 8+ | Configurable request throttling per route and globally |
| Media Processing | FFmpeg | - | Transcoding, remuxing, audio normalization, faststart |
| Frontend Hosting | Firebase Hosting | - | CDN-backed static hosting with SSL and custom domain |
| Backend Hosting | Express on ISP Server | - | Self-hosted API server within ISP infrastructure |
| Dev Frontend Port | Vite Dev Server | 4173 | Local development with HMR and API proxy |
| Dev Backend Port | Express | 3001 | Local API server with nodemon auto-restart |

---

## Quick Start

### Prerequisites

Before you begin, ensure your system meets the following requirements:

- **Node.js** 18 or later (LTS recommended)
- **npm** 9 or later (bundled with Node.js)
- **PostgreSQL** 14 or later (running and accessible)
- **FFmpeg** installed and available on the system PATH (required for media normalization and streaming)
- A TMDb API key (optional, for metadata enrichment) -- request one at [themoviedb.org](https://www.themoviedb.org/settings/api)

### Installation

Clone the repository and install all dependencies for both the frontend and backend in a single command:

```bash
git clone https://github.com/jonyspeednet-alt/isp-entertainment-portal.git
cd isp-entertainment-portal
npm run install:all
```

This runs `npm install` in both the `frontend/` and `backend/` directories. On Windows, you can also double-click `install-all.bat` in the `scripts/setup/` directory.

### Environment Setup

Create a `.env` file in the `backend/` directory with the required configuration. At minimum, you need to set the database connection string and JWT secret:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=<YOUR_JWT_SECRET>
DATABASE_URL=postgresql://<YOUR_DB_USER>:<YOUR_DB_PASSWORD>@<YOUR_DB_HOST>:5432/<YOUR_DB_NAME>
TMDB_API_KEY=<YOUR_TMDB_API_KEY>
CORS_ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173
```

Never commit real credentials to the repository. Use placeholder values in documentation and real values only in your local `.env` file, which is included in `.gitignore`.

### Database Initialization

Run the database initialization script to create the required tables and indexes:

```bash
cd backend
npm run db:init
```

This executes the SQL scripts in `backend/src/db/init.sql` and the migration files in `backend/migrations/`, creating tables for `content_catalog`, `app_state`, `admin_users`, `users`, `watchlist_entries`, `watch_progress`, `scanner_roots`, and `scanner_runs`.

### Development

Start both the frontend and backend development servers:

```bash
npm run dev
```

This launches:
- **Frontend** at `http://127.0.0.1:4173` -- Vite dev server with hot module replacement and an API proxy that forwards `/portal-api` requests to the backend
- **Backend** at `http://127.0.0.1:3001` -- Express server with nodemon for automatic restart on code changes

On Windows, you can also double-click `run-dev.bat` in the project root. The Vite dev server proxies API requests from `/portal-api/*` to the backend, so the frontend can make relative API calls without CORS issues during development.

### Production Build and Start

To build the frontend for production and start the combined server:

```bash
npm run start
```

This performs two steps:
1. Builds the frontend using Vite with Terser minification, CSS code splitting, and manual chunk optimization
2. Starts the Express backend, which serves the built frontend assets as static files

The production server listens on the port specified by the `PORT` environment variable (default: 3001). Access the application at `http://<YOUR_SERVER_IP>:3001/portal/`. On Windows, you can also double-click `build-and-run.bat` or `one-click-run.bat` for automated setup.

---

## Project Structure

```
speed4you/
├── frontend/                  # React + Vite client application
│   ├── src/
│   │   ├── pages/             # Page-level components (HomePage, BrowsePage, PlayerPage, etc.)
│   │   ├── components/
│   │   │   ├── ui/            # Reusable UI primitives (Button, Input, Modal, Toast, Badge, etc.)
│   │   │   ├── media/         # Media display components (PosterImage, BannerImage, PlayButton)
│   │   │   ├── navigation/    # Nav components (TopNav, MobileNav, GlobalSearchModal, ProfileMenu)
│   │   │   ├── forms/         # Form components (FilterBar, SearchInput, SelectField)
│   │   │   ├── feedback/      # State components (ErrorBoundary, LoadingState, EmptyState, Skeleton)
│   │   │   └── overlays/      # Overlay components (ConfirmDialog, InfoModal, QuickViewModal)
│   │   ├── services/          # API service modules (contentService, playerService, authService, etc.)
│   │   ├── features/
│   │   │   ├── home/          # Homepage feature (HeroCarousel, ContentRail, TrendingBento)
│   │   │   └── continueWatching/  # Continue watching feature (ContinueWatchingRail)
│   │   ├── layouts/           # Layout wrappers (MainSiteLayout, AdminLayout)
│   │   ├── hooks/             # Custom React hooks (useTVMode, etc.)
│   │   ├── app/               # Router configuration (router.jsx)
│   │   ├── styles/            # Global CSS stylesheets
│   │   └── constants/         # Application-wide constants
│   ├── public/                # Static assets (icons, manifest.json, service worker, SVGs)
│   └── vite.config.js         # Vite build and dev server configuration
├── backend/                   # Express API server
│   ├── src/
│   │   ├── routes/            # API route handlers (content, movies, series, player, tv, auth, admin, etc.)
│   │   ├── services/          # Business logic services
│   │   │   ├── scanner.js             # Media filesystem scanner
│   │   │   ├── scanner-worker.js      # Scanner background worker
│   │   │   ├── scanner-series-parser.js  # Series filename parsing
│   │   │   ├── scanner-enhanced-metadata.js  # Enhanced metadata extraction
│   │   │   ├── scanner-cache.js       # Scanner result caching
│   │   │   ├── scanner-batch-operations.js  # Bulk scanner actions
│   │   │   ├── scanner-error-handler.js  # Scanner error management
│   │   │   ├── player-media.js        # Player strategy selection (direct/remux/transcode)
│   │   │   ├── media-normalizer.js    # Media format normalization pipeline
│   │   │   ├── metadata-enricher.js   # TMDb metadata import
│   │   │   └── duplicate-review.js    # Duplicate detection and cleanup
│   │   ├── data/              # Data store and database access layer
│   │   │   ├── store/         # Modular store (base, content, admin, user, scanner, helpers, helpers-search)
│   │   │   ├── catalog.json   # Local catalog fallback
│   │   │   └── migrations.js  # Data migration utilities
│   │   ├── middleware/        # Express middleware
│   │   │   ├── require-admin-auth.js  # JWT admin authentication guard
│   │   │   ├── resolve-user-id.js     # User identification from tokens
│   │   │   ├── validate.js            # Joi schema validation middleware
│   │   │   └── response-optimizer.js  # Response compression and optimization
│   │   ├── controllers/       # Request controllers (adminController, etc.)
│   │   ├── config/            # Configuration modules
│   │   │   ├── auth.js        # Authentication configuration
│   │   │   ├── database.js    # PostgreSQL connection pool setup
│   │   │   ├── env-check.js   # Environment variable validation at startup
│   │   │   └── player-cache.js  # Player cache configuration
│   │   ├── utils/             # Utility modules
│   │   │   ├── logger.js      # Structured logging
│   │   │   ├── validation-schemas.js  # Joi schemas for all API endpoints
│   │   │   ├── error.js       # Custom error classes
│   │   │   └── assetHelper.js # Asset path resolution
│   │   └── db/                # SQL initialization scripts (init.sql)
│   ├── scripts/               # Admin and maintenance scripts
│   │   ├── normalize-media-library.js  # Media normalizer CLI entry point
│   │   ├── init-content-store.js       # Database initialization
│   │   ├── bulk-enrich-publish.js      # Bulk TMDb enrichment and publish
│   │   ├── analyze-media-compat.js     # Media compatibility analyzer
│   │   ├── audit-player-library.js     # Player cache auditing
│   │   ├── optimize-media-cache.js     # Cache optimization
│   │   ├── create-indexes.js           # Database index creation
│   │   ├── reconcile-scanner-library.js # Scanner-library reconciliation
│   │   └── seed-test-data.js           # Test data seeding
│   ├── tests/                 # Test suites (scanner, player, auth, metadata, validation)
│   └── migrations/            # SQL migration files (001, 002, 003)
├── scripts/                   # Build and deployment scripts
│   ├── dev-runner.cjs         # Development server orchestrator
│   ├── start-runner.cjs       # Production start orchestrator
│   ├── prepare-deploy.cjs     # Deployment package preparation
│   ├── deploy.sh              # Shell deployment script
│   ├── backup-db.sh           # Database backup script
│   ├── one-click-deploy.ps1   # PowerShell deployment automation
│   └── maintenance/           # Runtime maintenance and patch scripts
├── docs/                      # Project documentation
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── LOCAL_NETWORK_DEPLOYMENT_GUIDE.md
│   ├── TV_MODE_VISUAL_GUIDE.md
│   └── ...                    # Additional documentation files
├── firebase.json              # Firebase Hosting configuration for frontend deployment
├── package.json               # Workspace root package with orchestration scripts
└── README.md                  # This file
```

---

## Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/` | Homepage | Hero carousel with auto-rotation and content rails (continue watching, recommendations, trending, latest, popular, movies, series, Bengali picks) |
| `/browse` | Browse | Full catalog browser with infinite scroll, multi-criteria filters, sort options, and search autocomplete |
| `/movies` | Movies Browse | Movie-only filtered browse view |
| `/series` | Series Browse | Series-only filtered browse view |
| `/movies/:slug` | Movie Detail | Movie detail page with poster, backdrop, metadata, genres, play link, share, and watchlist toggle |
| `/series/:slug` | Series Detail | Series detail page with season tabs, episode list, and episode-level player navigation |
| `/watchlist` | Watchlist | User's personal saved titles with quick-access to detail pages and the player |
| `/watch/:contentId` | Video Player | Custom HTML5 player with FFmpeg-backed streaming, progress tracking, and auto-play |
| `/play/:contentId` | Player Alias | Alternative route to the video player |
| `/tv` | Live TV | Channel grid with HLS streaming organized by categories |
| `/access` | Network Access | Network access check page for ISP subscribers |
| `/login` | Admin Login | Administrator authentication page |
| `/admin` | Admin Dashboard | Platform overview with stats, recent content, quick actions, and normalizer progress |
| `/admin/content` | Content Library | Full library management with search, filters, scanner integration, and bulk operations |
| `/admin/content/new` | Add Content | Form for manually creating new catalog entries |
| `/admin/content/:id/edit` | Edit Content | Form for editing existing catalog entries |

---

## Environment Variables

All environment variables are configured in the `backend/.env` file. Never commit this file to version control; a `.env.example` template should be provided for reference.

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | No | The port on which the Express backend server listens for incoming HTTP requests. Change this if port 3001 is already in use on your server. |
| `NODE_ENV` | `development` | No | The application environment mode. Set to `production` for live deployments to enable security hardening (strict CORS, Helmet policies, no sourcemaps). Set to `development` for local work. |
| `JWT_SECRET` | - | Yes | The secret key used to sign and verify JSON Web Tokens for admin and user authentication. Must be a long, cryptographically random string. Generate one with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. |
| `TMDB_API_KEY` | - | No | The Movie Database API key used for metadata enrichment. When provided, the metadata enricher service can fetch official posters, synopses, cast information, and ratings from TMDb. Request a free key at themoviedb.org. |
| `CORS_ALLOWED_ORIGINS` | - | Yes (prod) | Comma-separated list of origin URLs permitted to make cross-origin requests to the API. In production, this must be set to your frontend's origin (e.g., `https://portal.yourisp.com,http://<YOUR_SERVER_IP>:3001`). In development, `http://127.0.0.1:4173` is typical. |
| `DATABASE_URL` | - | Yes | PostgreSQL connection string in the format `postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>`. This is the primary database connection used by the pg driver for all data operations. |
| `TRUST_PROXY_HOPS` | `1` | No | The number of proxy hops to trust when the application runs behind a reverse proxy (nginx, Cloudflare, etc.). Set to the number of trusted proxies in your infrastructure chain. A value of 1 is appropriate for a single reverse proxy layer. |
| `GLOBAL_API_RATE_LIMIT_MAX` | `5000` | No | Maximum number of API requests allowed globally per time window. This protects the server from being overwhelmed by excessive traffic. Adjust based on your subscriber count and traffic patterns. |
| `PUBLIC_API_RATE_LIMIT_MAX` | `20000` | No | Maximum number of requests allowed on public (unauthenticated) API endpoints per time window. This is intentionally higher than the global limit to accommodate browse and search traffic from all subscribers. |
| `MEDIA_NORMALIZER_CRF` | `19` | No | The Constant Rate Factor for FFmpeg video transcoding. Lower values produce higher quality but larger files; higher values produce smaller files at reduced quality. A range of 18-28 is typical; 19 is a good balance for ISP streaming. |
| `MEDIA_NORMALIZER_PRESET` | `medium` | No | The FFmpeg encoding preset controlling the speed-compression tradeoff. Options from slowest/best to fastest/worst: `veryslow`, `slower`, `slow`, `medium`, `fast`, `faster`, `veryfast`, `ultrafast`. `medium` is the recommended default. |
| `MEDIA_NORMALIZER_MIN_FREE_GB` | `10` | No | Minimum free disk space in gigabytes required before the normalizer will process a new file. If available disk space falls below this threshold, normalization pauses to prevent server disk exhaustion. |
| `MEDIA_NORMALIZER_SCAN_INTERVAL_MS` | `15000` | No | The interval in milliseconds between normalizer scan cycles. After completing one file, the normalizer waits this duration before checking for the next file to process. 15000ms (15 seconds) balances throughput with system load. |

---

## Media Normalizer

The Media Normalizer is a dedicated backend service that ensures every media file in the catalog is in a browser-compatible format. Without normalization, subscribers would encounter playback failures on files encoded with codecs like HEVC (H.265), VP9, or audio codecs like FLAC or DTS that most browsers cannot decode natively. The normalizer converts these files into the universal web format: MP4 container with H.264 video, AAC audio, and the faststart flag enabled, which places the moov atom before the mdat section for instant playback start.

### How It Works

The normalizer operates on a one-file-at-a-time basis to prevent server resource exhaustion. Each cycle follows this sequence:

1. **Scan** -- The normalizer queries the content catalog for entries whose media files are not in the target format (MP4 with H.264 + AAC + faststart). It checks the configured scan paths from `scanner-roots.json`.
2. **Select** -- One file is selected for processing. A lock file (`media-normalizer.lock`) is created to prevent concurrent runs.
3. **Transcode** -- FFmpeg is invoked with the configured CRF and preset to convert the file. The output is written to a temporary file alongside the original.
4. **Validate** -- After transcoding, the output file is validated by checking its duration against the original and verifying the container format and codec. If validation fails, the temporary file is deleted and the error is logged.
5. **Replace** -- Upon successful validation, the original file is replaced with the normalized version. The source file is deleted only after the replacement is confirmed, ensuring no data loss.
6. **Update State** -- The normalizer state file (`media-normalizer-state.json`) is updated with the completed file's details, and the catalog entry is updated to reflect the new file format.
7. **Wait** -- The normalizer waits for the configured scan interval before beginning the next cycle.

### Running the Normalizer

```bash
cd backend
npm run media:normalize-library
```

This starts the normalizer as a long-running process. It will continue processing files until no more non-compliant files are found, then idle and re-scan at the configured interval. The normalizer also exposes a live progress endpoint that the admin dashboard consumes to display real-time conversion status.

### Configuration

The normalizer's behavior is controlled entirely through environment variables (see the Environment Variables table above). Key tuning parameters include `MEDIA_NORMALIZER_CRF` for video quality vs. file size, `MEDIA_NORMALIZER_PRESET` for encoding speed vs. compression efficiency, and `MEDIA_NORMALIZER_MIN_FREE_GB` as a safety valve against disk space exhaustion. The state and lock files are stored in `backend/src/data/` and should not be manually modified while the normalizer is running.

---

## Deployment

Speed4You supports multiple deployment strategies depending on your infrastructure. The frontend is designed for Firebase Hosting (or any static CDN), while the backend runs on a server within the ISP network for low-latency media streaming.

For a complete, step-by-step deployment guide including server setup, PostgreSQL configuration, reverse proxy configuration, SSL certificate provisioning, and CI/CD pipeline setup, refer to the dedicated deployment documentation:

- **Full Deployment Guide:** [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)
- **Local Network Deployment:** [docs/LOCAL_NETWORK_DEPLOYMENT_GUIDE.md](docs/LOCAL_NETWORK_DEPLOYMENT_GUIDE.md)

### Quick Deployment Summary

1. Set up a Linux server within your ISP network with Node.js, PostgreSQL, and FFmpeg installed.
2. Clone the repository and run `npm run install:all`.
3. Configure `backend/.env` with your production values (use `<YOUR_SERVER_IP>` for host references).
4. Initialize the database with `cd backend && npm run db:init`.
5. Build and start the server with `npm run start`.
6. Optionally deploy the frontend to Firebase Hosting using `firebase deploy` after running `npm run build`.
7. Configure a reverse proxy (nginx recommended) with SSL termination for production HTTPS access.

Automated deployment scripts are available in the `scripts/` directory, and a GitHub Actions workflow is configured in `github-deploy.yml` for CI/CD deployments triggered by pushes to the main branch. See the deployment documentation for required GitHub repository secrets and their configuration.

---

## Contributing

Contributions to Speed4You are welcome and appreciated. Whether you are fixing a bug, adding a new feature, improving documentation, or optimizing performance, your help makes the platform better for every ISP and subscriber.

For detailed contribution guidelines including code style expectations, branch naming conventions, commit message format, pull request process, and development workflow, please refer to the contribution guide:

- **Contributing Guide:** [CONTRIBUTING.md](CONTRIBUTING.md)

In summary, the contribution process involves forking the repository, creating a feature branch from `main`, making your changes with appropriate test coverage, ensuring all existing tests pass, and submitting a pull request with a clear description of the change and its motivation. Please open an issue before starting work on significant changes to discuss the approach and avoid duplicated effort.

---

## License

This project is licensed under the **MIT License**. You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, subject to the condition that the original copyright notice and permission notice are included in all copies or substantial portions of the software.

The full license text is available in the [LICENSE](LICENSE) file.

```
MIT License

Copyright (c) 2024 Speed4You

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

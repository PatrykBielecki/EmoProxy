# Emotions Visualization Research Platform

A full-stack monorepo for emotion visualization research. Participants complete a browser-based survey in which they configure animated shapes to express named emotions. The resulting data is stored in PostgreSQL and analyzed through a password-protected admin panel.

## Table of Contents

- [Architecture](#architecture)
- [Survey flow](#survey-flow)
- [Admin panel](#admin-panel)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Analytics](#analytics)
- [Export](#export)
- [Internationalization](#internationalization)
- [Requirements](#requirements)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development without Docker](#local-development-without-docker)
- [Environment variables](#environment-variables)
- [Project scripts](#project-scripts)
- [Extending the platform](#extending-the-platform)

---

## Architecture

The repository is an npm workspaces monorepo with three packages:

```
apps/
  web/   Next.js 16 + React 19 + TypeScript + Tailwind CSS
  api/   Fastify 5 + TypeScript + Prisma 6 + PostgreSQL 17
packages/
  shared/  Zod schemas and scale-conversion utilities shared by both apps
```

The web frontend communicates with the API over HTTP. All survey submissions and configuration are stored in a single PostgreSQL database managed by Prisma.

---

## Survey flow

The public survey at `/` proceeds through four stages:

1. **Welcome** - Displays the configurable intro title and description. The participant reads the instructions and clicks "Start survey".

2. **Animation creation** (Step 2/4) - For each configured emotion the participant:
   - Selects a shape (circle, square, triangle, star, ellipse, rhombus, or a custom SVG shape configured by the admin).
   - Selects an animation type (bounce, rotate, fade, shake, scale, flip, stretch, or a custom animation configured by the admin with CSS keyframe JSON).
   - Picks a color with an HSV color picker.
   - Adjusts size and speed sliders within the admin-configured scale range. The sliders map to physical pixels (50-250 px) and a speed factor (0.5-3.0) via linear interpolation.
   - A live preview reflects all changes in real time.

3. **VAD rating** (Step 3/4) - The participant re-evaluates each completed animation in a randomized order, rating it on three 0-10 sliders without seeing the emotion label:
   - Valence (negative to positive)
   - Arousal (calm to excited)
   - Dominance (submissive to dominant)

4. **Demographics** (Step 4/4) - Optional fields for age, country, and gender. Which fields appear is controlled by the admin via additional field toggles.

After submission, a thank-you screen is shown. The browser history is locked so the back button cannot re-open the completed survey.

---

## Admin panel

The admin panel is at `/admin`. An unauthenticated visit redirects to `/admin/login`.

### Authentication

Login uses username and password. A JWT is issued and stored in an HTTP-only `session` cookie (8-hour expiry). The cookie is `secure` in production.

### Tabs

**Configuration**

- Edit the survey intro title and description.
- Toggle emotions on/off, change labels and display order.
- Toggle shape presets on/off, change names and order. Custom shapes accept an SVG string that must include a root `<svg>` element and `viewBox="0 0 100 100"`.
- Toggle animation presets on/off, change names. Custom animations accept a CSS keyframes body as a JSON string; the frontend injects `@keyframes custom-{type}{...}` at runtime.
- Toggle and reorder additional demographic fields (age, country, gender).
- Configure scale range labels for size and speed sliders (e.g. 1-10).
- User management: create new admin users, change passwords.

**Responses**

- Browse all submitted survey sessions in a table.
- Each row expands to show every emotion response with its shape, animation, color, size, speed, and VAD values.

**Analytics**

- Configure outlier filtering: enable/disable Z-score filtering and set the threshold (default 2.0).
- View computed statistics:
  - Respondent summary (total sessions, total responses, accepted/rejected counts, age mean, SD, min/max).
  - Mean VAD bar chart per emotion.
  - VAD radar chart showing centroids per emotion.
  - VAD statistics table (mean, SD, median per emotion).
  - VAD centroid and nearest-neighbor mapping table.
  - Pearson correlation matrix across valence, arousal, dominance, size, and speed (numeric parameters plus binary shape and animation indicator variables).
  - Emotion-parameter matrix showing the top shape, animation, color, and color family per emotion.
  - Shape, animation, and color family statistics tables.
  - Gender and country distribution pie charts.
  - Demographic statistics breakdowns by gender and country.
  - Auto-generated textual insights (highest valence/arousal/dominance emotion, strongest correlation).

**Data and Statistics Export**

- Download raw response data as JSON, CSV, or XLSX.
- Download a multi-sheet XLSX that includes raw data and full statistics sheets.
- Generate a PDF report (rendered client-side using jsPDF and html2canvas) containing summary tables, VAD stats, correlations, parameter stats, demographic stats, and a chart screenshot.

---

## API reference

All routes are prefixed under `http://localhost:4000`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Returns `{ ok: true }` |
| GET | `/api/public/config` | None | Returns survey configuration (emotions, shapes, animations, additional fields) |
| POST | `/api/survey/session` | None | Submit a completed survey |
| POST | `/api/auth/login` | None | Log in; sets `session` cookie |
| POST | `/api/auth/logout` | None | Clears `session` cookie |
| GET | `/api/auth/me` | Cookie | Returns current user info |
| POST | `/api/auth/change-password` | Cookie | Change own password |
| GET | `/api/admin/config` | Cookie | Full admin configuration |
| PUT | `/api/admin/config/survey` | Cookie | Save survey configuration |
| PUT | `/api/admin/config/analytics` | Cookie | Save analytics settings |
| GET | `/api/admin/survey-sessions` | Cookie | List all survey sessions with responses |
| GET | `/api/admin/analytics` | Cookie | Compute and return analytics payload |
| GET | `/api/admin/export?format=json\|csv\|xlsx` | Cookie | Export raw response data |
| GET | `/api/admin/export?format=xlsx&include=statistics` | Cookie | Export data with statistics sheets |
| GET | `/api/admin/users` | Cookie | List admin users |
| POST | `/api/admin/users` | Cookie | Create admin user |
| POST | `/api/admin/users/password` | Cookie | Reset a user's password |

Rate limiting is applied globally. Login is limited to 10 requests per minute. All other authenticated routes use the globally configured window.

---

## Data model

The database has the following tables:

| Table | Purpose |
|-------|---------|
| `User` | Admin accounts (username + bcrypt password hash) |
| `SurveyConfig` | Single-row configuration for the survey (intro text, emotion count, scale ranges) |
| `Emotion` | Configurable emotion labels shown in the survey |
| `ShapePreset` | Shape options available in the survey (built-in key or custom SVG) |
| `AnimationPreset` | Animation options available in the survey (built-in type or custom keyframes JSON) |
| `AdditionalField` | Optional demographic fields (text, number, or boolean) |
| `AnalyticsSetting` | Single-row outlier filtering configuration |
| `StorageConfig` | Storage mode setting (currently only `internal_postgres` is active) |
| `SurveySession` | One row per completed survey submission (demographics, metadata) |
| `EmotionResponse` | One row per emotion per session (shape, animation, color with HSV decomposition, size, speed, VAD) |
| `SurveyAdditionalResponse` | Key-value pairs for additional demographic field answers |
| `AnalyticsRun` | Persisted analytics computation results (JSON) |

---

## Analytics

The analytics computation happens on demand when the admin requests the analytics endpoint. Processing steps:

1. All emotion responses are loaded with their session demographics.
2. If outlier filtering is enabled, responses whose VAD or size/speed values deviate more than the configured Z-score threshold from the per-emotion mean are marked as rejected.
3. For each emotion, the following are computed over accepted responses: mean, standard deviation, and median of valence, arousal, dominance, size, and speed.
4. VAD centroids are computed per emotion. Each centroid is compared against all other centroids to find the nearest neighbor by Euclidean distance in 3D VAD space.
5. Full pairwise Pearson correlations are computed across all five numeric parameters (valence, arousal, dominance, size, speed).
6. Category statistics (shape, animation type, color hex, color family) are computed, including per-category mean and SD of all numeric parameters.
7. Color family classification uses HSV: low saturation (S < 0.12) maps to neutral families (white, light gray, dark gray, black); otherwise the hue angle determines the family (red, orange, yellow, green, teal, blue, purple, pink).
8. Demographic statistics (gender, country) include VAD means and SDs per group.
9. An emotion-parameter matrix summarizes top shape, animation, and color choices per emotion.

---

## Export

Three export formats are available for raw response data:

- **JSON** - Array of flat row objects, one per emotion response.
- **CSV** - Same rows as JSON, comma-separated.
- **XLSX (raw)** - Single worksheet with the same columns.
- **XLSX with statistics** - Multi-sheet workbook containing: raw responses, VAD stats, correlations, shape stats, animation stats, color family stats, gender stats, country stats.

A **PDF report** can be generated directly in the browser (no server round-trip). It is built using jsPDF and html2canvas and contains: a respondent summary table, VAD statistics per emotion, VAD centroid mapping, Pearson correlation table, parameter statistics tables, demographic tables, and a screenshot of the analytics charts.

Exported XLSX files use the ExcelJS library on the API. PDF generation happens entirely on the client side.

---

## Internationalization

The survey and admin interface support English and Polish. The language switcher is a fixed-position dropdown rendered in the top-left corner of every page.

- All translation strings are centralized in `apps/web/lib/i18n.ts`.
- The active locale is stored in React context and persisted across navigation.
- The language switcher is rendered after client mount only to avoid Next.js hydration mismatches.

---

## Requirements

- Docker and Docker Compose (for the containerized stack)
- Node.js 20 or later (for local development without Docker)

---

## Quick start with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/PatrykBielecki/emotions-survey.git
   cd emotions-survey
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Change `JWT_SECRET`, `ADMIN_DEFAULT_USERNAME`, and `ADMIN_DEFAULT_PASSWORD` before running in any non-local environment.

3. Build and start all services:
   ```bash
   docker compose up --build
   ```

4. Open:
   - Survey: `http://localhost:3000`
   - Admin login: `http://localhost:3000/admin/login`
   - API health check: `http://localhost:4000/health`

On first startup the API automatically runs Prisma migrations and an idempotent seed script that creates the default admin user and populates default emotions, shapes, and animation presets.

---

## Local development without Docker

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

3. Start everything with a single command (spins up the database container, runs migrations, seeds, and starts both the API and web dev servers):
   ```bash
   npm run dev:local
   ```

4. Open:
   - Survey: `http://localhost:3000`
   - Admin login: `http://localhost:3000/admin/login`
   - API: `http://localhost:4000`

5. To stop the database container:
   ```bash
   npm run dev:down
   ```

If you need to run steps individually:

```bash
# Start only the database container
npm run dev:db

# Generate the Prisma client after schema changes
npm run db:generate --workspace @repo/api

# Apply pending migrations
npm run db:migrate --workspace @repo/api

# Run the seed script
npm run db:seed --workspace @repo/api

# Start both API and web dev servers in parallel
npm run dev:apps
```

If you access the Next.js dev server from another device on the local network, add its IP or hostname to `NEXT_ALLOWED_DEV_ORIGINS` in `.env` (comma-separated) and restart the web dev server.

---

## Environment variables

Copy `.env.example` to `.env` and adjust the values. All variables are read by the API at startup from the monorepo root `.env` file.

| Variable | Description |
|----------|-------------|
| `POSTGRES_DB` | PostgreSQL database name (used by Docker Compose) |
| `POSTGRES_USER` | PostgreSQL user (used by Docker Compose) |
| `POSTGRES_PASSWORD` | PostgreSQL password (used by Docker Compose) |
| `DATABASE_URL` | Prisma connection string used by the API (e.g. `postgresql://user:pass@localhost:5432/dbname?schema=public`) |
| `JWT_SECRET` | Secret key for signing JWT session tokens. Use a long random string in production. |
| `ADMIN_DEFAULT_USERNAME` | Username for the default admin account created by the seed script |
| `ADMIN_DEFAULT_PASSWORD` | Password for the default admin account (minimum 8 characters) |
| `RATE_LIMIT_MAX` | Maximum number of requests per time window per client |
| `RATE_LIMIT_TIME_WINDOW` | Duration of the rate-limit window. Must be quoted in the `.env` file when it contains a space (e.g. `"1 minute"`) |
| `CORS_ORIGIN` | Allowed frontend origins for the API, comma-separated (e.g. `http://localhost:3000,http://127.0.0.1:3000`). In non-production mode all origins are allowed. |
| `NEXT_PUBLIC_API_URL` | The API base URL as seen by the browser (e.g. `http://localhost:4000`) |
| `NEXT_ALLOWED_DEV_ORIGINS` | Comma-separated hostnames or IPs allowed to load Next.js dev assets when testing from other devices on the local network |

---

## Project scripts

Run from the monorepo root:

| Command | Description |
|---------|-------------|
| `npm run dev:local` | Start the database container, run migrations and seed, then start both dev servers |
| `npm run dev:db` | Start only the PostgreSQL container |
| `npm run dev:apps` | Start the API and web dev servers in parallel |
| `npm run dev:web` | Start only the Next.js dev server |
| `npm run dev:api` | Start only the API dev server |
| `npm run dev:down` | Stop the Docker Compose services |
| `npm run build` | Build all workspaces |
| `npm run lint` | Type-check all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run db:generate --workspace @repo/api` | Regenerate the Prisma client after schema changes |
| `npm run db:migrate --workspace @repo/api` | Apply pending database migrations |
| `npm run db:seed --workspace @repo/api` | Run the database seed script |

---

## Extending the platform

**Adding new emotions, shapes, or animations** - These are fully managed through the admin configuration tab without any code changes.

**Custom shapes** - The admin can paste an SVG string into a shape preset. The SVG must include a `<svg>` root element and `viewBox="0 0 100 100"`. The frontend uses CSS mask to apply the chosen color.

**Custom animations** - The admin can provide a CSS keyframes body (the content between `{...}`) as a string in the animation preset. The frontend injects it as `@keyframes custom-{type}` at runtime.

**Additional demographic fields** - New fields of type `text`, `number`, or `boolean` can be added and toggled per deployment. Collected values are stored in `SurveyAdditionalResponse` and included in exports.

**Production hardening** - Deploy behind a reverse proxy (e.g. nginx or Caddy) with HTTPS termination. Set `CORS_ORIGIN` to the production frontend URL. Rotate `JWT_SECRET` to a cryptographically random value. Set a strong `ADMIN_DEFAULT_PASSWORD`.

**Alternative storage backends** - The codebase includes a `ResearchStorageAdapter` interface with stub classes for an external PostgreSQL database and Google Sheets. Both currently throw an error if invoked. To activate either, implement the `storeSubmission` method in the corresponding class in `apps/api/src/lib/storage-adapter.ts` and update the admin storage configuration UI to allow switching modes.

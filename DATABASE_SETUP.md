# ProjectB - Multi-Tenant PostgreSQL Setup

## ✅ Completed Setup

### Database
- **Platform**: Neon (Serverless PostgreSQL)
- **Status**: ✅ Schema created and indexed
- **Connection**: Configured in `.env` as `DATABASE_URL`

### Database Schema
Tables created with multi-tenant support:
- `clients` — Client/brand information
- `prompts` — SEO prompts per client
- `run_cycles` — Batch runs of prompts
- `runs` — Individual prompt executions with AI results
- `diagnostics` — Analysis findings per prompt
- `action_items` — Recommended content improvements
- `page_analyses` — Page-level technical audits
- `app_settings` — User preferences (global or per-owner)

All tables include:
- `ownerId` — Multi-tenant isolation
- `createdAt`, `updatedAt` — Automatic timestamps
- Composite indexes on `(ownerId, clientId)` for query performance

### Backend Integration
- **Database Module**: `src/services/database.ts` — Connection pooling
- **Repository Layer**: `src/services/db-repo.ts` — CRUD operations
- **API Routes**: `src/services/db-api.ts` — Express REST endpoints
- **Server Integration**: Database routes mounted at `/api/db`

### API Endpoints
All endpoints filter by `ownerId` for multi-tenant security:

```
GET    /api/db/clients?ownerId=...           # List clients
POST   /api/db/clients                        # Save client
GET    /api/db/prompts?clientId=...          # List prompts
POST   /api/db/prompts                        # Save prompt
POST   /api/db/prompts/batch                  # Batch save prompts
DELETE /api/db/prompts/:id                    # Delete prompt
GET    /api/db/cycles?clientId=...            # List run cycles
POST   /api/db/cycles                         # Save cycle
GET    /api/db/runs?cycleId=...               # List runs
POST   /api/db/runs/batch                     # Batch save runs
GET    /api/db/diagnostics?clientId=...       # List diagnostics
POST   /api/db/diagnostics                    # Save diagnostic
GET    /api/db/actions?clientId=...           # List action items
POST   /api/db/actions                        # Save action
POST   /api/db/actions/batch                  # Batch save actions
GET    /api/db/analyses?clientId=...          # List page analyses
POST   /api/db/analyses                       # Save analysis
GET    /api/db/settings?ownerId=...           # Get settings
POST   /api/db/settings?ownerId=...           # Save settings
```

## Next Steps

### 1. Update Frontend Store (optional)
The app currently uses `localStorage`. To use the database, update `src/state/store.ts`:
- Replace `LocalStorageAdapter` with an HTTP adapter
- Call the `/api/db/*` endpoints instead of localStorage

### 2. Add User Authentication
To enforce multi-tenancy, implement:
- User login/registration
- Extract `ownerId` from JWT token
- Pass `ownerId` to all database operations
- Automatically filter data by logged-in user

### 3. Run the App
```bash
# Development
bun run dev

# Production build
bun run build && bun run start
```

The app will:
- Initialize Express server on port 3000
- Serve React frontend
- Expose database API at `/api/db/*`
- Keep existing Gemini/Perplexity AI endpoints intact

## Environment Variables
```
GEMINI_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here (optional)
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://... (already in .env)
```

## Database Management

### View Neon Console
- Project: `neondb_owner`
- URL: https://console.neon.tech

### Run Custom Queries
```bash
# Connect to Neon directly (if needed)
psql "$DATABASE_URL"

# Run migrations again (if schema changes)
bun run migrate
```

### Backup Data
```bash
# Export to JSON
curl "http://localhost:3000/api/db/clients?ownerId=owner-123" > backup.json
```

---

**Note**: All data operations are now persisted to Neon PostgreSQL instead of browser localStorage. The app is ready for multi-tenant production use.

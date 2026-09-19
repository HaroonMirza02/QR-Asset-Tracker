# QR Asset Tracker: current project review

Reviewed 7 September 2026 against the local source and running API.

## Login failure and repair

The frontend at localhost:5173 returned HTTP 502 for POST /api/auth/login. Its Vite proxy forwards /api requests to localhost:3000, where no backend was reachable. Starting the backend from backend/ reproduced the fatal error `MongoDB URI not set`.

The root cause is working-directory-dependent dotenv loading: the configured .env is at the repository root, but npm commands in backend/ used to search backend/.env only. Separately, the configured development database contained zero tenants, users, and assets. Thus a prior seed command had not populated the database this configuration uses; the earlier command's output is unavailable, so its exact failure cannot be established.

Changes made:
- Added backend/src/config/environment.js and used it in both server and seed entrypoints. Existing process variables take priority, then backend/.env, then root .env. Startup location no longer changes which files are loaded.
- Added root npm start, npm run dev:backend, and npm run dev:frontend commands.
- Added a useful frontend message for network failures and HTTP 502/503/504.
- Corrected the example QR application URL to the frontend port, 5173.
- Removed database connection strings from successful connection logs.
- Seeded the confirmed empty development database successfully.

## Run locally

Run commands from QR-Asset-Tracker (the inner repository folder).

Terminal 1:
```powershell
npm start
```

Terminal 2:
```powershell
npm run dev:frontend
```

Open http://localhost:5173/login. MongoDB must be available at MONGODB_URI. The backend listens on PORT (currently 3000), while Vite's proxy currently targets port 3000. Keep these aligned if changing ports. Leave VITE_API_BASE_URL unset for this local proxy setup.

For backend auto-reload, install backend dependencies with `npm --prefix backend install`, then use `npm run dev:backend`. The backend dev command needs nodemon, which is not currently installed in backend/node_modules.

Demo accounts:
| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@meridian-ops.example | Admin1234! |
| Viewer | viewer@meridian-ops.example | Viewer1234! |

Seeding has already completed. `npm run seed` resets the meridian-ops demo tenant's users, employees, locations, assets, and history on subsequent runs. It is not a migration command; do not run it to preserve changes to demo records.

## Architecture and request flow

The frontend is React 19 with TypeScript, Vite, React Router, Tailwind CSS, Axios, and Lucide icons. The backend is CommonJS Node.js with Express, Mongoose, Zod validation, bcrypt passwords, JWT authentication, and QR generation. Root and backend package manifests maintain separate dependency declarations.

Browser -> React page -> Axios /api request -> Vite proxy -> Express route -> authentication and role middleware -> Zod validation -> controller -> service -> Mongoose -> MongoDB.

Controllers translate HTTP input/output; services contain business rules; models define storage and indexes. Errors use an error object with code/message/fields, while successful responses use data and, for lists, pagination metadata.

## Login and organization isolation

POST /api/auth/login accepts email/password. The backend lowercases email, finds the account, compares the bcrypt password hash, verifies its organization is active, and issues a signed JWT. The configured default expiry is 86,400 seconds (24 hours).

AuthContext stores the returned user and token in localStorage. Axios attaches the token as a Bearer Authorization header. ProtectedRoute gates dashboard pages. On protected API requests the backend verifies the JWT and checks that the tenant remains active. Tenant IDs for authenticated operations come from the verified token, and queries are scoped to that tenant.

Admin can read and mutate assets. Viewer can read but is rejected by the backend on write routes. Employee contact details are omitted from lists for both roles and exposed in employee detail only to Admin. Public scans require no login and return a restricted profile.

## Data currently seeded

| Collection | Purpose | Seeded count |
| --- | --- | --- |
| Tenants | Organization and active flag | 1 |
| Users | Login identity, password hash, Admin/Viewer role | 2 |
| Employees | Assignment targets, department, title, contact and active status | 8 |
| Locations | Sites, buildings, rooms | 5 |
| Assets | Code, category, serial number, status, assignment, visibility, QR token | 24 |
| AssetHistory | Events recording changes and actor | 57 |

The demo organization is Meridian Operational Services, slug meridian-ops. Categories are Laptop, Vehicle, Tool, Furniture, and Equipment. Statuses are Available, Assigned, In Repair, Lost, and Retired. Three seeded assets are hidden from public scans; one employee is inactive.

## Frontend pages and capabilities

- /login: sign-in form, authentication feedback, and demo credentials.
- /assets: paginated directory with filters/search, responsive cards/table, and Admin actions to create, edit, assign/unassign, and change status.
- /assets/:id: asset detail, history timeline, assignment/status actions, and QR label controls.
- /employees: employee browsing backed by read-only endpoints.
- /locations: location browsing backed by read-only endpoints.
- /scan/:qrToken?t=<tenantId>: public asset profile resolved through the API.
- / redirects authenticated users to /assets; unknown routes show a not-found page.

## Asset lifecycle

Creation generates an asset code if omitted and a random QR token, starts the asset as Available, and records Created history. Metadata editing supports name, category, description, serial number, and public visibility.

Assignment chooses either an employee or location, sets status Assigned, and writes history. It rejects already-assigned assets, inactive employees, and cross-tenant targets. Unassignment clears the target and sets Available. An already-unassigned asset returns successfully without a new unassignment event.

Status changes reject Available while an assignment exists and Assigned without an assignment. Assignment, unassignment, and status changes reject Retired assets. However, metadata editing and QR regeneration currently still permit Retired assets: the code is less restrictive than its broad 'retired assets cannot be modified' comments imply.

History is exposed through a read endpoint; there are no history update/delete endpoints. Asset saves and history inserts are separate operations, not a transaction.

## API surface

| Endpoint | Access and purpose |
| --- | --- |
| POST /api/auth/login | Public login |
| GET /api/assets | Admin/Viewer asset list |
| POST /api/assets | Admin create |
| GET /api/assets/:id | Admin/Viewer detail |
| PATCH /api/assets/:id | Admin metadata edit |
| GET /api/assets/:id/history | Admin/Viewer history |
| POST /api/assets/:id/assign | Admin assign |
| POST /api/assets/:id/unassign | Admin unassign |
| POST /api/assets/:id/status | Admin status change |
| POST /api/assets/:id/qr/regenerate | Admin rotate QR token |
| GET /api/employees and /api/employees/:id | Admin/Viewer read |
| GET /api/locations and /api/locations/:id | Admin/Viewer read |
| GET /api/public/scan/:qrToken?t=<tenantId> | Restricted public profile |

There are no registration, password reset, user management, employee/location write, or asset delete API routes.

## QR behavior

The backend creates 32 random bytes represented by a 64-character hexadecimal token. The scan URL is APP_BASE_URL/scan/<token>?t=<tenantId>. The API checks the tenant is active and the asset is public. Hidden, unknown, or mismatched tokens return 404. The public response exposes asset code, name, category, description, status, and a limited assignment display; it excludes contact details and internal identifiers. Regeneration replaces the stored token, invalidating the previous URL.

APP_BASE_URL is currently http://localhost:5173. For a phone to scan a label, it must be a frontend address reachable from that phone; localhost on a phone refers to the phone itself.

A separate existing frontend issue remains: QrLabelCard's client-generation fallback replaces URLs containing localhost and reconstructs the tenant query from asset.tenantId, which the API intentionally omits. That fallback can produce an empty t parameter. Server-provided QR images bypass this path. This review verified the API scan URL, not every printed/downloaded image path.

## Deployment and current limitations

Root vercel.json builds frontend/dist and routes /api requests to api/index.js. That serverless entrypoint connects to MongoDB and dispatches to the Express app. SPA routes rewrite to index.html. Deployment environment variables must be configured on the host. Separate backend/frontend Vercel configurations also exist; deployed behavior was not tested in this local repair.

Further review findings:
- No refresh-token flow or server-side logout/revocation. Removing localStorage logs out the browser; an issued token remains valid until expiry unless its tenant is disabled.
- Authentication middleware does not reload the user on every request, so deleted users or changed roles are not immediately reflected in existing tokens.
- No login rate limiting is wired into Express.
- No CORS middleware is wired into Express; the local same-origin Vite proxy avoids needing it. A separate frontend API origin needs deliberate configuration.
- Asset code generation counts documents; parallel creations can collide and return conflict.
- Search strings are used as regular expressions, rather than escaped literal text.
- Audit writes are not atomic with asset mutations.
- The frontend displays demo credentials on the login page.

These are existing limitations, not causes of the repaired local login failure.

## Verification performed

Passed:
- Root and backend working directories load identical MongoDB/JWT/port configuration; existing process variables retain priority.
- Seed from backend/ created 1 tenant, 2 users, 8 employees, 5 locations, 24 assets, and 57 history records.
- Admin and Viewer login through localhost:5173 returned HTTP 200.
- Asset, employee, and location lists returned HTTP 200 with correct counts for both roles.
- Public scan via an API-provided QR URL returned HTTP 200.
- Viewer POST to assets returned HTTP 403 before any mutation.
- Incorrect password returned HTTP 401.
- Frontend TypeScript and Vite production build passed.

The existing Jest/Supertest suite was not run: backend development dependencies are absent. Its setup drops the configured test database during teardown, so it must use an isolated test database. Browser clicks, printing, downloads, all mutation flows, and deployment were not fully exercised in this repair.

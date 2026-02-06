# OSS Support Portal

A single-server OSS Support Portal that ships a status board, announcements feed, and admin control panel with a clean, modern UI.

## Features
- Login-protected admin panel for managing services and announcements.
- User dashboard with grouped service status, overall indicator, and announcements feed.
- REST API endpoints for service status and notifications.
- OpenAPI v1 spec viewer in the admin panel.
- SQLite + Prisma for a lightweight, file-based database.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run Prisma migrations (creates `dev.db` locally):
   ```bash
   npx prisma migrate dev
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000`.

## Default admin credentials
- **Username:** `admin`
- **Password:** `Brillar`

On first run, the admin user is seeded automatically if it does not already exist.

## Change the admin password
Use Prisma Studio or update the user record directly:

```bash
npx prisma studio
```

Open the `User` table and update the password hash. For a quick reset, you can also delete the admin user and restart the server to re-seed.

## OpenAPI spec
Open the admin panel and select the **OpenAPI Spec** tab. The spec matches the live endpoints:
- `GET /api/service-status`
- `GET /api/notifications`

## Render one-click deploy
This repo includes a `render.yaml` blueprint. To deploy:

1. Create a new Render Blueprint deployment and point it at this repo.
2. Render provisions a disk at `/data` for the SQLite database.
3. The service uses `npm start` and runs migrations automatically during build.

> **Note:** Render’s filesystem is ephemeral without a disk. The blueprint attaches a disk so your SQLite database persists.

## Mock mode note
Service status is currently updated manually through the admin panel. In future iterations, these entries can be wired to real health checks or automated incident tooling.

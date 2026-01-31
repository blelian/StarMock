# StarMock Backend

Node.js + Express + TypeScript API with JWT auth and Postgres.

## Setup

1. **Create the database** (local Postgres):

   ```bash
   createdb starmock
   ```

   If your Postgres user has a password (or you see "client password must be a string"), use a URL with credentials:  
   `postgresql://USER:PASSWORD@localhost:5432/starmock`

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `PORT` – API port (default `3001`)
   - `DATABASE_URL` – e.g. `postgresql://localhost:5432/starmock` or `postgresql://postgres@localhost:5432/starmock` if no password
   - `JWT_SECRET` – secret for signing JWTs (use a strong value in production)

3. **Run migrations**

   ```bash
   npm run migrate
   ```

4. **Start the server**

   ```bash
   npm run dev
   ```

## API

- `GET /api/health` – health check
- `POST /api/auth/register` – body: `{ email, password, name? }` – returns `{ token, user }`
- `POST /api/auth/login` – body: `{ email, password }` – returns `{ token, user }`
- `GET /api/auth/me` – header: `Authorization: Bearer <token>` – returns `{ user }`

## Frontend

The Vite app in `../app` proxies `/api` to this server when running `npm run dev` (see `app/vite.config.ts`). Set `VITE_API_URL` if the backend runs on a different port.

# Storefront / Project Migrations

Record of database and schema migrations applied to this project.

## Backend (Postgres)

| Date       | Migration File                 | Description                    |
| ---------- | ------------------------------ | ------------------------------ |
| 2025-01-31 | `backend/migrations/001_create_users.sql` | Create `users` table for auth (id, email, password_hash, name, created_at) |

### How to run

From project root:

```bash
cd backend && npm run migrate
```

Requires `DATABASE_URL` in `backend/.env` (e.g. `postgresql://localhost:5432/starmock` or `postgresql://postgres@localhost:5432/starmock` if no password). Ensure the database exists: `createdb starmock` (or equivalent). See `backend/README.md` for full setup.

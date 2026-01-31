import bcrypt from "bcrypt";
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "1h";

export const authRouter = Router();

interface JwtPayload {
  sub: string;
  email: string;
}

export function requireAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as Request & { userId?: string; userEmail?: string }).userId = payload.sub;
    (req as Request & { userId?: string; userEmail?: string }).userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const userName = typeof name === "string" ? name.trim() || null : null;

  try {
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
      [trimmedEmail, password_hash, userName]
    );
    const row = result.rows[0];
    const token = jwt.sign(
      { sub: row.id, email: row.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.status(201).json({
      token,
      user: { id: row.id, email: row.email, name: row.name },
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === "23505") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    "SELECT id, email, password_hash, name FROM users WHERE email = $1",
    [trimmedEmail]
  );

  if (result.rows.length === 0) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  const reqWithUser = req as Request & { userId: string; userEmail: string };
  const result = await pool.query(
    "SELECT id, email, name, created_at FROM users WHERE id = $1",
    [reqWithUser.userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const row = result.rows[0];
  res.json({ user: { id: row.id, email: row.email, name: row.name, created_at: row.created_at } });
});
